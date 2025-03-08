const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    customerDetails: {
        name: String,
        email: String,
        phone: String,
        address: {
            postcode: String,
            streetAddress: String,
            apartment: String
        },
        customerId: String,
        routeNo: String
    },
    invoicePeriod: {
        month: Number,
        year: Number,
        monthName: String
    },
    orderItems: [
        {
            date: {
                type: Date
            },
            items: [
                {
                    productName: String,
                    quantity: Number,
                    unitPrice: Number,
                    subtotal: Number
                }
            ],
            dailyTotal: Number
        }
    ],
    totalAmount: {
        type: Number,
        default: 0
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    balanceAmount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Invoice", invoiceSchema);