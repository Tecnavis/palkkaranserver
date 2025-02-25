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

exports.getPopular = asyncHandler(async (req, res) => {
    try {
      // Step 1: Aggregate random routes and unwind products
      const randomProducts = await Route.aggregate([
        { $unwind: "$products" }, // Flatten the products array
        { $sample: { size: 6 } }, // Get 6 random products
        {
          $lookup: {
            from: "products", // The collection name in MongoDB
            localField: "products.productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" }, // Flatten product details
        {
          $project: {
            _id: "$productDetails._id",
            title: "$productDetails.title",
            productId: "$productDetails.productId",
            description: "$productDetails.description",
            category: "$productDetails.category",
            coverimage: "$productDetails.coverimage",
            images: "$productDetails.images",
            price: "$productDetails.price",
            discount: "$productDetails.discount",
            quantity: "$productDetails.quantity",
            createdAt: "$productDetails.createdAt",
            updatedAt: "$productDetails.updatedAt",
            routePrice: "$products.routePrice", // Include route price
          },
        },
      ]);
  
      res.status(200).json(randomProducts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  



  //search product
  exports.searchProducts = async (req, res) => {
      try {
          const { query } = req.params;
  
          // Find products that match the search criteria
          const products = await Product.find({
              $or: [
                  { category: { $regex: query, $options: "i" } },
                  { title: { $regex: query, $options: "i" } },
                  { name: { $regex: query, $options: "i" } },
                  { description: { $regex: query, $options: "i" } }
              ]
          });
  
          if (!products.length) {
              return res.status(404).json({ message: "No products found" });
          }
  
          const productIds = products.map((product) => product._id);
  
          // Find routes containing the matching products and populate product details
          const routes = await Route.find({ "products.productId": { $in: productIds } })
              .populate({
                  path: "products.productId",
                  model: "Product"
              });
  
          // Format response to include route details with product information
          const result = routes.map((route) => ({
              routeName: route.name,
              products: route.products
                  .filter((p) => productIds.includes(p.productId._id))
                  .map((p) => ({
                      productId: p.productId._id,
                      productName: p.productId.name,
                      category: p.productId.category,
                      title: p.productId.title,
                      description: p.productId.description,
                      routePrice: p.routePrice
                  }))
          }));
  
          res.status(200).json(result);
      } catch (error) {
          res.status(500).json({ message: "Server error", error });
      }
  };
  