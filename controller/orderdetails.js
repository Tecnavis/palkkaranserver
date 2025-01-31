const OrderProduct = require("../models/orderdetails");
const Product = require("../models/product");
const Plan = require("../models/plans");
const Customer = require("../models/customer");
const asyncHandler = require("express-async-handler");
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
            .populate("customer", "name email phone address") // Populate customer details
            .populate({
                path: "productItems.product", // Populate product details for each product item
                select: "name price description productId title", // Select specific fields from the Product model
            })
            .populate("plan", "planType"); // Optionally populate plan details

        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
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