const mongoose = require("mongoose");
const customer = require("./customer");

const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model("Notification", notificationSchema);