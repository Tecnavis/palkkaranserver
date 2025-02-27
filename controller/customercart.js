const CustomerCart = require("../models/customercart");
const asyncHandler = require("express-async-handler");
const Route = require('../models/route');
const Customer = require('../models/customer');

exports.create = asyncHandler(async (req, res) => {
  const { customerId, productId } = req.body;

  // Validate input fields
  if (!customerId || !productId) {
    return res.status(400).json({ message: "Please add all fields" });
  }

  // Check if the product already exists in the customer's cart
  const existingCartItem = await CustomerCart.findOne({ customerId, productId });

  if (existingCartItem) {
    return res.status(400).json({ message: "Product is already in the cart" });
  }

  // Create new cart entry
  const customerCart = await CustomerCart.create(req.body);

  // Populate the required details
  const cartWithDetails = await CustomerCart.findById(customerCart._id)
    .populate({
      path: 'customerId',
      select: 'name email' // Select only necessary fields from Customer
    })
    .populate({
      path: 'productId',
      select: 'name products routePrice',
      populate: {
        path: 'products.productId',
        select: 'category coverimage title routePrice' // Select product name if needed
      }
    });

  // Extract the correct product details
  const selectedProduct = cartWithDetails.productId.products.find(
    (product) => product.productId.toString() === productId
  );

  if (!selectedProduct) {
    return res.status(404).json({ message: "Product not found in route" });
  }

  // Construct response
  const response = {
    _id: cartWithDetails._id,
    customerDetails: {
      _id: cartWithDetails.customerId._id,
      name: cartWithDetails.customerId.name,
      email: cartWithDetails.customerId.email
    },
    product: {
      productId: selectedProduct.productId._id,
      routePrice: selectedProduct.routePrice,
      _id: selectedProduct._id
    },
    quantity: cartWithDetails.quantity
  };

  res.status(200).json(response);
});

//customer cart  routes
// exports.create = asyncHandler(async (req, res) => {
//   const { customerId, productId } = req.body;

//   // Validate input fields
//   if (!customerId || !productId) {
//       return res.status(400).json({ message: "Please add all fields" });
//   }

//   // Check if the product already exists in the customer's cart
//   const existingCartItem = await CustomerCart.findOne({ customerId, productId });

//   if (existingCartItem) {
//       // If product is already in the cart, send a message
//       return res.status(400).json({ message: "Product is already in the cart" });
//   }

//   // If product is not in the cart, add it
//   const customerCart = await CustomerCart.create(req.body);

//   res.status(200).json(customerCart);
// });


exports.getByCustomerId = async (req, res) => {
    try {
      const customerId = req.params.customerId;
      const customerCart = await CustomerCart.find({ customerId }).populate('productId');
      if (!customerCart) {
        return res.status(404).json({ message: 'Wishlist not found' });
      }
      res.json(customerCart);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: 'Server error' });
    }
  };


  //delete customer cart
  exports.delete = asyncHandler(async (req, res) => {
    const customerCart = await CustomerCart.findByIdAndDelete(req.params.id);
    res.status(200).json(customerCart);
})

// Update cart quantity
exports.updateCartQuantity = async (req, res) => {
    const { cartId } = req.params; // ID of the cart item
    const { quantity } = req.body; // New quantity value

    if (!quantity || quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    try {
        const updatedCartItem = await CustomerCart.findByIdAndUpdate(
            req.params.id,
            { quantity },
            { new: true } // Return the updated document
        );

        if (!updatedCartItem) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        res.status(200).json({
            message: 'Cart quantity updated successfully',
            cartItem: updatedCartItem,
        });
    } catch (error) {
        console.error('Error updating cart quantity:', error.message);
        res.status(500).json({ message: 'An error occurred while updating the cart quantity' });
    }
};
