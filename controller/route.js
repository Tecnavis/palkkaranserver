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
        const route = await Route.findByIdAndDelete(req.params.id);
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
        // Fetch all routes and populate productId details
        const routes = await Route.find().populate({
            path: "products.productId",
            select: "title productId description category coverimage images price discount quantity productIdCounter createdAt updatedAt"
        });

        if (!routes.length) {
            return res.status(404).json({ message: "No routes found" });
        }

        // Extract all products with route details
        let allProducts = [];
        routes.forEach(route => {
            const routeData = {
                _id: route._id,
                name: route.name,
                products: route.products.map(p => ({
                    productId: p.productId,
                    routePrice: p.routePrice,
                    _id: p._id
                }))
            };
            allProducts.push(routeData);
        });

        // Shuffle and get 6 random routes
        const shuffledProducts = allProducts.sort(() => 0.5 - Math.random()).slice(0, 6);

        res.status(200).json(shuffledProducts);
    } catch (error) {
        console.error("Error fetching random products:", error);
        res.status(500).json({ message: "Server error", error });
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
                      routeName: route.name, 
                      products: matchingProducts.map(p => ({
                          productDetails: p.productId,
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
  