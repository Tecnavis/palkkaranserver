const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
    },
    orderItems: {
        type: Array
    },
    monthAmount: {
    type: Number,
    required: true
    },
    getAmount: {
    type: Number,
    },
    getBalance: {
    type: Number,
    },
    payBalance: {
    type: Number,
    },
    total: {
     type: Number,
    },
    status: {
        type: String,
        default: "un paid"
    },
    invoMonth: {
        type: String
    },
     invoYear: {
        type: String
    },
    paymentType: {
        type: String
    }

}, {timestamps: true}); 

module.exports = mongoose.model("invoice", invoiceSchema);