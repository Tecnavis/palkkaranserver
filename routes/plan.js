const express = require("express");
const router = express.Router();
const Controller = require("../controller/plan");

// Route to create a plan
router.post("/", Controller.createPlan);

// Route to get all plans with customer details
router.get("/", Controller.getPlans);
// Route to get plans by customer ID
router.get("/customer/:customerId", Controller.getPlansByCustomerId);

router.put("/:planId/stop", Controller.stopDailyPlan);

// Route to apply leave
router.post("/leave", Controller.applyLeave);

module.exports = router;
