const mongoose = require('mongoose');

const customerCartSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1
    },
    routePrice: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('CustomerCart', customerCartSchema)