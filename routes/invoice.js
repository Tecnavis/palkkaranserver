const express = require("express");
const router = express.Router();
const { createInvoice } = require("../controller/invoice");

router.post("/generate-invoice/:customerId", async (req, res) => {
    const { customerId } = req.params;

    const response = await createInvoice(customerId);
    return res.json(response);
});

module.exports = router;
