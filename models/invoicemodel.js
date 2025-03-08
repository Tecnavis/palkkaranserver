const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
        unique: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    orderDetails: [
        {
            orderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "OrderProduct"
            },
            productItems: [
                {
                    product: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "Product"
                    },
                    quantity: Number,
                    routePrice: Number
                }
            ],
            totalAmount: Number
        }
    ],
    totalAmount: {
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
