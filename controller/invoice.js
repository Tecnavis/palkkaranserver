const Invoice = require("../models/invoicemodel");
const OrderProduct = require("../models/orderdetails");

const generateInvoiceForCustomer = async (customerId) => {
    try {
        // Fetch all order details for the customer
        const orders = await OrderProduct.find({ "customer._id": customerId });

        if (!orders.length) {
            return { message: "No orders found for this customer" };
        }

        // Calculate total amount
        let totalAmount = 0;
        let orderIds = [];

        orders.forEach(order => {
            orderIds.push(order._id);
            order.productItems.forEach(item => {
                totalAmount += item.routePrice * item.quantity;
            });
        });

        // Create a new invoice
        const newInvoice = new Invoice({
            invoiceId: `INV-${Date.now()}`,
            customerId,
            orderdetails: orderIds,
            totalAmount,
            balanceAmount: totalAmount, // Assume full amount is unpaid initially
        });

        await newInvoice.save();
        return { message: "Invoice generated successfully", invoice: newInvoice };
    } catch (error) {
        console.error(error);
        return { error: "Error generating invoice" };
    }
};

module.exports = { generateInvoiceForCustomer };
