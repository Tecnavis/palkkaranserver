const OrderProduct = require("../models/orderdetails");
const Product = require("../models/product");
const Plan = require("../models/plans");
const Customer = require("../models/customer");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");

require('dotenv').config(); 

// Create an order
exports.createOrder = async (req, res) => {
    try {
        const { customerId, productItems, planId, paymentMethod, newAddress } = req.body;

        // Validate customer
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        // Determine the address to use
        let orderAddress = newAddress || (customer.address.length > 0 ? customer.address[0] : null);
        if (!orderAddress) {
            return res.status(400).json({ error: "No address available for this customer" });
        }

        // Validate productItems
        if (!productItems || productItems.length === 0) {
            return res.status(400).json({ error: "Product items cannot be empty" });
        }

        // Create validated product items with route prices
        const validatedProductItems = await Promise.all(
            productItems.map(async (item) => {
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`Product not found: ${item.productId}`);
                }
                return {
                    product: item.productId,
                    quantity: item.quantity,
                    routePrice: item.routePrice // Use the route price from the request
                };
            })
        );

        // Calculate total price from route prices
        const totalRoutePrice = validatedProductItems.reduce(
            (sum, item) => sum + (item.routePrice * item.quantity),
            0
        );

        // Validate plan (optional)
        let selectedPlanDetails = null;
        if (planId) {
            const plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({ error: "Plan not found" });
            }
            selectedPlanDetails = {
                planType: plan.planType,
                dates: plan.dates.map(date => ({ date, status: "pending" })),
                isActive: plan.isActive,
            };
        }

        // Create the order
        const newOrder = new OrderProduct({
            customer: customerId,
            productItems: validatedProductItems,
            plan: planId || null,
            selectedPlanDetails,
            totalPrice: totalRoutePrice,
            paymentMethod,
            paymentStatus: "unpaid",
            address: orderAddress,
            paidamount: 0,
            Total: 0
        });

        await newOrder.save();

        res.status(201).json({
            message: "Order created successfully",
            order: newOrder,
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};


exports.updateDateStatus = async (req, res) => {
    try {
        const { orderId } = req.params; // Get orderId from URL params
        const { date, status } = req.body; // Get date and status from the request body

        // Find the order by ID
        const order = await OrderProduct.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Find the specific date in the dates array
        const dateToUpdate = order.selectedPlanDetails.dates.find(
            (d) => new Date(d.date).toISOString() === new Date(date).toISOString()
        );

        if (!dateToUpdate) {
            return res.status(404).json({ error: "Date not found in order" });
        }

        // Update the status of the found date
        dateToUpdate.status = status;

        // Save the updated order
        await order.save();

        // Respond with the updated order object
        res.status(200).json({
            message: "Date status updated successfully",
            order: {
                selectedPlanDetails: {
                    planType: order.selectedPlanDetails.planType,
                    dates: order.selectedPlanDetails.dates,
                    isActive: order.selectedPlanDetails.isActive,
                },
                _id: order._id,
                customer: order.customer,
                cartItems: order.cartItems,
                plan: order.plan,
            },
        });
    } catch (error) {
        console.error("Error updating date status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


exports.getAllOrders = async (req, res) => {
    try {
        const orders = await OrderProduct.find()
            .populate("customer", "name email phone address routeno customerId") // Populate customer details
            .populate({
                path: "productItems.product", // Populate product details for each product item
                select: "name price description productId title category coverimage quantity", // Select specific fields from the Product model
            })
            .populate("plan", "planType"); // Optionally populate plan details

        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getMostOrderedProducts = async (req, res) => {
    try {
      const mostOrderedProducts = await OrderProduct.aggregate([
        { $unwind: "$productItems" }, // Unwind productItems array
        { 
          $group: {
            _id: "$productItems.product", // Group by product ID
            totalQuantity: { $sum: "$productItems.quantity" }, // Sum total quantity
            routePrice: { $first: "$routeprice" } // Get route price from OrderProduct
          },
        },
        { $sort: { totalQuantity: -1 } }, // Sort by total quantity (descending)
        { $limit: 6 }, // Get top 6 most ordered products
        { 
          $lookup: {
            from: "products", // Join with Product collection
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" }, // Flatten the product data
        { 
          $project: {
            _id: "$product._id",
            title: "$product.title",
            productId: "$product.productId",
            description: "$product.description",
            category: "$product.category",
            coverimage: "$product.coverimage",
            images: "$product.images",
            price: "$product.price",
            discount: "$product.discount",
            quantity: "$product.quantity",
            createdAt: "$product.createdAt",
            updatedAt: "$product.updatedAt",
            totalQuantity: 1, // Include total quantity
            routePrice: 1 // Include route price
          },
        },
      ]);
  
      res.status(200).json(mostOrderedProducts);
    } catch (error) {
      console.error("Error fetching most ordered products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  

exports.getOrdersByCustomerId = async (req, res) => {
    try {
        const { customerId } = req.params; // Get customer ID from request parameters

        // Find orders for the given customer ID
        const orders = await OrderProduct.find({ customer: customerId })
            .populate("customer", "name email phoneNumber") // Populate customer details
            .populate({
                path: "productItems.product", // Populate product details for each product item
                select: "name price description", // Select specific fields from the Product model
            })
            .populate("plan", "planType").populate("selectedPlanDetails", "planType isActive dates status"); // Optionally populate plan details

        if (!orders.length) {
            return res.status(404).json({ message: "No orders found for this customer" });
        }

        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching orders by customer ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

  //delete order by orderId
  exports.delete = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if the order exists
        const order = await OrderProduct.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if the order has an associated plan and delete it
        if (order.plan) {
            await Plan.findByIdAndDelete(order.plan);
        }

        // Delete the order
        await OrderProduct.findByIdAndDelete(id);

        res.status(200).json({ message: "Order and associated plan deleted successfully" });
    } catch (error) {
        console.error("Error deleting order and plan:", error);
        res.status(500).json({ message: "Failed to delete the order", error: error.message });
    }
};






  // Get selected plan details by customer ID
// exports.getSelectedPlanByCustomer =  asyncHandler(async (req, res) => {
//     const { customerId } = req.params;

//     try {
//         const orders = await OrderProduct.find(
//             { customer: customerId },
//             "selectedPlanDetails"
//         );

//         if (!orders || orders.length === 0) {
//             return res.status(404).json({ message: "No plan details found for this customer" });
//         }

//         res.status(200).json(orders);
//     } catch (error) {
//         res.status(500).json({ message: "Error fetching selected plan details", error: error.message });
//     }
// });

exports.getSelectedPlanByCustomer = asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    try {
        const orders = await OrderProduct.find(
            { customer: customerId },
            "selectedPlanDetails plan"
        ).populate({
            path: "plan",
            select: "-__v -dates", // Exclude `__v` field
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "No plan details found for this customer" });
        }

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching selected plan details", error: error.message });
    }
});

// Get product items by customer ID
exports.getProductItemsByCustomer = asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    try {
        const orders = await OrderProduct.find({ customer: customerId })
            .populate("productItems.product", "name price category routerPrice coverimage images title description quantity").populate("customer", "name email phone customerId").populate("selectedPlanDetails", "planType isActive dates status").populate("plan", "planType leaves ")// Populate product details
            .select("productItems quantity  totalPrice paymentMethod paymentStatus address Total paidamount");

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "No product items found for this customer" });
        }

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching product items", error: error.message });
    }
});




exports.stopPlan = async (req, res) => {
    const { orderId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensure only date comparison

    try {
        const order = await OrderProduct.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if the plan is already inactive
        if (!order.planisActive) {
            return res.status(400).json({ message: "Plan is already stopped" });
        }

        // Mark plan as inactive
        order.planisActive = false;
        order.selectedPlanDetails.isActive = false;

        // Filter dates to show only from start to today
        order.selectedPlanDetails.dates = order.selectedPlanDetails.dates.filter(dateObj => 
            new Date(dateObj.date) <= today
        );

        await order.save();

        res.status(200).json({ message: "Plan stopped successfully", order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};


const mongoose = require("mongoose");

exports.changePlan = async (req, res) => {
    const { orderId, newPlanType, customDates, weeklyDays, interval, startDate } = req.body;

    try {
        const order = await OrderProduct.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Retain only previous dates before the change
        const previousDates = order.selectedPlanDetails.dates
            .filter(d => new Date(d.date) < new Date())
            .map(d => ({
                date: new Date(d.date).setUTCHours(0, 0, 0, 0), // Normalize date
                status: d.status,
            }));

        let newDates = [];
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Normalize today

        switch (newPlanType) {
            case "daily":
            case "monthly":
                newDates = Array.from({ length: 30 }, (_, i) => {
                    let date = new Date();
                    date.setDate(today.getDate() + i);
                    date.setUTCHours(0, 0, 0, 0); // Normalize
                    return date;
                });
                break;

            case "custom":
                if (!customDates || !Array.isArray(customDates)) {
                    return res.status(400).json({ message: "Invalid custom dates" });
                }
                newDates = customDates.map(date => {
                    let d = new Date(date);
                    d.setUTCHours(0, 0, 0, 0); // Normalize
                    return d;
                });
                break;

            case "weekly":
                if (!weeklyDays || !Array.isArray(weeklyDays)) {
                    return res.status(400).json({ message: "Invalid weekly days" });
                }
                newDates = weeklyDays.map(day => {
                    const offset = (day - today.getDay() + 7) % 7;
                    let nextDay = new Date();
                    nextDay.setDate(today.getDate() + offset);
                    nextDay.setUTCHours(0, 0, 0, 0); // Normalize
                    return nextDay;
                });
                break;

            case "alternative":
                if (!startDate || !interval || typeof interval !== "number") {
                    return res.status(400).json({ message: "Invalid alternative plan details" });
                }
                const altStartDate = new Date(startDate);
                altStartDate.setUTCHours(0, 0, 0, 0);
                newDates = Array.from({ length: 15 }, (_, i) => {
                    let nextDate = new Date(altStartDate);
                    nextDate.setDate(altStartDate.getDate() + i * interval);
                    nextDate.setUTCHours(0, 0, 0, 0); // Normalize
                    return nextDate;
                });
                break;

            default:
                return res.status(400).json({ message: "Invalid plan type" });
        }

        // Remove duplicate dates
        const uniqueDates = new Map();
        
        // Add previous dates to the map
        previousDates.forEach(({ date, status }) => {
            uniqueDates.set(date, { date: new Date(date), status });
        });

        // Add new dates to the map if not already present
        newDates.forEach(date => {
            if (!uniqueDates.has(date.getTime())) {
                uniqueDates.set(date.getTime(), { date, status: "pending" });
            }
        });

        // Convert map back to an array
        order.selectedPlanDetails.planType = newPlanType;
        order.selectedPlanDetails.dates = Array.from(uniqueDates.values());
        order.selectedPlanDetails.isActive = true;

        await order.save();
        res.status(200).json({ message: "Plan updated successfully", order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};




exports.sendInvoiceEmail = async (req, res) => {
  try {
    const { email, invoiceHtml } = req.body;

    if (!email || !invoiceHtml) {
      return res.status(400).json({ message: "Email and invoice data are required" });
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL, // Your email
        pass: process.env.PASSWORD, // Your email password or app password
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Your Invoice from Palkkaran",
      html: invoiceHtml,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Invoice sent successfully" });
  } catch (error) {
    console.error("Error sending invoice:", error);
    res.status(500).json({ message: "Failed to send invoice", error });
  }
};

exports. getOrdersByRoute = async (req, res) => {
    try {
        const { routeNo } = req.params;

        // Find customers with the given route number
        const customers = await Customer.find({ routeno: routeNo }).select("_id");

        // Extract customer IDs
        const customerIds = customers.map(customer => customer._id);

        if (customerIds.length === 0) {
            return res.status(404).json({ message: "No orders found for this route" });
        }

        // Find orders where the customer is in the list of found customer IDs
        const orders = await OrderProduct.find({ customer: { $in: customerIds } })
            .populate("customer", "name email phone routeno image customerId")
            .populate("productItems.product", "title productId category price");

          // Ensure customer image is set to null if not available
          const modifiedOrders = orders.map(order => ({
            ...order._doc,
            customer: {
                ...order.customer._doc,
                image: order.customer.image || null
            }
        }));

        res.status(200).json(modifiedOrders);
    } catch (error) {
        console.error("Error fetching orders by route:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//tomorrow orders

exports. getTomorrowOrders = async (req, res) => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateStr = tomorrow.toISOString().split("T")[0]; // Format YYYY-MM-DD

        // Fetch orders where selectedPlanDetails includes tomorrow's date
        const orders = await OrderProduct.find({
            "selectedPlanDetails.dates.date": {
                $gte: new Date(tomorrowDateStr),
                $lt: new Date(`${tomorrowDateStr}T23:59:59.999Z`)
            }
        }).populate("customer").populate("productItems.product");

        // Group orders by route number
        const routeData = {};

        orders.forEach(order => {
            const routeNo = order.customer?.routeno || "Unassigned";

            if (!routeData[routeNo]) {
                routeData[routeNo] = {
                    quantities: {},
                    totalLiters: 0
                };
            }

            order.productItems.forEach(item => {
                const productSize = item.product?.quantity; // e.g., "100ML"
                const quantity = item.quantity;

                if (productSize) {
                    // Count quantities per route
                    routeData[routeNo].quantities[productSize] =
                        (routeData[routeNo].quantities[productSize] || 0) + quantity;

                    // Convert to Liters
                    const sizeInML = parseInt(productSize.match(/\d+/)[0], 10);
                    const totalML = sizeInML * quantity;
                    routeData[routeNo].totalLiters += totalML / 1000; // Convert ML to Liters
                }
            });
        });

        res.json({ success: true, data: routeData });
    } catch (error) {
        console.error("Error fetching tomorrow's orders:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

//today orders
exports. getTodayOrders = async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD

        // Fetch orders where selectedPlanDetails includes today's date
        const orders = await OrderProduct.find({
            "selectedPlanDetails.dates.date": {
                $gte: new Date(today),
                $lt: new Date(`${today}T23:59:59.999Z`)
            }
        }).populate("customer").populate("productItems.product");

        // Group orders by route number
        const routeData = {};

        orders.forEach(order => {
            const routeNo = order.customer?.routeno || "Unassigned";

            if (!routeData[routeNo]) {
                routeData[routeNo] = {
                    quantities: {},
                    totalLiters: 0
                };
            }

            order.productItems.forEach(item => {
                const productSize = item.product?.quantity; // e.g., "100ML"
                const quantity = item.quantity;

                if (productSize) {
                    // Count quantities per route
                    routeData[routeNo].quantities[productSize] =
                        (routeData[routeNo].quantities[productSize] || 0) + quantity;

                    // Convert to Liters
                    const sizeInML = parseInt(productSize.match(/\d+/)[0], 10);
                    const totalML = sizeInML * quantity;
                    routeData[routeNo].totalLiters += totalML / 1000; // Convert ML to Liters
                }
            });
        });

        res.json({ success: true, data: routeData });
    } catch (error) {
        console.error("Error fetching today's orders:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
//
// Get filtered invoices
exports.getCustomerInvoices = async (req, res) => {
    try {
        const { customerId } = req.params;

        // Fetch orders for the given customer
        const orders = await OrderProduct.find({ customer: customerId })
            .populate("customer", "name email phone customerId paidAmounts")
            .populate("productItems.product", "category")
            .lean();

        if (!orders.length) {
            return res.status(404).json({ message: "No invoices found for this customer" });
        }

        const formattedResponse = orders.map(order => {
            let totalAmount = 0;

            const orderItems = order.selectedPlanDetails?.dates
                .filter(dateItem => dateItem.status === "delivered")
                .map((dateItem, index) => ({
                    no: index + 1,
                    date: dateItem.date,
                    status: dateItem.status,
                    products: order.productItems.map(item => {
                        const subtotal = item.quantity * item.routePrice;
                        totalAmount += subtotal; // Accumulate the total amount
                        return {
                            product: item.product?.category || "N/A",
                            quantity: item.quantity,
                            routePrice: item.routePrice,
                            subtotal: subtotal,
                        };
                    }),
                }));

            return {
                customer: order.customer,
                invoiceDetails: {
                    invoiceNo: order._id,
                    paymentType: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                },
                orderItems: orderItems,
                total: totalAmount, // Corrected total amount
                paidAmount: 0, // Default paid amount
            };
        });

        res.json(formattedResponse);
    } catch (error) {
        console.error("Error fetching invoice details:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Example Endpoints
// Daily Plan: { "orderId": "ORDER_ID", "newPlanType": "daily" }
// Custom Plan: { "orderId": "ORDER_ID", "newPlanType": "custom", "customDates": ["2025-02-08", "2025-02-09"] }
// Weekly Plan: { "orderId": "ORDER_ID", "newPlanType": "weekly", "weeklyDays": [1, 3, 5] }
// Alternative Plan: { "orderId": "ORDER_ID", "newPlanType": "alternative", "startDate": "2025-02-06", "interval": 2 }
// Monthly Plan: { "orderId": "ORDER_ID", "newPlanType": "monthly" }