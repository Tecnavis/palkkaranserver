const express = require("express");
const router = express.Router();
const orderController = require("../controller/orderdetails");

// Route to create an order
router.post("/", orderController.createOrder);
router.patch("/:orderId", orderController.updateDateStatus);
router.get('/', orderController.getAllOrders);
router.get('/most-ordered', orderController.getMostOrderedProducts);

router.delete('/:id', orderController.delete);
router.get("/:customerId", orderController.getOrdersByCustomerId);
// Get selected plan details by customer ID
router.get("/selected-plan/:customerId", orderController.getSelectedPlanByCustomer);
// Get product items by customer ID
router.get("/product-items/:customerId", orderController.getProductItemsByCustomer);
router.put("/stop-plan/:orderId", orderController.stopPlan);
router.put("/changeplan", orderController.changePlan)


module.exports = router;
