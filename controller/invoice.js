const Invoice = require("../models/invoicemodel");
const OrderDetails = require("../models/orderdetails");
const { v4: uuidv4 } = require("uuid");

const createInvoice = async (customerId) => {
    try {
        // Fetch all orders for the given customer
        const orders = await OrderDetails.find({ "customer._id": customerId }).populate("productItems.product");

        if (!orders.length) {
            return { success: false, message: "No orders found for this customer" };
        }

        let totalInvoiceAmount = 0;
        let orderDetailsArray = [];

        orders.forEach((order) => {
            let orderTotal = 0;

            const products = order.productItems.map((item) => {
                orderTotal += item.routePrice * item.quantity;
                return {
                    product: item.product._id,
                    quantity: item.quantity,
                    routePrice: item.routePrice
                };
            });

            totalInvoiceAmount += orderTotal;

            orderDetailsArray.push({
                orderId: order._id,
                productItems: products,
                totalAmount: orderTotal
            });
        });

        const invoice = new Invoice({
            invoiceId: `INV-${uuidv4().slice(0, 8)}`,
            customerId,
            orderDetails: orderDetailsArray,
            totalAmount: totalInvoiceAmount,
            balanceAmount: totalInvoiceAmount // Initially, balance = total
        });

        await invoice.save();
        return { success: true, invoice };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Error generating invoice" };
    }
};
