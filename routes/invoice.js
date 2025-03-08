const express = require("express");
const router = express.Router();
const invoiceController = require("../controller/invoice");

// Generate monthly invoices
router.get("/generate", invoiceController.generateMonthlyInvoices);

// Get all invoices
router.get("/", invoiceController.getAllInvoices);

// Get invoice by ID
router.get("/:id", invoiceController.getInvoiceById);

// Get invoices by customer ID
router.get("/customer/:customerId", invoiceController.getInvoicesByCustomer);

module.exports = router;