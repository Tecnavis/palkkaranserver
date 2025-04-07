const express = require("express");
const router = express.Router();
const rewardController = require("../controller/reward");

router.post("/:id/readeem/:rewardItem", rewardController.createReward);
router.get("/", rewardController.getAllRewards);
router.get("/:id", rewardController.getRewardById);
router.put("/:id", rewardController.updateReward);
router.delete("/:id", rewardController.deleteReward);
router.get("/history/:id", rewardController.getRewardByCustomerId);



module.exports = router;
