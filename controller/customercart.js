const CustomerCart = require("../models/customercart");
const asyncHandler = require("express-async-handler");
const RouteModel =require("../models/route")

//customer cart  routes
exports.create = async (req, res) => {
  try {
      const { customerId, routeId, productId, quantity } = req.body;

      // Validate request body
      if (!customerId || !routeId || !productId) {
          return res.status(400).json({ message: "customerId, routeId, and productId are required." });
      }

      // Find the route and check if the product exists in the route's product list
      const route = await RouteModel.findById(routeId);
      if (!route) {
          return res.status(404).json({ message: "Route not found." });
      }

      const productExists = route.products.find(item => item.productId.toString() === productId);
      if (!productExists) {
          return res.status(400).json({ message: "Product not found in the selected route." });
      }

      // Check if the product already exists in the customer's cart
      let cartItem = await CustomerCart.findOne({ customerId, productId });
      if (cartItem) {
          cartItem.quantity += quantity || 1; // Increment quantity if item exists
          await cartItem.save();
      } else {
          // Create a new cart entry
          cartItem = new CustomerCart({
              customerId,
              productId,
              quantity: quantity || 1
          });
          await cartItem.save();
      }

      res.status(200).json({ message: "Product added to cart successfully.", cartItem });
  } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

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
