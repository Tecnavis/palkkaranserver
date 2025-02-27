const CustomerCart = require("../models/customercart");
const asyncHandler = require("express-async-handler");

const Route = require('../models/route');

exports.create = async (req, res) => {
  try {
    const { customerId, routeId, productId } = req.body;
    
    // Validate if the route exists and contains the product
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Check if the specific product exists in the route
    const productInRoute = route.products.find(
      p => p.productId.toString() === productId
    );
    
    if (!productInRoute) {
      return res.status(404).json({ 
        message: 'Product not found in this route' 
      });
    }
    
    // Check if the product already exists in the customer's cart
    const existingCartItem = await CustomerCart.findOne({
      customerId,
      routeId,
      productId
    });
    
    if (existingCartItem) {
      // Update quantity if the product is already in the cart
      existingCartItem.quantity += 1;
      await existingCartItem.save();
      return res.status(200).json(existingCartItem);
    }
    
    // Create a new cart item if it doesn't exist
    const newCartItem = new CustomerCart({
      customerId,
      routeId,
      productId,
      quantity: 1,
      routePrice: productInRoute.routePrice // Store the route-specific price
    });
    
    await newCartItem.save();
    res.status(201).json(newCartItem);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const cartItems = await CustomerCart.find({ customerId })
      .populate({
        path: 'routeId',
        select: 'name'
      })
      .populate({
        path: 'productId',
        select: 'title coverimage price'
      });
    
    res.status(200).json(cartItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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


// exports.getByCustomerId = async (req, res) => {
//     try {
//       const customerId = req.params.customerId;
//       const customerCart = await CustomerCart.find({ customerId }).populate('productId');
//       if (!customerCart) {
//         return res.status(404).json({ message: 'Wishlist not found' });
//       }
//       res.json(customerCart);
//     } catch (error) {
//       console.error("Error fetching wishlist:", error);
//       res.status(500).json({ message: 'Server error' });
//     }
//   };


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
