const Rewarditem = require("../models/rewarditem");

// Create a new reward item
const createRewardItem = async (req, res) => {
  try {

    const { title, stock, category, description, points } = req.body;
    const image = req.file ? req.file.filename : null;
    
    const newItem =  await new Rewarditem({
        title,
        stock,
        category,
        description,
        points,
        image
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all reward items
const getAllRewardItems = async (req, res) => {
  try {

    const items = await Rewarditem.find().populate("category");
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get pecific rewards reward items
const getASpecificRewards = async (req, res) => {
  try {
    const { routeno } = req.params;


    // Get all reward items with populated category
    const allItems = await Rewarditem.find().populate("category");

    // Filter those where the populated category name matches the param
    const filteredItems = allItems.filter(item => 
      item.category && item.category.name === routeno
    );

    res.status(200).json(filteredItems);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


// Get a single reward item by ID
const getRewardItemById = async (req, res) => {
  try {
    const item = await Rewarditem.findById(req.params.id).populate("categories");
    if (!item) {
      return res.status(404).json({ error: "Reward item not found" });
    }
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a reward item by ID
const updateRewardItem = async (req, res) => {
  
    try {
      const { title, stock, category, description, points } = req.body;
  
      const updatedData = {
        title,
        stock,
        category,
        description,
        points,
      };
  
      // If new image was uploaded, add it
      if (req.file) {
        updatedData.image = req.file.filename;
      }
  
      const updatedItem = await Rewarditem.findByIdAndUpdate(
        req.params.id,
        updatedData,
        { new: true }
      );
  
      if (!updatedItem) {
        return res.status(404).json({ error: "Reward item not found" });
      }
  
      res.status(200).json(updatedItem);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  

// Delete a reward item by ID
const deleteRewardItem = async (req, res) => {
  try {
    const deletedItem = await Rewarditem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: "Reward item not found" });
    }
    res.status(200).json({ message: "Reward item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createRewardItem,
  getAllRewardItems,
  getRewardItemById,
  updateRewardItem,
  deleteRewardItem,
  getASpecificRewards, 
};
