const mongoose = require('mongoose');

const maincategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('MainCategory', maincategorySchema)