const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    planType: {
        type: String,
        enum: ["daily", "custom", "weekly", "alternative", "monthly"],
        required: true
    },
    dates: {
        type: [Date], // Array of dates for custom, weekly, alternative, or monthly plans
        default: []
    },
    leaves: {
        type: [Date], // Dates on which the customer has applied for leave
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true, 
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Plan", planSchema);
