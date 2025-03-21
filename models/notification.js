const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    deleteAt: {
        type: Date,
        default: function () {
            return this.read ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
        },
        expires: 0 // MongoDB will remove when TTL expires
    }
}); 

module.exports = mongoose.model("Notification", notificationSchema);