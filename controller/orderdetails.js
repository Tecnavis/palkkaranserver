const OrderProduct = require("../models/orderdetails");
const Product = require("../models/product");
const Plan = require("../models/plans");
const Customer = require("../models/customer");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
const messaging = require("../config/firebaseconfig"); // Import Firebase Config
const User = require("../models/customer");
const mongoose = require("mongoose");
require("dotenv").config();
const admin = require("firebase-admin");
const AdminsModel = require("../models/admins");
const Notification = require("../models/notification");
// const moment = require("moment-timezone");
const { addDays, isSameDay } = require("date-fns");
const customer = require("../models/customer");



// Create an order
exports.createOrder = async (req, res) => {
  try {
    const { customerId, productItems, planId, paymentMethod, newAddress } =
      req.body;

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Determine the address to use
    let orderAddress =
      newAddress || (customer.address.length > 0 ? customer.address[0] : null);
    if (!orderAddress) {
      return res
        .status(400)
        .json({ error: "No address available for this customer" });
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
          routePrice: item.routePrice, // Use the route price from the request
        };
      })
    );

    // Calculate total price from route prices
    const totalRoutePrice = validatedProductItems.reduce(
      (sum, item) => sum + item.routePrice * item.quantity,
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
        dates: plan.dates.map((date) => ({ date, status: "pending" })),
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
      Total: 0,
    });

    await newOrder.save();

     // notification

     const deliveryBoy = await AdminsModel.findOne({
      route: customer?.routeno,
    });

      const messageCustomer = `🛒 Plan created`;

    const notificationCustomer = new Notification({
      customerId: customer._id,
      messageCustomer,
    });
    await notificationCustomer.save();


    const message = `🛒 ${customer.name} (Route ${customer?.routeno}) plan created`;

    const notification = new Notification({
      deliveryboyId: deliveryBoy._id,
      message,
    });
    await notification.save();

    res.status(201).json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

exports.updateDateStatusToPending = async (req, res) => {
  try {
    const { orderId } = req.params; // Get orderId from URL params
    const { date } = req.body; // Get date and status from the request body

    // Find the order by ID
    const order = await OrderProduct.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Convert provided date to YYYY-MM-DD format
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // Find the specific date in the dates array, ignoring time
    const dateToUpdate = order.selectedPlanDetails.dates.find(
      (d) => new Date(d.date).toISOString().split("T")[0] === formattedDate
    );

    if (!dateToUpdate) {
      return res.status(404).json({ error: "Date not found in order" });
    }

    // Update the status of the found date
    dateToUpdate.status = "pending";

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

////Route to update date and staus to cancel

exports.updateDateStatusToCancel = async (req, res) => {
  try {
    const { orderId } = req.params; // Get orderId from URL params
    const { date } = req.body; // Get date from request body

    // Find the order by ID
    const order = await OrderProduct.findById(orderId).populate("customer"); // Ensure customer details are populated
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Convert provided date to YYYY-MM-DD format
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // Find the specific date in the dates array
    const dateToUpdate = order.selectedPlanDetails.dates.find(
      (d) => new Date(d.date).toISOString().split("T")[0] === formattedDate
    );

    if (!dateToUpdate) {
      return res.status(404).json({ error: "Date not found in order" });
    }

    // Update the status of the found date
    dateToUpdate.status = "cancel";

    // Save the updated order
    await order.save();

    // Send push notification if customer has an FCM token
    if (order.customer && order.customer.fcmToken) {
      const message = {
        token: order.customer.fcmToken,
        notification: {
          title: "Order Cancelled",
          body: "Your order has been cancelled successfully.",
        },
      };

      // Send notification using Firebase Admin SDK
      admin
        .messaging()
        .send(message)
        .then(() => {
          console.log("Push notification sent successfully");
        })
        .catch((error) => {
          console.error("Error sending push notification:", error);
        });
    }

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
      .populate(
        "customer",
        "name email phone address routeno customerId customerindex paidAmounts"
      ) // Populate customer details
      .populate({
        path: "productItems.product", // Populate product details for each product item
        select:
          "name price description productId title category coverimage quantity", // Select specific fields from the Product model
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
          routePrice: { $first: "$routeprice" }, // Get route price from OrderProduct
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
          routePrice: 1, // Include route price
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
        select: "name price description category coverimage title quantity", // Select specific fields from the Product model
      })
      .populate("plan", "planType")
      .populate("selectedPlanDetails", "planType isActive dates status"); // Optionally populate plan details

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for this customer" });
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
    const order = await OrderProduct.findById(id).populate("customer");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order has an associated plan and delete it
    if (order.plan) {
      await Plan.findByIdAndDelete(order.plan);
    }

    // Delete the order
    await OrderProduct.findByIdAndDelete(id);

    // notification

    const deliveryBoy = await AdminsModel.findOne({
      route: order?.customer?.routeno,
    });

   

     const messageCustomer = `🛒 Plan deleted`;

    const notificationCustomer = new Notification({
       customerId: order?.customer?._id,
      messageCustomer,
    });
    await notificationCustomer.save();

    const message = `🛒 ${order?.customer?.name} (Route ${order?.customer?.routeno}) plan deleted`;

    const notification = new Notification({
      deliveryboyId: deliveryBoy._id,
      message,
    });
    await notification.save();

    res
      .status(200)
      .json({ message: "Order and associated plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting order and plan:", error);
    res
      .status(500)
      .json({ message: "Failed to delete the order", error: error.message });
  }
};

exports.getSelectedPlanByCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  try {
    const orders = await OrderProduct.find(
      { customer: customerId },
      "selectedPlanDetails plan"
    )
      .populate({
        path: "plan",
        select: "-__v -dates", // Exclude `__v` field
      })
      .populate({
        path: "productItems.product", // Populate product details for each product item
        select:
          "price title quantity description category routerPrice coverimage productId images", // Select specific fields from the Product model
      });

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No plan details found for this customer" });
    }

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching selected plan details",
      error: error.message,
    });
  }
});

// Get product items by customer ID
exports.getProductItemsByCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  try {
    const orders = await OrderProduct.find({ customer: customerId })
      .populate(
        "productItems.product",
        "name price category routerPrice coverimage images title description quantity"
      )
      .populate("customer", "name email phone customerId paidAmounts")
      .populate("selectedPlanDetails", "planType isActive dates status")
      .populate("plan", "planType leaves ") // Populate product details
      .select("productItems quantity totalPrice address");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No product items found for this customer" });
    }

    res.status(200).json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product items", error: error.message });
  }
});

