const CustomerCart = require("../models/customercart");
const Route = require("../models/route");
const asyncHandler = require("express-async-handler");

//customer cart  routes

exports.create = asyncHandler(async (req, res) => {
  const { customerId, routeId, productId } = req.body;

  // Validate input fields
  if (!customerId || !routeId || !productId) {
      return res.status(400).json({ message: "Please add all fields" });
  }

  // Fetch the route details
  const route = await Route.findById(routeId);
  if (!route) {
      return res.status(404).json({ message: "Route not found" });
  }

  // Find the specific product in the route
  const productDetails = route.products.find(p => p.productId.toString() === productId);
  if (!productDetails) {
      return res.status(404).json({ message: "Product not found in the selected route" });
  }

  // Check if the product already exists in the customer's cart
  const existingCartItem = await CustomerCart.findOne({ customerId, routeId, productId });
  if (existingCartItem) {
      return res.status(400).json({ message: "Product is already in the cart" });
  }

  // Add product to the cart
  const customerCart = await CustomerCart.create({
      customerId,
      routeId,
      productId,
      routePrice: productDetails.routePrice, // Store product price from route
      quantity: 1
  });

  res.status(200).json(customerCart);
});

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


exports.getByCustomerId = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  // Validate input
  if (!customerId) {
      return res.status(400).json({ message: "Customer ID is required" });
  }

  // Fetch cart items with customer, route, and product details
  const cartItems = await CustomerCart.find({ customerId })
      .populate({
          path: "customerId",
          select: "name email phone" // Fetch selected customer details
      })
      .populate({
          path: "routeId",
          select: "name" // Fetch route name
      })
      .populate({
          path: "productId",
          select: "name price productId image coverimage title description category discount quantity" // Fetch product details
      });

  if (!cartItems.length) {
      return res.status(404).json({ message: "No cart items found for this customer" });
  }

  res.status(200).json(cartItems);
});
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
