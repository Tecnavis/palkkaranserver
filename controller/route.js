const Route = require("../models/route");
const Product = require("../models/product");
const asyncHandler = require("express-async-handler");
// Create a new route with selected products and store route-specific prices
exports.create = async (req, res) => {
    try {
        const { name, products } = req.body;
        
        if (!name || !products || !Array.isArray(products)) {
            return res.status(400).json({ message: "Invalid input data" });
        }

        let route = await Route.findOne({ name });

        if (!route) {
            // Create a new route if it doesn't exist
            route = new Route({ name, products: [] });
        }

        // Update existing products or add new ones
        products.forEach(({ productId, price }) => {
            const existingProduct = route.products.find(p => p.productId.toString() === productId);
            if (existingProduct) {
                existingProduct.routePrice = price; // Update price if product exists
            } else {
                route.products.push({ productId, routePrice: price }); // Add new product
            }
        });

        await route.save();
        res.status(201).json({ message: "Products saved successfully", route });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


exports.getAll = async (req, res) => {
    try {
        const routes = await Route.find().populate("products.productId");

        res.status(200).json({ routes });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


exports.get = async (req, res) => {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }
        res.status(200).json({ route });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update route details (name, products, routePrice)
exports.update = async (req, res) => {
    try {
        const routeId = req.params.id;
        const { name, products } = req.body;
        
        // Find the route
        const route = await Route.findById(routeId);
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        // Update the route name if provided
        if (name) {
            route.name = name;
        }

        // If products are provided, update them
        if (products && Array.isArray(products)) {
            // Extract productIds from the request
            const productIds = products.map(p => p.productId);

            // Validate that all product IDs exist
            const productList = await Product.find({ _id: { $in: productIds } });
            if (productList.length !== productIds.length) {
                return res.status(404).json({ message: "Some products not found" });
            }
            
            // Set the route's products array with route-specific prices
            route.products = products.map(p => ({
                productId: p.productId,
                routePrice: p.price
            }));
        }

        // Save the updated route
        const updatedRoute = await route.save();
        res.status(200).json({ message: "Route updated successfully", route: updatedRoute });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.delete = async (req, res) => {
    try {
    
      const { id, productId } = req.params;


      const route = await Route.findByIdAndUpdate(
          id,
          { $pull: { products: { productId: productId } } }, 
          { new: true } 
      );
        
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }
        res.status(200).json({ message: "Route deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.deleteAll = async (req, res) => {
    try {
      
        await Route.deleteMany({});
        res.status(200).json({ message: "All routes deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//get allproduct by route name
exports.getRoute =  async (req, res) => {
    try {
        const { name } = req.params;
        const route = await Route.findOne({ name }).populate("products.productId");

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        res.status(200).json(route);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

//popular product

exports.getPopular = async (req, res) => {
    try {
      // Aggregate pipeline to get random route products
      const randomRouteProducts = await Route.aggregate([
        // Unwind the products array to get individual products
        { $unwind: "$products" },
        // Lookup to get the product details
        {
          $lookup: {
            from: "products", // Assuming your product collection is named "products"
            localField: "products.productId",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        // Unwind the productDetails array
        { $unwind: "$productDetails" },
        // Project only the needed fields
        {
          $project: {
            _id: 1,
            name: 1,
            "products.routePrice": 1,
            "products._id": 1,
            productDetails: 1
          }
        },
        // Get random documents
        { $sample: { size: 6 } }
      ]);
  
      // Format the response
      const formattedResponse = randomRouteProducts.map(item => ({
        _id: item._id,
        name: item.name,
        products: [{
          productId: item.productDetails,
          routePrice: item.products.routePrice,
          _id: item.products._id
        }]
      }));
  
      res.status(200).json({
        success: true,
        count: formattedResponse.length,
        data: formattedResponse
      });
    } catch (error) {
      console.error('Error fetching random route products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch random route products',
        error: error.message
      });
    }
  };

  //search product
  
  exports.searchProducts = async (req, res) => {
      try {
          const { query } = req.params;
  
          // Find routes that contain products matching the search query
          const routes = await Route.find()
              .populate({
                  path: "products.productId",
                  match: {
                      $or: [
                          { category: { $regex: query, $options: "i" } },
                          { title: { $regex: query, $options: "i" } },
                          { name: { $regex: query, $options: "i" } },
                          { description: { $regex: query, $options: "i" } }
                      ]
                  }
              });
  
          // Filter out routes that have no matching products
          const filteredRoutes = routes
              .map(route => {
                  const matchingProducts = route.products.filter(p => p.productId);
                  return matchingProducts.length ? { 
                    _id: route._id,
                      routeName: route.name, 
                      products: matchingProducts.map(p => ({
                          productId: p.productId,
                          routePrice: p.routePrice
                      }))
                  } : null;
              })
              .filter(route => route !== null);
  
          if (!filteredRoutes.length) {
              return res.status(404).json({ message: "No products found" });
          }
  
          res.status(200).json(filteredRoutes);
      } catch (error) {
          res.status(500).json({ message: "Server error", error });
      }
  };
  



  //get allproduct by category name



exports.getRouteProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    // Validate category parameter
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required'
      });
    }

    // Aggregate pipeline to find route products by category
    const routeProductsByCategory = await Route.aggregate([
      // Unwind the products array to get individual products
      { $unwind: "$products" },
      // Lookup to get the product details
      {
        $lookup: {
          from: "products", // Collection name for products
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      // Unwind the productDetails array
      { $unwind: "$productDetails" },
      // Match documents by category
      {
        $match: {
          "productDetails.category": category
        }
      },
      // Group back by route
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          products: {
            $push: {
              productId: "$productDetails",
              routePrice: "$products.routePrice",
              _id: "$products._id"
            }
          }
        }
      }
    ]);

    if (routeProductsByCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No route products found for category: ${category}`
      });
    }

    res.status(200).json({
      success: true,
      count: routeProductsByCategory.length,
      data: routeProductsByCategory
    });
  } catch (error) {
    console.error('Error fetching route products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route products by category',
      error: error.message
    });
  }
};


exports.getMostSellingProducts = async (req, res) => {
  try {
      // Find routes and populate product details
      const routes = await Route.aggregate([
          // Unwind the products array to work with individual products
          { $unwind: "$products" },
          // Lookup to get product details
          {
              $lookup: {
                  from: "products",
                  localField: "products.productId",
                  foreignField: "_id",
                  as: "products.productDetails"
              }
          },
          // Unwind the productDetails array
          {
              $addFields: {
                  "products.productDetails": { $arrayElemAt: ["$products.productDetails", 0] }
              }
          },
          // Group back by route
          {
              $group: {
                  _id: "$_id",
                  name: { $first: "$name" },
                  products: { 
                      $push: {
                          _id: "$products._id",
                          routePrice: "$products.routePrice",
                          productId: "$products.productDetails"
                      }
                  }
              }
          },
          // Sort by number of products (optional)
          { $sort: { "products.length": -1 } }
      ]);

      res.status(200).json({
          success: true,
          count: routes.length,
          data: routes
      });
  } catch (error) {
      console.error('Error fetching most selling products:', error);
      res.status(500).json({
          success: false,
          message: 'Server Error',
          error: error.message
      });
  }
};