exports.stopPlan = async (req, res) => {
  const { orderId } = req.params;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Ensure only date comparison

  try {
    const order = await OrderProduct.findById(orderId).populate("customer");

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
    order.selectedPlanDetails.dates = order.selectedPlanDetails.dates.filter(
      (dateObj) => new Date(dateObj.date) <= today
    );

    await order.save();

    // notification

    const deliveryBoy = await AdminsModel.findOne({
      route: order?.customer?.routeno,
    });

     const messageCustomer = `🛒 Plan stoped`;

    const notificationCustomer = new Notification({
      customerId:  order?.customer?._id,
      messageCustomer,
    });
    await notificationCustomer.save();

    const message = `🛒 ${order?.customer?.name} (Route ${order?.customer?.routeno}) plan stoped`;

    const notification = new Notification({
      deliveryboyId: deliveryBoy._id,
      message,
    });
    await notification.save();

    res.status(200).json({ message: "Plan stopped successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.sendInvoiceEmail = async (req, res) => {
  try {
    const { email, invoiceHtml } = req.body;

    if (!email || !invoiceHtml) {
      return res
        .status(400)
        .json({ message: "Email and invoice data are required" });
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

exports.getOrdersByRoute = async (req, res) => {
  try {
    const { routeNo } = req.params;

    // Find customers with the given route number
    const customers = await Customer.find({ routeno: routeNo }).select("_id");

    // Extract customer IDs
    const customerIds = customers.map((customer) => customer._id);

    if (customerIds.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this route" });
    }

    // Find orders where the customer is in the list of found customer IDs
    const orders = await OrderProduct.find({ customer: { $in: customerIds } })
      .populate(
        "customer",
        "name email phone routeno image customerId customerindex"
      )
      .populate("productItems.product", "title productId category price");

    // Ensure customer image is set to null if not available
    const modifiedOrders = orders.map((order) => ({
      ...order._doc,
      customer: {
        ...order.customer._doc,
        image: order.customer.image || null,
      },
    }));

    res.status(200).json(modifiedOrders);
  } catch (error) {
    console.error("Error fetching orders by route:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// exports.getTomorrowOrders = async (req, res) => {
//   try {
//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     const tomorrowDateStr = tomorrow.toISOString().split("T")[0]; // Format YYYY-MM-DD

//     // Fetch orders where selectedPlanDetails includes tomorrow's date but excludes "leave" or "cancel" status
//     const orders = await OrderProduct.find({
//       "selectedPlanDetails.dates": {
//         $elemMatch: {
//           date: {
//             $gte: new Date(tomorrowDateStr),
//             $lt: new Date(`${tomorrowDateStr}T23:59:59.999Z`),
//           },
//           status: { $nin: ["leave", "cancel"] }, // Exclude orders with leave or cancel status
//         },
//       },
//     })
//       .populate("customer")
//       .populate({
//         path: "productItems.product",
//         populate: { path: "category" }, // Ensure category is populated
//       });

//     // Group orders by route number
//     const routeData = {};

//     orders.forEach((order) => {
//       const routeNo = order.customer?.routeno || "Unassigned";

//       if (!routeData[routeNo]) {
//         routeData[routeNo] = {};
//       }

//       order.productItems.forEach((item) => {
//         const product = item.product;
//         const productSize = product?.quantity; // e.g., "100ML"
//         const category = product?.category || "Uncategorized"; // Ensure category name exists
//         const quantity = item.quantity;

//         if (productSize) {
//           // Initialize category if not exists
//           if (!routeData[routeNo][category]) {
//             routeData[routeNo][category] = {
//               quantities: {},
//               totalLiters: 0,
//             };
//           }

//           // Count quantities per category
//           routeData[routeNo][category].quantities[productSize] =
//             (routeData[routeNo][category].quantities[productSize] || 0) +
//             quantity;

//           // Convert to Liters
//           const sizeInML = parseInt(productSize.match(/\d+/)[0], 10);
//           const totalML = sizeInML * quantity;
//           routeData[routeNo][category].totalLiters += totalML / 1000; // Convert ML to Liters
//         }
//       });
//     });

//     res.json({ success: true, data: routeData });
//   } catch (error) {
//     console.error("Error fetching tomorrow's orders:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

//tomorrow orders
exports.getTomorrowOrders = async (req, res) => {
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
        })
        .populate("customer")
        .populate({
            path: "productItems.product",
            populate: { path: "category" } // Ensure category is populated
        });

        // Group orders by route number
        const routeData = {};

        orders.forEach(order => {
            const routeNo = order.customer?.routeno || "Unassigned";

            if (!routeData[routeNo]) {
                routeData[routeNo] = {};
            }

            order.productItems.forEach(item => {
                const product = item.product;
                const productSize = product?.quantity; // e.g., "100ML"
                const category = product?.category || "Uncategorized"; // Ensure category name exists
                const quantity = item.quantity;

                if (productSize) {
                    // Initialize category if not exists
                    if (!routeData[routeNo][category]) {
                        routeData[routeNo][category] = {
                            quantities: {},
                            totalLiters: 0
                        };
                    }

                    // Count quantities per category
                    routeData[routeNo][category].quantities[productSize] =
                        (routeData[routeNo][category].quantities[productSize] || 0) + quantity;

                    // Convert to Liters
                    const sizeInML = parseInt(productSize.match(/\d+/)[0], 10);
                    const totalML = sizeInML * quantity;
                    routeData[routeNo][category].totalLiters += totalML / 1000; // Convert ML to Liters
                }
            });
        });

        res.json({ success: true, data: routeData });
    } catch (error) {
        console.error("Error fetching tomorrow's orders:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getTodayOrders = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD

    // Fetch orders where selectedPlanDetails includes today's date but exclude 'leave' and 'cancel' statuses
    const orders = await OrderProduct.find({
      "selectedPlanDetails.dates": {
        $elemMatch: {
          date: {
            $gte: new Date(today),
            $lt: new Date(`${today}T23:59:59.999Z`),
          },
          status: { $nin: ["leave", "cancel"] }, // Exclude orders with status 'leave' or 'cancel'
        },
      },
    })
      .populate("customer")
      .populate({
        path: "productItems.product",
        populate: { path: "category" }, // Ensure category is populated
      });

  //   const orders = await OrderProduct.find()
  //   .populate("customer")
  //   .populate({
  //     path: "productItems.product",
  //     populate: { path: "category" },
  //   });
  
  // const today = new Date();
  // today.setHours(0, 0, 0, 0);
  
  // const tomorrow = new Date(today);
  // tomorrow.setDate(today.getDate() + 1);
  
  // // Filter manually for today's orders that are not 'leave' or 'cancel'
  // const todayOrders = orders.filter(order => {
  //   if (!order.selectedPlanDetails || !Array.isArray(order.selectedPlanDetails.dates)) return false;
  
  //   return order.selectedPlanDetails.dates.some(dateObj => {
  //     const date = new Date(dateObj.date);
  //     return (
  //       date >= today &&
  //       date < tomorrow &&
  //       !["leave", "cancel"].includes(dateObj.status)
  //     );
  //   });
  // });
  
  // // console.log(todayOrders);
  
    // Group orders by route number
    const routeData = {};

    orders.forEach((order) => {
      const routeNo = order.customer?.routeno || "Unassigned";

      if (!routeData[routeNo]) {
        routeData[routeNo] = {};
      }

      order.productItems.forEach((item) => {
        const product = item.product;
        const productSize = product?.quantity; // e.g., "100ML"
        const category = product?.category || "Uncategorized"; // Ensure category name exists
        const quantity = item.quantity;

        if (productSize) {
          // Initialize category if not exists
          if (!routeData[routeNo][category]) {
            routeData[routeNo][category] = {
              quantities: {},
              totalLiters: 0,
            };
          }

          // Count quantities per category
          routeData[routeNo][category].quantities[productSize] =
            (routeData[routeNo][category].quantities[productSize] || 0) +
            quantity;

          // Convert to Liters
          const sizeInML = parseInt(productSize.match(/\d+/)[0], 10);
          const totalML = sizeInML * quantity;
          routeData[routeNo][category].totalLiters += totalML / 1000; // Convert ML to Liters
        }
      });
    });

    res.json({ success: true, data: routeData });
  } catch (error) {
    console.error("Error fetching today's orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// exports.getTomorrowOrders = async (req, res) => {
//   try {
//     // Convert local timezone to UTC range for tomorrow
//     const now = new Date();
    
//     const startOfTomorrow = new Date(
//       Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
//     );
//     const endOfTomorrow = new Date(
//       Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)
//     );

//     const orders = await OrderProduct.find({
//       "selectedPlanDetails.dates": {
//         $elemMatch: {
//           date: {
//             $gte: startOfTomorrow,
//             $lt: endOfTomorrow,
//           },
//           status: { $nin: ["leave", "cancel"] },
//         },
//       },
//     })
//       .populate("customer")
//       .populate({
//         path: "productItems.product",
//         populate: { path: "category" },
//       });


//     const routeData = {};

//     orders.forEach((order) => {
//       const routeNo = order.customer?.routeno || "Unassigned";

//       if (!routeData[routeNo]) {
//         routeData[routeNo] = {};
//       }

//       order.productItems.forEach((item) => {
//         const product = item.product;
//         const productSize = product?.quantity || "Unknown";
//         const category = product?.category || "Uncategorized";
//         const quantity = item.quantity || 0;

//         if (!routeData[routeNo][category]) {
//           routeData[routeNo][category] = {
//             quantities: {},
//             totalLiters: 0,
//           };
//         }

//         routeData[routeNo][category].quantities[productSize] =
//           (routeData[routeNo][category].quantities[productSize] || 0) +
//           quantity;

//         const match = productSize.match(/\d+/);
//         if (match) {
//           const sizeInML = parseInt(match[0], 10);
//           const totalML = sizeInML * quantity;
//           routeData[routeNo][category].totalLiters += totalML / 1000;
//         }
//       });
//     });

//     res.json({ success: true, data: routeData });
//   } catch (error) {
//     console.error("Error fetching tomorrow's orders:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// exports.getTodayOrders = async (req, res) => {
//   try {
//     // Get today and tomorrow in IST
//     const todayIST = moment.tz("Asia/Kolkata").startOf("day").toDate();
//     const tomorrowIST = moment.tz("Asia/Kolkata").add(1, "day").startOf("day").toDate();

//     const orders = await OrderProduct.find({
//       "selectedPlanDetails.dates": {
//         $elemMatch: {
//           date: { $gte: todayIST, $lt: tomorrowIST },
//           status: { $nin: ["leave", "cancel"] },
//         },
//       },
//     })
//       .populate("customer")
//       .populate({
//         path: "productItems.product",
//         populate: { path: "category" },
//       });

//     // Group orders by route and category
//     const routeData = {};

//     orders.forEach((order) => {
//       const routeNo = order.customer?.routeno || "Unassigned";

//       if (!routeData[routeNo]) {
//         routeData[routeNo] = {};
//       }

//       order.productItems.forEach((item) => {
//         const product = item.product;
//         const productSize = product?.quantity || "Unknown";
//         const category = product?.category || "Uncategorized";
//         const quantity = item.quantity || 0;

//         if (!routeData[routeNo][category]) {
//           routeData[routeNo][category] = {
//             quantities: {},
//             totalLiters: 0,
//           };
//         }

//         routeData[routeNo][category].quantities[productSize] =
//           (routeData[routeNo][category].quantities[productSize] || 0) +
//           quantity;

//         const match = productSize.match(/\d+/);
//         if (match) {
//           const sizeInML = parseInt(match[0], 10);
//           const totalML = sizeInML * quantity;
//           routeData[routeNo][category].totalLiters += totalML / 1000;
//         }
//       });
//     });

//     res.json({
//       success: true,
//       data: routeData,
//     });
//   } catch (error) {
//     console.error("Error fetching today's orders:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// exports.getTodayOrders = async (req, res) => {
//   try {
//     // Get today's date range in local time
//     const startOfToday = new Date();
//     startOfToday.setHours(0, 0, 0, 0);

//     const endOfToday = new Date();
//     endOfToday.setHours(23, 59, 59, 999);

//     // Fetch orders where selectedPlanDetails.dates contains today's date and valid status
//     const orders = await OrderProduct.find({
//       "selectedPlanDetails.dates": {
//         $elemMatch: {
//           date: {
//             $gte: startOfToday,
//             $lt: endOfToday,
//           },
//           status: { $nin: ["leave", "cancel"] },
//         },
//       },
//     })
//       .populate("customer")
//       .populate({
//         path: "productItems.product",
//         populate: { path: "category" },
//       });

//     // Group orders by route number
//     const routeData = {};

//     orders.forEach((order) => {
//       const routeNo = order.customer?.routeno || "Unassigned";

//       if (!routeData[routeNo]) {
//         routeData[routeNo] = {};
//       }

//       order.productItems.forEach((item) => {
//         const product = item.product;
//         const productSize = product?.quantity || "Unknown"; // e.g., "100ML"
//         const category = product?.category?.name || "Uncategorized"; // Ensure category name
//         const quantity = item.quantity || 0;

//         if (!routeData[routeNo][category]) {
//           routeData[routeNo][category] = {
//             quantities: {},
//             totalLiters: 0,
//           };
//         }

//         // Count quantities by size
//         routeData[routeNo][category].quantities[productSize] =
//           (routeData[routeNo][category].quantities[productSize] || 0) + quantity;

//         // Convert to liters if numeric value found
//         const match = productSize.match(/\d+/);
//         if (match) {
//           const sizeInML = parseInt(match[0], 10);
//           const totalML = sizeInML * quantity;
//           routeData[routeNo][category].totalLiters += totalML / 1000;
//         }
//       });
//     });

//     res.json({ success: true, data: routeData });
//   } catch (error) {
//     console.error("Error fetching today's orders:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

//today orders
// exports.getTodayOrders = async (req, res) => {
//     try {
//         const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD

//         // Fetch orders where selectedPlanDetails includes today's date
//         const orders = await OrderProduct.find({
//             "selectedPlanDetails.dates.date": {
//                 $gte: new Date(today),
//                 $lt: new Date(`${today}T23:59:59.999Z`)
//             }
//         })
//         .populate("customer")
//         .populate({
//             path: "productItems.product",
//             populate: { path: "category" } // Ensure category is populated
//         });

//         // Group orders by route number
//         const routeData = {};

//         orders.forEach(order => {
//             const routeNo = order.customer?.routeno || "Unassigned";

//             if (!routeData[routeNo]) {
//                 routeData[routeNo] = {};
//             }

//             order.productItems.forEach(item => {
//                 const product = item.product;
//                 const productSize = product?.quantity; // e.g., "100ML"
//                 const category = product?.category || "Uncategorized"; // Ensure category name exists
//                 const quantity = item.quantity;

//                 if (productSize) {
//                     // Initialize category if not exists
//                     if (!routeData[routeNo][category]) {
//                         routeData[routeNo][category] = {
//                             quantities: {},
//                             totalLiters: 0
//                         };
//                     }

//                     // Count quantities per category
//                     routeData[routeNo][category].quantities[productSize] =
//                         (routeData[routeNo][category].quantities[productSize] || 0) + quantity;

//                     // Convert to Liters
//                     const sizeInML = parseInt(productSize.match(/\d+/)[0], 10);
//                     const totalML = sizeInML * quantity;
//                     routeData[routeNo][category].totalLiters += totalML / 1000; // Convert ML to Liters
//                 }
//             });
//         });

//         res.json({ success: true, data: routeData });
//     } catch (error) {
//         console.error("Error fetching today's orders:", error);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// };

// Get filtered invoices
// exports.getCustomerInvoices = async (req, res) => {
//     try {
//         const { customerId } = req.params;

//         // Fetch orders for the given customer
//         const orders = await OrderProduct.find({ customer: customerId })
//             .populate("customer", "name email phone customerId paidAmounts")
//             .populate("productItems.product", "category")
//             .populate("plan")
//             .lean();

//             console.log(orders, "order");

//         if (!orders.length) {
//             return res.status(404).json({ message: "No invoices found for this customer" });
//         }

//         const formattedResponse = orders.map(order => {
//             let totalAmount = 0;

//             const orderItems = order.selectedPlanDetails?.dates
//                 .filter(dateItem => dateItem.status === "delivered")
//                 .map((dateItem, index) => ({
//                     no: index + 1,
//                     date: dateItem.date,
//                     status: dateItem.status,
//                     products: order.productItems.map(item => {
//                         const subtotal = item.quantity * item.routePrice;
//                         totalAmount += subtotal; // Accumulate the total amount
//                         return {
//                             product: item.product?.category || "N/A",
//                             quantity: item.quantity,
//                             routePrice: item.routePrice,
//                             subtotal: subtotal,
//                         };
//                     }),
//                 }));

//                 return {
//                     customer: order.customer,
//                     invoiceDetails: {
//                         invoiceNo: order._id,
//                         paymentType: order.paymentMethod,
//                         paymentStatus: order.paymentStatus,
//                     },
//                     orderItems: orderItems,
//                 total: totalAmount, // Corrected total amount
//                 paidAmount: 0, // Default paid amount
//             };
//         });
//         console.log(formattedResponse, "oir");

//         res.json(formattedResponse);
//     } catch (error) {
//         console.error("Error fetching invoice details:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };

exports.getCustomerInvoices = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Fetch orders for the given customer
    const orders = await OrderProduct.find({ customer: customerId })
      .populate("customer", "name email phone customerId paidAmounts")
      .populate("productItems.product", "category quantity")
      .populate("plan")
      .lean();

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No invoices found for this customer" });
    }

    const formattedResponse = orders.map((order) => {
      let totalAmount = 0; // Initialize total amount here
      let remainingDiscount = 3; // Only deduct a total of 3, not per item

      const orderItems = order.selectedPlanDetails?.dates
        .filter((dateItem) => dateItem.status === "delivered")
        .map((dateItem, index) => ({
          no: index + 1,
          date: dateItem.date,
          status: dateItem.status,
          products: order.productItems.map((item) => {
            let adjustedQuantity = item.quantity;

            // Apply discount only if planType is "introductory" AND remainingDiscount is available
            if (
              order.selectedPlanDetails?.planType === "introductory" &&
              remainingDiscount > 0
            ) {
              const deduction = Math.min(adjustedQuantity, remainingDiscount);
              adjustedQuantity -= deduction;
              remainingDiscount -= deduction;
            }

            const subtotal = adjustedQuantity * item.routePrice;
            totalAmount += subtotal; // Accumulate total amount correctly

            return {
              product: item.product?.category || "N/A",
              quantity: adjustedQuantity, // Adjusted quantity
              routePrice: item.routePrice,
              ml: item.product?.quantity,
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
        total: totalAmount, // Ensure the correct total is returned
        paidAmount: order.paidamount || 0, // Set the actual paid amount
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

// Controller file: bottlesController.js//

exports.updateReturnedBottlesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { returnedBottles } = req.body;

    // Validate input
    if (
      returnedBottles === undefined ||
      isNaN(returnedBottles) ||
      returnedBottles < 0
    ) {
      return res
        .status(400)
        .json({ message: "Valid returnedBottles value is required" });
    }

    // Find all orders for this customer
    const orders = await OrderProduct.find({ customer: customerId });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for this customer" });
    }

    // Calculate total delivered bottles across all orders
    const totalDeliveredBottles = orders.reduce(
      (total, order) => total + (order.bottles || 0),
      0
    );

    // Make sure returned bottles don't exceed total delivered
    const validReturnedBottles = Math.min(
      returnedBottles,
      totalDeliveredBottles
    );

    // Determine how many bottles to allocate to each order
    let remainingToAllocate = validReturnedBottles;

    // Process orders to allocate returned bottles
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        if (!order.bottles || order.bottles <= 0) {
          return order;
        }

        const bottlesToAllocate = Math.min(
          remainingToAllocate,
          order.bottles - (order.returnedBottles || 0)
        );

        // ✅ Fix: Accumulate returned bottles instead of overwriting
        order.returnedBottles =
          (order.returnedBottles || 0) + bottlesToAllocate;

        // ✅ Fix: Calculate pending bottles correctly
        order.pendingBottles = Math.max(
          0,
          order.bottles - order.returnedBottles
        );

        remainingToAllocate -= bottlesToAllocate;

        await order.save();

        return order;
      })
    );

    // Calculate summary
    const summary = {
      totalDeliveredBottles,
      totalReturnedBottles: validReturnedBottles,
      totalPendingBottles: totalDeliveredBottles - validReturnedBottles,
    };

    // ✅ Fix: If no pending bottles, return a specific message
    if (summary.totalPendingBottles === 0) {
      return res
        .status(200)
        .json({ message: "There are no pending bottles for return." });
    }

    res.status(200).json({
      success: true,
      customerId,
      summary,
      message: `Updated returned bottles for customer. ${validReturnedBottles} bottles returned out of ${totalDeliveredBottles} delivered.`,
    });
  } catch (error) {
    console.error("Error updating returned bottles by customer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Modified getOrdersByCustomerId to include bottles information
exports.getOrdersByCustomerIds = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Find orders for the given customer ID
    const orders = await OrderProduct.find({ customer: customerId })
      .populate("customer", "name email phoneNumber")
      .populate({
        path: "productItems.product",
        select: "name price description category title",
      })
      .populate("plan", "planType")
      .populate("selectedPlanDetails", "planType isActive dates status");

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for this customer" });
    }

    // Update bottles count for each order
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        // Count total delivered bottles
        let totalBottles = 0;

        // Filter for delivered dates
        const deliveredDates = order.selectedPlanDetails.dates.filter(
          (date) => date.status === "delivered"
        );

        // Count bottles from bottle category products for delivered dates
        deliveredDates.forEach(() => {
          order.productItems.forEach((item) => {
            if (item.product && item.product.category === "bottle") {
              totalBottles += item.quantity;
            }
          });
        });

        // Update the order's bottles count if it has changed
        if (order.bottles !== totalBottles) {
          order.bottles = totalBottles;
          // Recalculate pending bottles
          order.pendingBottles = Math.max(
            0,
            totalBottles - order.returnedBottles
          );
          await order.save();
        }

        return {
          ...order.toObject(),
          bottlesInfo: {
            totalDeliveredBottles: order.bottles,
            returnedBottles: order.returnedBottles,
            pendingBottles: order.pendingBottles,
          },
        };
      })
    );

    res.status(200).json(updatedOrders);
  } catch (error) {
    console.error("Error fetching orders by customer ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to get total bottles summary for a customer
exports.getCustomerBottlesSummary = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Find customer details
    const customer = await Customer.findById(customerId).select(
      "name email phone routeno"
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Find all orders for this customer
    const orders = await OrderProduct.find({ customer: customerId });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for this customer" });
    }

    // Calculate totals
    const summary = orders.reduce(
      (acc, order) => {
        acc.totalDeliveredBottles += order.bottles || 0;
        acc.totalReturnedBottles += order.returnedBottles || 0;
        acc.totalPendingBottles += order.pendingBottles || 0;
        return acc;
      },
      {
        totalDeliveredBottles: 0,
        totalReturnedBottles: 0,
        totalPendingBottles: 0,
      }
    );

    res.status(200).json({
      success: true,
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phoneNumber: customer.phone,
        routeNo: customer.routeno,
      },
      summary,
    });
  } catch (error) {
    console.error("Error fetching customer bottles summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//get bottles summary for all customers
exports.getBottlesSummary = async (req, res) => {
  try {
    // Find all customers
    const customers = await OrderProduct.find().populate(
      "customer",
      "name email phone routeno"
    );

    if (!customers.length) {
      return res.status(404).json({ message: "No customers found" });
    }

    // Calculate totals
    const summary = customers.reduce(
      (acc, customer) => {
        acc.totalDeliveredBottles += customer.bottles || 0;
        acc.totalReturnedBottles += customer.returnedBottles || 0;
        acc.totalPendingBottles += customer.pendingBottles || 0;
        return acc;
      },
      {
        totalDeliveredBottles: 0,
        totalReturnedBottles: 0,
        totalPendingBottles: 0,
      }
    );

    res.status(200).json({
      success: true,
      customers,
      summary,
    });
  } catch (error) {
    console.error("Error fetching bottles summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// total invoice
exports.invoice = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  try {
    const orders = await OrderProduct.find({ customer: customerId })
      .populate(
        "productItems.product",
        "name category routerPrice coverimage quantity"
      )
      .populate("customer", "name email phone customerId paidAmounts")
      .populate("selectedPlanDetails", "planType isActive dates status")
      .populate("plan", "planType")
      .select("productItems quantity address");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No product items found for this customer" });
    }

    let totalInvoiceAmount = 0; // Store total invoice price

    // Process each order
    orders.forEach((order) => {
      if (order.selectedPlanDetails) {
        // Filter delivered dates
        order.selectedPlanDetails.dates =
          order.selectedPlanDetails.dates.filter(
            (date) => date.status === "delivered"
          );
      }

      // Count delivered dates
      const deliveredDatesCount = order.selectedPlanDetails?.dates?.length || 0;

      // Sum up routePrice for all product items in the order
      const totalRoutePrice = order.productItems.reduce(
        (sum, item) => sum + item.routePrice,
        0
      );

      // Calculate total price for this order (deliveredDatesCount * totalRoutePrice)
      order.totalPrice = deliveredDatesCount * totalRoutePrice;

      // Add to total invoice amount
      totalInvoiceAmount += order.totalPrice;
    });

    // Extract paidAmounts from the customer field (assuming it's the same across all orders)
    const customer = orders[0]?.customer;
    let totalPaid = 0;
    if (customer?.paidAmounts?.length) {
      totalPaid = customer.paidAmounts.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
    }

    res.status(200).json({ orders, totalInvoiceAmount, totalPaid });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product items", error: error.message });
  }
});

//monthly invoice
exports.monthlyinvoice = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  try {
    const orders = await OrderProduct.find({ customer: customerId })
      .populate(
        "productItems.product",
        "name category routerPrice coverimage quantity"
      )
      .populate("customer", "name email phone customerId paidAmounts")
      .populate("selectedPlanDetails", "planType isActive dates status")
      .populate("plan", "planType")
      .select("productItems quantity address");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No product items found for this customer" });
    }

    // point adding

    const order = await OrderProduct.find({ customer: customerId })
      .populate("productItems.product", "category quantity")
      .populate("plan")
      .lean();

    const formattedResponse = order.map((order) => {
      let totalAmount = 0; // Initialize total amount here
      let remainingDiscount = 3; // Only deduct a total of 3, not per item
      const orderItems = order.selectedPlanDetails?.dates
        .filter((dateItem) => dateItem.status === "delivered")
        .map((dateItem, index) => ({
          no: index + 1,
          date: dateItem.date,
          status: dateItem.status,
          products: order.productItems.map((item) => {
            let adjustedQuantity = item.quantity;

            // Apply discount only if planType is "introductory" AND remainingDiscount is available
            if (
              order.selectedPlanDetails?.planType === "introductory" &&
              remainingDiscount > 0
            ) {
              const deduction = Math.min(adjustedQuantity, remainingDiscount);
              adjustedQuantity -= deduction;
              remainingDiscount -= deduction;
            }

            const subtotal = adjustedQuantity * item.routePrice;
            totalAmount += subtotal; // Accumulate total amount correctly

            return {
              product: item.product?.category || "N/A",
              quantity: adjustedQuantity, // Adjusted quantity
              routePrice: item.routePrice,
              ml: item.product?.quantity,
              subtotal: subtotal,
            };
          }),
        }));

      return orderItems;
    });

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0 = Jan
    const currentYear = currentDate.getFullYear();

    const filteredProducts = formattedResponse
      .flat()
      .filter((item) => {
        const itemDate = new Date(item.date);
        return (
          itemDate.getMonth() === currentMonth &&
          itemDate.getFullYear() === currentYear
        );
      })
      .flatMap((item) => item.products);

    let totalML = 0;
    let totalPoints = 0;

    filteredProducts.forEach((p) => {
      const category = p.product.toLowerCase();

      if (category === "bottle" || category === "pouched") {
        const mlValue = parseInt(p.ml); // "300 ML" -> 300
        const totalProductML = mlValue * p.quantity;
        totalML += totalProductML;
      } else {
        // 1 point per quantity for other categories
        totalPoints += p.quantity;
      }
    });

    // 200 ml = 1 point for bottle/pouched
    totalPoints += Math.floor(totalML / 200);

    const findCustomer = await Customer.findById(customerId);
    if (!findCustomer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    findCustomer.point += totalPoints;

    await findCustomer.save();

    // point

    let totalInvoiceAmount = 0; // Store total invoice price
    // Object to store monthly data
    const monthlyData = {};

    // Process each order
    orders.forEach((order) => {
      if (order.selectedPlanDetails) {
        // Filter delivered dates
        order.selectedPlanDetails.dates =
          order.selectedPlanDetails.dates.filter(
            (date) => date.status === "delivered"
          );
      }

      // Count delivered dates
      const deliveredDatesCount = order.selectedPlanDetails?.dates?.length || 0;

      // Sum up routePrice for all product items in the order
      const totalRoutePrice = order.productItems.reduce(
        (sum, item) => sum + item.routePrice,
        0
      );

      // Calculate total price for this order (deliveredDatesCount * totalRoutePrice)
      order.totalPrice = deliveredDatesCount * totalRoutePrice;

      // Add to total invoice amount
      totalInvoiceAmount += order.totalPrice;

      // Organize data by month
      if (
        order.selectedPlanDetails?.dates &&
        order.selectedPlanDetails.dates.length > 0
      ) {
        order.selectedPlanDetails.dates.forEach((dateObj) => {
          const date = new Date(dateObj.date);
          const monthYear = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
              orders: [],
              totalAmount: 0,
              deliveredDates: 0,
            };
          }

          // Check if this order is already in the monthly data
          const existingOrderIndex = monthlyData[monthYear].orders.findIndex(
            (o) => o._id.toString() === order._id.toString()
          );

          if (existingOrderIndex === -1) {
            // Clone the order to avoid reference issues
            const orderClone = JSON.parse(JSON.stringify(order));
            // Include only dates from this month
            orderClone.selectedPlanDetails.dates = [dateObj];
            // Calculate price for just this date
            orderClone.totalPrice = totalRoutePrice;

            monthlyData[monthYear].orders.push(orderClone);
          } else {
            // Add date to existing order
            monthlyData[monthYear].orders[
              existingOrderIndex
            ].selectedPlanDetails.dates.push(dateObj);
            // Update price
            monthlyData[monthYear].orders[existingOrderIndex].totalPrice +=
              totalRoutePrice;
          }

          // Update monthly totals
          monthlyData[monthYear].totalAmount += totalRoutePrice;
          monthlyData[monthYear].deliveredDates += 1;
        });
      }
    });

    // Extract paidAmounts from the customer field
    const customer = orders[0]?.customer;
    let totalPaid = 0;
    let monthlyPayments = {};

    if (customer?.paidAmounts?.length) {
      // Calculate total paid
      totalPaid = customer.paidAmounts.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      // Organize payments by month
      customer.paidAmounts.forEach((payment) => {
        const date = new Date(payment.date);
        const monthYear = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthlyPayments[monthYear]) {
          monthlyPayments[monthYear] = 0;
        }

        monthlyPayments[monthYear] += payment.amount;
      });
    }

    // Add payment data to monthly data
    Object.keys(monthlyData).forEach((month) => {
      monthlyData[month].paid = monthlyPayments[month] || 0;
      monthlyData[month].balance =
        monthlyData[month].totalAmount - (monthlyPayments[month] || 0);
    });

    res.status(200).json({
      // orders,
      totalInvoiceAmount,
      totalPaid,
      monthlyData: Object.keys(monthlyData).map((month) => ({
        month,
        ...monthlyData[month],
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product items", error: error.message });
  }
});

// Function to get last month's date range
const getLastMonthRange = () => {
  const today = new Date();
  const firstDayLastMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: firstDayLastMonth, end: firstDayThisMonth };
};

// Function to format orders into an HTML table
const formatInvoiceTable = (monthlyData) => {
  let tableHTML = `
        <h2>Monthly Invoice Report</h2>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr>
                <th>Customer Name</th>
                <th>Plan Type</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Delivered Dates</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Balance</th>
            </tr>`;

  monthlyData.forEach(({ month, orders, totalAmount, paid, balance }) => {
    orders.forEach((order) => {
      const deliveredDates = order.selectedPlanDetails?.dates
        .map((d) => new Date(d.date).toLocaleDateString("en-GB")) // "en-GB" formats as DD/MM/YYYY
        .join(", ");
      const products = order.productItems
        .map(
          (item) =>
            `${item.product.category} (${item.quantity} x ${item.routePrice})`
        )
        .join("<br>");

      tableHTML += `
                <tr>
                    <td>${order.customer?.name || "N/A"}</td>
                    <td>${order.selectedPlanDetails?.planType || "N/A"}</td>
                    <td>${products}</td>
                    <td>${order.productItems.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    )}</td>
                    <td>${deliveredDates || "N/A"}</td>
                    <td>${totalAmount}</td>
                    <td>${paid}</td>
                    <td>${balance}</td>
                </tr>`;
    });
  });

  tableHTML += `</table>`;
  return tableHTML;
};

// Function to send email with invoice
const sendEmail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Company Name" ${process.env.EMAIL}`,
    to,
    subject,
    html: htmlContent,
  });
};

// Controller to fetch last month's invoice and send email
exports.sendMonthlyInvoice = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { start, end } = getLastMonthRange();

  try {
    const orders = await OrderProduct.find({ customer: customerId })
      .populate(
        "productItems.product",
        "name category routerPrice coverimage quantity"
      )
      .populate("customer", "name email phone customerId paidAmounts")
      .populate("selectedPlanDetails", "planType isActive dates status")
      .populate("plan", "planType")
      .select("productItems quantity address selectedPlanDetails");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for last month" });
    }

    let totalInvoiceAmount = 0;
    let totalPaid = 0;
    const monthlyData = {};
    const customer = orders[0]?.customer;

    orders.forEach((order) => {
      const deliveredDates =
        order.selectedPlanDetails?.dates?.filter((date) => {
          const deliveredDate = new Date(date.date);
          return (
            date.status === "delivered" &&
            deliveredDate >= start &&
            deliveredDate < end
          );
        }) || [];

      if (deliveredDates.length === 0) return;

      const totalRoutePrice = order.productItems.reduce(
        (sum, item) => sum + item.routePrice,
        0
      );
      const orderTotalPrice = deliveredDates.length * totalRoutePrice;
      totalInvoiceAmount += orderTotalPrice;

      const monthYear = `${start.getFullYear()}-${String(
        start.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          orders: [],
          totalAmount: 0,
          deliveredDates: 0,
          paid: 0,
          balance: 0,
        };
      }

      monthlyData[monthYear].orders.push({
        _id: order._id,
        customer,
        selectedPlanDetails: order.selectedPlanDetails,
        address: order.address,
        productItems: order.productItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          routePrice: item.routePrice,
        })),
        plan: order.plan,
        totalPrice: orderTotalPrice,
      });

      monthlyData[monthYear].totalAmount += orderTotalPrice;
      monthlyData[monthYear].deliveredDates += deliveredDates.length;
    });

    if (customer?.paidAmounts?.length) {
      customer.paidAmounts.forEach((payment) => {
        const paymentDate = new Date(payment.date);
        const monthYear = `${paymentDate.getFullYear()}-${String(
          paymentDate.getMonth() + 1
        ).padStart(2, "0")}`;

        if (paymentDate >= start && paymentDate < end) {
          totalPaid += payment.amount;
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
              orders: [],
              totalAmount: 0,
              deliveredDates: 0,
              paid: 0,
              balance: 0,
            };
          }
          monthlyData[monthYear].paid += payment.amount;
        }
      });
    }

    Object.keys(monthlyData).forEach((month) => {
      monthlyData[month].balance =
        monthlyData[month].totalAmount - monthlyData[month].paid;
    });

    const htmlTable = formatInvoiceTable(Object.values(monthlyData));
    await sendEmail(customer.email, "Your Monthly Invoice Report", htmlTable);
    // Push notification after sending email
    if (customer && customer.fcmToken) {
      const message = {
        token: customer.fcmToken,
        notification: {
          title: "Invoice Sent Successfully",
          body: "Your last month's invoice has been sent successfully.",
        },
      };

      await messaging.send(message);
    }

    res.status(200).json({
      message: "Invoice sent successfully",
      totalInvoiceAmount,
      totalPaid,
      monthlyData: Object.keys(monthlyData).map((month) => ({
        month,
        ...monthlyData[month],
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sending invoice", error: error.message });
  }
});

// Controller to update the status of a specific date in an order

exports.updateDateStatus = async (req, res) => {
  try {
    const { orderId } = req.params; // Get orderId from URL params
    const { date, status, bottlesReturned = 0 } = req.body; // Get date, status, and optional bottlesReturned from the request body

    // Find the order by ID and populate product details
    const order = await OrderProduct.findById(orderId).populate(
      "productItems.product"
    );
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Convert provided date to YYYY-MM-DD format
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // Find the specific date in the dates array
    const dateToUpdate = order.selectedPlanDetails.dates.find(
      (d) => new Date(d.date).toISOString().split("T")[0] === formattedDate
    );

    if (!dateToUpdate) {
      return res.status(404).json({ error: "Date not found in order" });
    }

    // Update the status of the found date
    dateToUpdate.status = status;

    // If the order is being delivered, update bottle counts
    if (status === "delivered") {
      // Count new bottles being delivered in this order
      const newBottles = order.productItems.reduce((total, item) => {
        // Check if the product is a bottle type (assuming there's a category field on the product)
        if (item.product && item.product.category === "bottle") {
          return total + item.quantity;
        }
        return total;
      }, 0);

      // Update total bottles count (add new bottles)
      order.bottles += newBottles;

      // Update returned bottles count (if any were returned during this delivery)
      if (bottlesReturned > 0) {
        order.returnedBottles += parseInt(bottlesReturned);
      }

      // Calculate pending bottles (total - returned)
      order.pendingBottles = order.bottles - order.returnedBottles;
    }

    // Save the updated order
    await order.save();

    // Fetch the user associated with the order to get their FCM token
    const user = await User.findById(order.customer);

    if (user && user.fcmToken) {
      // Check if order is delivered
      if (status === "delivered") {
        // Default order delivered notification
        let notificationTitle = "Order Delivered";
        let notificationBody =
          "Your today's order has been delivered successfully.";

        // If there are more than 2 pending bottles, send reminder notification
        if (order.pendingBottles > 2) {
          // Send a separate notification for bottle reminder
          const reminderMessage = {
            token: user.fcmToken,
            notification: {
              title: "Bottle Return Reminder",
              body: `You have ${order.pendingBottles} pending bottles. Please wash and return them with your next order.`,
            },
            data: {
              orderId: order._id.toString(),
              type: "bottle_reminder",
              pendingBottles: order.pendingBottles.toString(),
            },
          };

          // Send bottle reminder notification
          await messaging.send(reminderMessage);
        }

        // Send regular delivery notification
        const deliveryMessage = {
          token: user.fcmToken,
          notification: {
            title: notificationTitle,
            body: notificationBody,
          },
          data: {
            orderId: order._id.toString(),
            status: status,
          },
        };

        // Send delivery notification
        await messaging.send(deliveryMessage);
      }
    }

    res.status(200).json({
      message: "Your today order delivered successfully",
      order: {
        selectedPlanDetails: {
          planType: order.selectedPlanDetails.planType,
          dates: order.selectedPlanDetails.dates,
          isActive: order.selectedPlanDetails.isActive,
        },
        _id: order._id,
        customer: order.customer,
        productItems: order.productItems,
        plan: order.plan,
        bottles: order.bottles,
        returnedBottles: order.returnedBottles,
        pendingBottles: order.pendingBottles,
      },
    });
  } catch (error) {
    console.error("Error updating date status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// exports.changePlan = async (req, res) => {
//     const { orderId, newPlanType, customDates, weeklyDays, interval, startDate } = req.body;

//     try {
//         const order = await OrderProduct.findById(orderId);
//         if (!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         // Retain only previous dates before the change
//         const previousDates = order.selectedPlanDetails.dates
//             .filter(d => new Date(d.date) < new Date())
//             .map(d => ({
//                 date: new Date(d.date).setUTCHours(0, 0, 0, 0), // Normalize date
//                 status: d.status,
//             }));

//         let newDates = [];
//         const now = new Date();
//         const today = new Date();
//         today.setUTCHours(0, 0, 0, 0); // Normalize today

//         console.log(newDates, "newdate");

//         // Determine the start date
//         let start = new Date();
//         if (now.getHours() >= 6) {
//             start.setDate(start.getDate() + 1); // Move to next day if after 6 AM
//         }
//         start.setUTCHours(0, 0, 0, 0); // Normalize start date

//         switch (newPlanType) {
//             case "daily":
//             case "monthly":
//                 newDates = Array.from({ length: 30 }, (_, i) => {
//                     let date = new Date(start);
//                     date.setDate(start.getDate() + i);
//                     date.setUTCHours(0, 0, 0, 0); // Normalize
//                     return date;
//                 });
//                 break;

//             case "custom":
//                 if (!customDates || !Array.isArray(customDates)) {
//                     return res.status(400).json({ message: "Invalid custom dates" });
//                 }
//                 newDates = customDates.map(date => {
//                     let d = new Date(date);
//                     d.setUTCHours(0, 0, 0, 0); // Normalize
//                     return d;
//                 });
//                 break;

//             case "weekly":
//                 if (!weeklyDays || !Array.isArray(weeklyDays)) {
//                     return res.status(400).json({ message: "Invalid weekly days" });
//                 }
//                 newDates = weeklyDays.map(day => {
//                     const offset = (day - start.getDay() + 7) % 7;
//                     let nextDay = new Date(start);
//                     nextDay.setDate(start.getDate() + offset);
//                     nextDay.setUTCHours(0, 0, 0, 0); // Normalize
//                     return nextDay;
//                 });
//                 break;

//             case "alternative":
//                 if (!startDate || !interval || typeof interval !== "number") {
//                     return res.status(400).json({ message: "Invalid alternative plan details" });
//                 }
//                 const altStartDate = new Date(startDate);
//                 altStartDate.setUTCHours(0, 0, 0, 0);

//                 // Adjust altStartDate if order is changed after 6 AM
//                 if (now.getHours() >= 6) {
//                     altStartDate.setDate(altStartDate.getDate() + 1);
//                 }

//                 newDates = Array.from({ length: 15 }, (_, i) => {
//                     let nextDate = new Date(altStartDate);
//                     nextDate.setDate(altStartDate.getDate() + i * interval);
//                     nextDate.setUTCHours(0, 0, 0, 0); // Normalize
//                     return nextDate;
//                 });
//                 break;
//             case "introductory":
//                     if (!startDate) {
//                         return res.status(400).json({ message: "Start date required for Introductory Plan" });
//                     }

//                     const introStartDate = new Date(startDate);
//                     introStartDate.setUTCHours(0, 0, 0, 0);

//                     // Calculate the full 10-day delivery period
//                     newDates = Array.from({ length: 10 }, (_, i) => {
//                         let nextDate = new Date(introStartDate);
//                         nextDate.setDate(introStartDate.getDate() + i);
//                         nextDate.setUTCHours(0, 0, 0, 0);
//                         return nextDate;
//                     });

//                     // Store a separate array for invoice dates (only 7 days)
//                     const invoiceDates = newDates.slice(0, 7);

//                     break;

//             default:
//                 return res.status(400).json({ message: "Invalid plan type" });
//         }

//         // Remove duplicate dates
//         const uniqueDates = new Map();

//         // Add previous dates to the map
//         previousDates.forEach(({ date, status }) => {
//             uniqueDates.set(date, { date: new Date(date), status });
//         });

//         // Add new dates to the map if not already present
//         newDates.forEach(date => {
//             if (!uniqueDates.has(date.getTime())) {
//                 uniqueDates.set(date.getTime(), { date, status: "pending" });
//             }
//         });

//         // Convert map back to an array
//         order.selectedPlanDetails.planType = newPlanType;
//         order.selectedPlanDetails.dates = Array.from(uniqueDates.values());
//         order.selectedPlanDetails.isActive = true;

//         await order.save();
//         console.log(JSON.stringify(order.selectedPlanDetails.dates, null, 2));

//         res.status(200).json({ message: "Plan updated successfully", order });

//         // Send notification
//         const user = await User.findById(order.customer); // Assuming 'customer' is the user ID

//         if (user && user.fcmToken) {
//             const message = {
//                 token: user.fcmToken,
//                 notification: {
//                     title: "Changed Plan",
//                     body: "Your plan has been changed.",
//                 },
//             };
//             await messaging.send(message);
//         }

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

exports.changePlan = async (req, res) => {
  const { orderId, newPlanType, customDates, weeklyDays, interval, startDate } =
    req.body;

  try {
    const order = await OrderProduct.findById(orderId).populate("customer");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Retain only previous dates before today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const previousDates = order.selectedPlanDetails.dates
      .filter((d) => new Date(d.date) < today)
      .map((d) => ({
        date: new Date(d.date).setUTCHours(0, 0, 0, 0),
        status: d.status,
      }));

    let newDates = [];
    //   let planStartDate = startDate ? new Date(startDate) : new Date();

    //   planStartDate.setUTCHours(0, 0, 0, 0);
    //   console.log(planStartDate, "hooo");
    //   console.log(today, "today");

    //   const now = new Date();
    //  const timeString = now.toLocaleTimeString(); // Local timezone
    //  console.log(timeString); // e.g., "10:42:30 AM"

    //   if (planStartDate == today && timeString >  "3:42:30 AM" ) planStartDate = today + 1; // Ensure start date is today or later

    let planStartDate = startDate ? new Date(startDate) : new Date();

    const now = new Date();

    // Set planStartDate to 00:00 UTC
    planStartDate.setUTCHours(0, 0, 0, 0);

    // Convert current local time to 24-hour format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // Target time = 3:42:30 AM
    const targetHour = 3;
    const targetMinute = 42;
    const targetSecond = 30;

    // Compare current time with 3:42:30 AM
    const isAfterTargetTime =
      currentHour > targetHour ||
      (currentHour === targetHour && currentMinute > targetMinute) ||
      (currentHour === targetHour &&
        currentMinute === targetMinute &&
        currentSecond > targetSecond);

    // If plan start is today AND current time is after 3:42 AM, move to tomorrow
    if (planStartDate.getTime() === today.getTime() && isAfterTargetTime) {
      planStartDate = new Date(today);
      planStartDate.setDate(today.getDate() + 1); // move to tomorrow
    }

    switch (newPlanType) {
      case "daily":
      case "monthly":
        newDates = Array.from({ length: 30 }, (_, i) => {
          let date = new Date(planStartDate);
          date.setDate(planStartDate.getDate() + i);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        });
        break;

      case "custom":
        if (!customDates || !Array.isArray(customDates)) {
          return res.status(400).json({ message: "Invalid custom dates" });
        }
        newDates = customDates.map((date) => {
          let d = new Date(date);
          d.setUTCHours(0, 0, 0, 0);
          return d;
        });
        break;

      case "weekly":
        if (!weeklyDays || !Array.isArray(weeklyDays)) {
          return res.status(400).json({ message: "Invalid weekly days" });
        }
        for (let i = 0; i < 4; i++) {
          // Generate dates for 4 weeks
          weeklyDays.forEach((day) => {
            let nextDate = new Date(planStartDate);
            let offset = (day - nextDate.getDay() + 7) % 7;
            nextDate.setDate(nextDate.getDate() + offset + i * 7);
            nextDate.setUTCHours(0, 0, 0, 0);
            newDates.push(nextDate);
          });
        }
        break;

      case "alternative":
        if (!interval || typeof interval !== "number") {
          return res
            .status(400)
            .json({ message: "Invalid interval for alternative plan" });
        }
        newDates = Array.from({ length: 15 }, (_, i) => {
          let nextDate = new Date(planStartDate);
          nextDate.setDate(planStartDate.getDate() + i * interval);
          nextDate.setUTCHours(0, 0, 0, 0);
          return nextDate;
        });
        break;

      case "introductory":
        newDates = Array.from({ length: 10 }, (_, i) => {
          let nextDate = new Date(planStartDate);
          nextDate.setDate(planStartDate.getDate() + i);
          nextDate.setUTCHours(0, 0, 0, 0);
          return nextDate;
        });
        break;

      default:
        return res.status(400).json({ message: "Invalid plan type" });
    }

    // Remove duplicate dates
    const uniqueDates = new Map();

    previousDates.forEach(({ date, status }) => {
      uniqueDates.set(date, { date: new Date(date), status });
    });

    newDates.forEach((date) => {
      if (!uniqueDates.has(date.getTime())) {
        uniqueDates.set(date.getTime(), { date, status: "pending" });
      }
    });

    // Update order details
    order.selectedPlanDetails.planType = newPlanType;
    order.selectedPlanDetails.dates = Array.from(uniqueDates.values()).sort(
      (a, b) => a.date - b.date
    );
    order.selectedPlanDetails.isActive = true;

    await order.save();

    //  notification creating
    const deliveryBoy = await AdminsModel.findOne({
      route: order?.customer?.routeno,
    });


       const messageCustomer = `🛒 Updated order.`;

    const notificationCustomer = new Notification({
      customerId:  order?.customer?._id,
      messageCustomer,
    });
    await notificationCustomer.save();

    const message = `🛒 ${order?.customer?.name} (Route ${order?.customer?.routeno}) updated their order.`;

    const notification = new Notification({
      deliveryboyId: deliveryBoy._id,
      message,
    });
    await notification.save();

    res.status(200).json({ message: "Plan updated successfully", order });

    // Send notification if applicable
    const user = await User.findById(order.customer);
    if (user?.fcmToken) {
      await messaging.send({
        token: user.fcmToken,
        notification: {
          title: "Changed Plan",
          body: "Your plan has been changed.",
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};




exports.autoGenerateOrders = async () => {
  try {
    const today = new Date();
    const plans = await Plan.find({ isActive: true }).populate("customer");

    for (const plan of plans) {
      const customer = plan.customer;
      if (!customer) continue;

      const planDates = plan.dates.map((d) => new Date(d));
      const isTodayScheduled = planDates.some((d) => isSameDay(d, today));
      if (!isTodayScheduled) continue;

      // Check if today's order already exists for this plan
      const existingOrder = await OrderProduct.findOne({
        customer: customer._id,
        plan: plan._id,
        "selectedPlanDetails.dates.date": {
          $in: [today.toISOString().split('T')[0]] // match today's date string
        },
      });

      if (existingOrder) continue;

      const orderAddress = customer.address[0];
      if (!orderAddress) continue;

      // Get the latest order (optional: limit to this plan)
      const lastOrder = await OrderProduct.findOne({
        customer: customer._id,
        plan: plan._id
      }).sort({ createdAt: -1 });

      if (!lastOrder) continue;

      const validatedProductItems = await Promise.all(
        lastOrder.productItems.map(async (item) => {
          const product = await Product.findById(item.product);
          if (!product) return null;
          return {
            product: item.product,
            quantity: item.quantity,
            routePrice: item.routePrice,
          };
        })
      );

      const totalRoutePrice = validatedProductItems.reduce(
        (sum, item) => sum + item.routePrice * item.quantity,
        0
      );

      const selectedPlanDetails = {
        planType: plan.planType,
        dates: planDates.map((date) => ({
          date,
          status: isSameDay(date, today) ? "pending" : "upcoming"
        })),
        isActive: plan.isActive,
      };

      const newOrder = new OrderProduct({
        customer: customer._id,
        productItems: validatedProductItems,
        plan: plan._id,
        selectedPlanDetails,
        totalPrice: totalRoutePrice,
        paymentMethod: "not selected",
        paymentStatus: "unpaid",
        address: orderAddress,
        paidamount: 0,
        Total: 0,
      });

      await newOrder.save();

      // Optional notification
      const deliveryBoy = await AdminsModel.findOne({
        route: customer?.routeno,
      });

      if (deliveryBoy) {
       

           const messageCustomer = `🛒 Auto-plan order created`;
        const notificationCustomer = new Notification({
            customerId: customer._id,
          messageCustomer,
        });
        await notificationCustomer.save();

        const message = `🛒 ${customer.name} (Route ${customer?.routeno}) auto-plan order created`;
        const notification = new Notification({
          deliveryboyId: deliveryBoy._id,
          message,
        });
        await notification.save();
      }
    }
  } catch (err) {
    console.error("Auto-generate order error:", err);
  }
};
