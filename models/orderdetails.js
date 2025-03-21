const mongoose = require("mongoose");

const orderProductSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    // routeprice: { type: Number, required: true },
    productItems: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, required: true },
            routePrice: { type: Number, required: true },
        },
    ],
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    selectedPlanDetails: {
        planType: { type: String },
        dates: [
            {
                date: { type: Date, required: true },
                status: { type: String, default: "pending" },
            },
        ],
        isActive: { type: Boolean, default: true },
    },
    address: {
        postcode: { type: String },
        streetAddress: { type: String },
        apartment: { type: String },
    },
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    paidamount: { type: Number},
    Total: { type: Number, default: 0 },
    paymentStatus: { type: String, default: "unpaid" },
    planisActive: { type: Boolean, default: true },
    bottles: { type: Number, default: 0 },//total bottles
    returnedBottles: { type: Number, default: 0 },//returned bottles
    pendingBottles: { type: Number, default: 0 },//(total bottles-returned bottles)
}, { timestamps: true });


module.exports = mongoose.model("OrderProduct", orderProductSchema);
