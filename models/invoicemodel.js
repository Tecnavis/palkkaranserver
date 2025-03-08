const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    orderdetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderProduct",
        required: true
    },
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