const express = require("express");
const router = express.Router();
const Invoice = require("../models/invoicemodel");

// Get invoices by customerId
router.get("/invoices/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;
        
        // Fetch invoices for the given customerId
        const invoices = await Invoice.find({ customerId })
            .populate("customerId") // Populate customer details if needed
            .populate("orderdetails"); // Populate order details if needed

        if (!invoices.length) {
            return res.status(404).json({ message: "No invoices found for this customer." });
        }

        res.status(200).json(invoices);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

module.exports = router;
