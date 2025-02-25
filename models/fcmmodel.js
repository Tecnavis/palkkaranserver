const mongoose = require("mongoose");

const fcmSchema = new mongoose.Schema({
    fcmtoken: {
        type: String,
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    message: {
        type: String,
        required: true
    }

});

module.exports = mongoose.model("FCM", fcmSchema);