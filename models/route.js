const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        routePrice: {
            type: Number,
            required: true
        }
    }]
});

module.exports = mongoose.model("Route", routeSchema);
