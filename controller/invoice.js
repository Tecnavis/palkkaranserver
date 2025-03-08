const mongoose = require("mongoose");
const Invoice = require("../models/invoicemodel");
const Customer = require("../models/customer");
const OrderProduct = require("../models/orderdetails");

// Helper function to group orders by month
const groupOrdersByMonth = (orders) => {
  const monthlyOrders = {};
  
  orders.forEach(order => {
    const deliveredDates = order.selectedPlanDetails.dates.filter(date => date.status === "delivered");
    
    deliveredDates.forEach(deliveredDate => {
      const date = new Date(deliveredDate.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyOrders[monthYear]) {
        monthlyOrders[monthYear] = [];
      }
      
      // Create an order entry for this delivered date
      const orderForDate = {
        date: deliveredDate.date,
        productItems: order.productItems,
        totalPrice: order.totalPrice,
        customer: order.customer
      };
      
      monthlyOrders[monthYear].push(orderForDate);
    });
  });
  
  return monthlyOrders;
};

// Generate invoice for customer orders by month
exports.generateMonthlyInvoices = async (req, res) => {
  try {
    const { customerId, month, year } = req.query;
    
    if (!customerId) {
      return res.status(400).json({ success: false, message: "Customer ID is required" });
    }
    
    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    
    // Find all orders for this customer
    const customerOrders = await OrderProduct.find({ "customer._id": customerId });
    if (!customerOrders || customerOrders.length === 0) {
      return res.status(404).json({ success: false, message: "No orders found for this customer" });
    }
    
    const monthlyOrderGroups = groupOrdersByMonth(customerOrders);
    
    // If specific month requested, only process that month
    const monthsToProcess = month && year 
      ? [`${year}-${String(month).padStart(2, '0')}`]
      : Object.keys(monthlyOrderGroups);
    
    const generatedInvoices = [];
    
    for (const monthYear of monthsToProcess) {
      if (!monthlyOrderGroups[monthYear]) {
        continue;
      }
      
      const [year, month] = monthYear.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('default', { month: 'long' });
      
      // Calculate totals
      let totalInvoiceAmount = 0;
      const orderItems = [];
      
      monthlyOrderGroups[monthYear].forEach(order => {
        totalInvoiceAmount += order.totalPrice;
        
        // Track daily details
        orderItems.push({
          date: new Date(order.date),
          items: order.productItems.map(item => ({
            productName: item.product.title,
            quantity: item.quantity,
            unitPrice: item.routePrice,
            subtotal: item.quantity * item.routePrice
          })),
          dailyTotal: order.totalPrice
        });
      });
      
      // Check if invoice already exists for this month/year and customer
      const existingInvoice = await Invoice.findOne({
        customerId: customerId,
        "invoicePeriod.month": parseInt(month),
        "invoicePeriod.year": parseInt(year)
      });
      
      if (existingInvoice) {
        generatedInvoices.push(existingInvoice);
        continue;
      }
      
      // Calculate balance amount (total - paid)
      const paidAmount = customer.paidAmounts
        .filter(payment => {
          const paymentDate = new Date(payment.date);
          return payment.isGet && 
                 paymentDate.getMonth() + 1 === parseInt(month) && 
                 paymentDate.getFullYear() === parseInt(year);
        })
        .reduce((total, payment) => total + payment.amount, 0);
      
      const balanceAmount = totalInvoiceAmount - paidAmount;
      
      // Create new invoice document
      const newInvoice = new Invoice({
        invoiceId: `INV-${customer.customerId}-${year}${month}`,
        customerId: customerId,
        customerDetails: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address[0] || {},
          customerId: customer.customerId,
          routeNo: customer.routeno
        },
        invoicePeriod: {
          month: parseInt(month),
          year: parseInt(year),
          monthName: monthName
        },
        orderItems: orderItems,
        totalAmount: totalInvoiceAmount,
        paidAmount: paidAmount,
        balanceAmount: balanceAmount,
        createdAt: new Date()
      });
      
      await newInvoice.save();
      generatedInvoices.push(newInvoice);
    }
    
    return res.status(200).json({
      success: true,
      data: generatedInvoices
    });
  } catch (error) {
    console.error("Error generating invoices:", error);
    return res.status(500).json({
      success: false, 
      message: "Error generating invoices",
      error: error.message
    });
  }
};

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find();
    return res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching invoices",
      error: error.message
    });
  }
};

// Get invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching invoice",
      error: error.message
    });
  }
};

// Get invoices by customer ID
exports.getInvoicesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const invoices = await Invoice.find({ customerId });
    
    return res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching customer invoices",
      error: error.message
    });
  }
};