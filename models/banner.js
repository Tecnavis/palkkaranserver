const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
    images: {
        type: [String], // Store an array of strings (image filenames)
        required: true
    },
    
}, { timestamps: true });

module.exports = mongoose.model("Banner", bannerSchema);