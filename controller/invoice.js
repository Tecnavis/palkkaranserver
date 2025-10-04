const invoiceModel = require("../models/invoice");

exports.getInvoiceAll = async (req, res) => {
  try {
    const invoice = await invoiceModel.find().populate("customerId");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json(invoice);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getInvoiceDate = async (req, res) => {
  try {
      const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();    

    const invoice = await invoiceModel.find({
      invoMonth: targetMonth,
      invoYear: targetYear,
    }).populate("customerId");

      if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    
    return res.status(200).json(invoice);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getInvoiceId = async (req, res) => {
  try {

  
    const { customerId,  date  } = req.params;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();


    const invoice = await invoiceModel.findOne({
      customerId: customerId,
      invoMonth: targetMonth,
      invoYear: targetYear,
    }).populate("customerId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }


    return res.status(200).json(invoice);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};


exports.updateInvoiceStatus = async (req, res) => {
   const { customerId } = req.params;
    const   date  = req.body.monthStart;    

      if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0–11

    // Get current month invoice
    const invoice = await invoiceModel.findOne({
      customerId: customerId,
      invoMonth: targetMonth,
      invoYear: targetYear,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

     invoice.status = "paid";
     invoice.getAmount = invoice.monthAmount;
      invoice.getBalance = 0;
      invoice.payBalance = 0;

    invoice.save();
    return res.status(200).json({ message: "Invoice updated" });


}

exports.updateInvoiceId = async (req, res) => {
  try {

    
    const  id  = req.params.customerId;
    const { amount, date } = req.body;

    
    


    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0–11

    // Get current month invoice
    const invoice = await invoiceModel.findOne({
      customerId: id,
      invoMonth: targetMonth,
      invoYear: targetYear,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Get all previous invoices for this customer (ordered by month)
    const previousInvoices = await invoiceModel
      .find({
        customerId: id,
        invoYear: targetYear,
        invoMonth: { $lt: targetMonth },
      })
      .sort({ invoMonth: 1 });

    // Calculate available balance from previous months
    let previousBalance = 0;
    for (const prev of previousInvoices) {
      previousBalance += (prev.payBalance || 0) - (prev.getBalance || 0);
      // Close previous month if fully paid
      if (previousBalance > 0) {
        prev.status = "paid";
        prev.getBalance = 0;
        prev.payBalance = 0;
        await prev.save();
      }
    }

    // Total available amount to cover current month
    let totalPayment = amount + previousBalance;

    if (totalPayment < invoice.monthAmount) {
      // Partial payment → still owes
      invoice.getAmount = totalPayment;
      invoice.getBalance = invoice.monthAmount - totalPayment;
      invoice.payBalance = 0;
      invoice.status = "not close";
    } else {
      // Fully paid or overpaid
      invoice.getAmount = invoice.monthAmount;
      invoice.getBalance = 0;
      invoice.payBalance = totalPayment - invoice.monthAmount;
      invoice.status = "paid";
    }

    await invoice.save();

    return res.status(200).json({ message: "Invoice updated", invoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
