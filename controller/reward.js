const Reward = require("../models/reward");
const CustomerModel = require("../models/customer");
const Rewarditem = require("../models/rewarditem");



// CREATE
exports.createReward = async (req, res) => {
    try {
      const { id, rewardItem } = req.params;
  
      const findACustomer = await CustomerModel.findById(id);
      const findAReward = await Rewarditem.findById(rewardItem);
  
      if (!findACustomer || !findAReward) {
        return res.status(404).json({ error: "Customer or Reward item not found" });
      }
  
      // Check if customer has enough points
      if (findACustomer.point < findAReward.points) {
        return res.status(400).json({ error: "Not enough points" });
      }
  
      // Decrease stock and points
      if (findAReward.stock > 1) {
        findAReward.stock -= 1;
        findACustomer.point -= findAReward.points;
  
        await findAReward.save();
        await findACustomer.save();
      } else if (findAReward.stock === 1) {
        // Final item: reduce points, delete reward item
        findACustomer.point -= findAReward.points;
        await findACustomer.save();
        await Rewarditem.findByIdAndUpdate(
          rewardItem,
          { isDelete: true },
          { new: true }
        );
      } else {
        return res.status(400).json({ error: "Out of stock" });
      }
  
      // Create reward record
      const newReward = new Reward({ rewardItem, costomer: id });
      await newReward.save();
  
      res.status(201).json(newReward);
    } catch (error) {
      res.status(500).json({ error: "Failed to create reward", details: error.message });
    }
  };
  

// READ ALL
exports.getAllRewards = async (req, res) => {
  try {
    const rewards = await Reward.find()
      .populate("rewardItem")
      .populate("costomer");
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rewards", details: error.message });
  }
};

// READ SINGLE
exports.getRewardById = async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id)
      .populate("rewardItem")
      .populate("costomer");

    if (!reward) return res.status(404).json({ error: "Reward not found" });

    res.json(reward);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reward", details: error.message });
  }
};


// get costemer reward history

exports.getRewardByCustomerId = async (req, res) => {
    try {
      const reward = await Reward.find()
        .populate("rewardItem")
        .populate("costomer");
  
      if (!reward) return res.status(404).json({ error: "Reward history not found" });

      const filteredRedeamHistory = reward.filter(item => 
        item.costomer && item.costomer._id.toString() === req.params.id
      );
      
  
      res.json(filteredRedeamHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reward", details: error.message });
    }
  };


// UPDATE
exports.updateReward = async (req, res) => {
  try {
    const { rewardItem, costomer } = req.body;

    const updatedReward = await Reward.findByIdAndUpdate(
      req.params.id,
      { rewardItem, costomer },
      { new: true }
    );

    if (!updatedReward) return res.status(404).json({ error: "Reward not found" });

    res.json(updatedReward);
  } catch (error) {
    res.status(500).json({ error: "Failed to update reward", details: error.message });
  }
};

// DELETE
exports.deleteReward = async (req, res) => {
  try {
    const deleted = await Reward.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ error: "Reward not found" });

    res.json({ message: "Reward deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete reward", details: error.message });
  }
};
