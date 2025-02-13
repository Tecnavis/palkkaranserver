const OrderProduct = require("../models/orderdetails");
const Product = require("../models/product");
const Plan = require("../models/plans");
const Customer = require("../models/customer");
const asyncHandler = require("express-async-handler");
// Create an order
exports.createOrder = async (req, res) => {
    try {
        const { customerId, productItems, planId, paymentMethod, newAddress,routeprice } = req.body;

        // Validate customer
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }
        //route price
        if(!routeprice){
            return res.status(400).json({ error: "Route price not found" });
        }

        // Determine the address to use
        let orderAddress = null;
        if (newAddress) {
            // If a new address is provided, use it
            orderAddress = newAddress;
        } else if (customer.address.length > 0) {
            // Use the first address from the customer's saved addresses as the default
            orderAddress = customer.address[0];
        } else {
            return res.status(400).json({ error: "No address available for this customer" });
        }

        // Validate productItems
        if (!productItems || productItems.length === 0) {
            return res.status(400).json({ error: "Product items cannot be empty" });
        }

        // Validate and fetch product details
        const validatedProductItems = [];
        for (const item of productItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ error: `Product not found: ${item.productId}` });
            }

            validatedProductItems.push({
                product: product._id,
                quantity: item.quantity,
                name: product.name,
                price: product.price,
                lineTotal: product.price * item.quantity,
            });
        }

        // Validate plan (optional)
        let selectedPlanDetails = null;
        if (planId) {
            const plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({ error: "Plan not found" });
            }

            const datesWithStatus = plan.dates.map((date) => ({
                date,
                status: "pending",
            }));

            selectedPlanDetails = {
                planType: plan.planType,
                dates: datesWithStatus,
                isActive: plan.isActive,
            };
        }

        // Calculate total price
        const totalPrice = validatedProductItems.reduce((sum, item) => sum + item.lineTotal, 0);

        // Create the order
        const newOrder = new OrderProduct({
            customer: customerId,
            routeprice,
            productItems: validatedProductItems.map((item) => ({
                product: item.product,
                quantity: item.quantity,
            })),
            plan: planId || null,
            selectedPlanDetails,
            totalPrice,
            paymentMethod,
            paymentStatus: "unpaid",
            address: orderAddress, // Include the selected or new address in the order
        });

        await newOrder.save();

        // Respond with success
        res.status(201).json({
            message: "Order created successfully",
            order: {
                ...newOrder.toObject(),
                productItems: validatedProductItems, // Return detailed product items
            },
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Internal server error" });
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
      // Aggregation pipeline to get the most ordered products
      const mostOrderedProducts = await OrderProduct.aggregate([
        { $unwind: "$productItems" }, // Unwind productItems array
        { $group: {
            _id: "$productItems.product", // Group by product ID
            totalQuantity: { $sum: "$productItems.quantity" }, // Sum the quantity for each product
          },
        },
        { $sort: { totalQuantity: -1 } }, // Sort by total quantity in descending order
        { $limit: 6 }, // Limit to the top 6 most ordered products
        { $lookup: {
            from: "products", // Join with the Product collection
            localField: "_id",
            foreignField: "_id",
            as: "product", // Alias for joined product data
          },
        },
        { $unwind: "$product" }, // Unwind the product data to simplify the result
        { $project: {
            product: 1, // Include the product data
            totalQuantity: 1, // Include the total quantity
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
            .populate("plan", "planType"); // Optionally populate plan details

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
  
      // Delete the order
      await OrderProduct.findByIdAndDelete(id);
  
      res.status(200).json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Failed to delete the order", error: error.message });
    }
  };





  // Get selected plan details by customer ID
exports.getSelectedPlanByCustomer =  asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    try {
        const orders = await OrderProduct.find(
            { customer: customerId },
            "selectedPlanDetails"
        );

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
        const orders = await OrderProduct.find(
            { customer: customerId },
            "productItems"
        ).populate("productItems.product", "name price"); // Populating product details

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


// Example Endpoints
// Daily Plan: { "orderId": "ORDER_ID", "newPlanType": "daily" }
// Custom Plan: { "orderId": "ORDER_ID", "newPlanType": "custom", "customDates": ["2025-02-08", "2025-02-09"] }
// Weekly Plan: { "orderId": "ORDER_ID", "newPlanType": "weekly", "weeklyDays": [1, 3, 5] }
// Alternative Plan: { "orderId": "ORDER_ID", "newPlanType": "alternative", "startDate": "2025-02-06", "interval": 2 }
// Monthly Plan: { "orderId": "ORDER_ID", "newPlanType": "monthly" }