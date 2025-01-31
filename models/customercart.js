const mongoose = require('mongoose');

const customerCartSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        default: 1, // Default quantity is set to 1
        min: 1 // Ensures quantity cannot be less than 1
    }
});

module.exports = mongoose.model('CustomerCart', customerCartSchema)