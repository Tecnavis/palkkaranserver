const asyncHandler = require("express-async-handler");
const Product = require("../models/product");
const mongoose = require('mongoose');
const Category = require("../models/category"); // Assuming you have a Category model
const Route = require("../models/route");
// Function to generate new product ID
const generateProductId = async () => {
    const updatedProduct = await Product.findOneAndUpdate(
      {}, // Query (match any document; ideally this would use a dedicated document)
      { $inc: { productIdCounter: 1 } }, // Increment counter
      { new: true, upsert: true } // Create if not exists, return updated document
    );
  
    // Construct the new productId based on the counter
    const nextId = updatedProduct.productIdCounter.toString().padStart(7, "0");
    return `PR-ID${nextId}`;
  };
  
  

  exports.create = asyncHandler(async (req, res) => {
    const { title, category, price, description, quantity, discount } = req.body;
  
    if (!title || !category || !price || !description || !quantity ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }
  
    const newProductId = await generateProductId();
  
    // Fetch the category name
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      });
    }
  
    const categoryName = categoryDoc.name;
  
    // const images = req.files["images"]
    //   ? req.files["images"].map((file) => file.filename)
    //   : [];
    // // const coverImage = req.files["coverimage"]
    // //   ? req.files["coverimage"][0].filename
    // //   : null;


          const  coverImage = req.cloudinaryImageUrl || null;

  
    const productData = {
      category: categoryName, // Save the name instead of the ID
      coverimage: coverImage,
      price: parseFloat(price),
      productId: newProductId,
      title,
      description,
      quantity,
      discount,
    };
  
    try {
      const product = await Product.create(productData);
      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });
  

//get all products
exports.getAll = asyncHandler(async (req, res) => {
  const products = await Product.find();
  res.status(200).json(products);
});

//get by Id
exports.get = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.status(200).json(product);
});

//update product
exports.update = asyncHandler(async (req, res) => {
    try {
   


      const updates = req.body;
    
  
        if (req.cloudinaryImageUrl) {
          updates.coverimage = req.cloudinaryImageUrl;
        }
      
  
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: req.params.id },
        { $set: updates },
        { new: true, runValidators: true }
      );
  
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      res.status(200).json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res
        .status(500)
        .json({ message: "Failed to update product", error: error.message });
    }
  });
  

  exports.deleteProduct = asyncHandler(async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Remove the deleted product from all routes
        await Route.updateMany(
            { "products.productId": req.params.id },
            { $pull: { products: { productId: req.params.id } } }
        );

        res.status(200).json({ message: "Product deleted successfully and removed from all routes" });
    } catch (error) {
        console.error("Error deleting product:", error.message);
        res.status(500).json({ message: "Failed to delete product", error: error.message });
    }
});

  //
  exports.getProductsByCategory = async (req, res) => {
    const { categoryName } = req.params;

    try {
        // Check if the category exists
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Fetch products associated with the category name
        const products = await Product.find({ category: categoryName });

        if (products.length === 0) {
            return res.status(404).json({ message: "No products found for this category" });
        }

        res.status(200).json({ category, products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};



// Search products by title
exports.searchProducts = async (req, res) => {
  try {
      const { query } = req.params;

      // Case-insensitive search for matching category, title, or description
      const products = await Product.find({
          $or: [
              { title: { $regex: query, $options: "i" } },
              { category: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } }
          ]
      });

      res.status(200).json(products);
  } catch (error) {
      res.status(500).json({ message: "Error searching products", error: error.message });
  }
};

// Get 6 random products
exports.getPopular = asyncHandler(async (req, res) => {
  const randomProducts = await Product.aggregate([{ $sample: { size: 6 } }]);
  res.status(200).json(randomProducts);
});

