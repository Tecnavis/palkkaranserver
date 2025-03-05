const express = require("express");
const router = express.Router();
const orderController = require("../controller/orderdetails");

// Route to create an order
router.post("/", orderController.createOrder);
// Route to update date and status to deliver
router.patch("/:orderId", orderController.updateDateStatus);
// Route to update date and status to pending
router.patch("/pending/:orderId", orderController.updateDateStatusToPending);

router.get('/', orderController.getAllOrders);
router.get('/most-ordered', orderController.getMostOrderedProducts);

router.delete('/:id', orderController.delete);
router.get("/:customerId", orderController.getOrdersByCustomerId);

// Get selected plan details by customer ID
router.get("/selected-plan/:customerId", orderController.getSelectedPlanByCustomer);//
// Get product items by customer ID
router.get("/product-items/:customerId", orderController.getProductItemsByCustomer);
router.put("/stop-plan/:orderId", orderController.stopPlan);
router.put("/changeplan", orderController.changePlan)
router.post("/send-invoice",orderController.sendInvoiceEmail);
router.get("/orders/:routeNo", orderController.getOrdersByRoute);
//tomorrow orders
router.get("/tomorrow-orders/routes", orderController.getTomorrowOrders);
//today orders
router.get("/today-orders/routes", orderController.getTodayOrders);

router.get("/invoices/:customerId", orderController.getCustomerInvoices);


// In your routes file
router.get("/orders/customer/:customerId", orderController.getOrdersByCustomerId);
router.put('/orders/:customerId/returned-bottles', orderController.updateReturnedBottlesByCustomer);

// Get bottles summary for a customer
router.get('/customers/:customerId/bottles-summary', orderController.getCustomerBottlesSummary);
//Get bottles summary for all customers
router.get('/bottles-summary/allcustomerdetails', orderController.getBottlesSummary);

module.exports = router;
