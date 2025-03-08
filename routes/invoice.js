const express = require("express");
const router = express.Router();
const { generateInvoiceForCustomer } = require("../controller/invoice");

router.post("/generate-invoice/:customerId", async (req, res) => {
    const { customerId } = req.params;
    const result = await generateInvoiceForCustomer(customerId);
    res.json(result);
});

module.exports = router;
