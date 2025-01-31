const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
      },
      productId: { type: String, required: true, unique: true },
      description: {
        type: String,
        required: true,
      },
      category: {
        type:String,
        required: true,
      },
      coverimage: { type: String, required: true },
      images: { type: [String], required: true },
      price: {
        type: Number,
        required: true,
      },
      discount: {
        type: String,
      },
      quantity: {
        type: String,
        required: true,
      },
      productIdCounter: { type: Number, default: 0 }, // Internal counter
    },
    { timestamps: true }
  );
  
  module.exports = mongoose.model("Product", productSchema);
  

