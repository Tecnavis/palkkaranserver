// const cron = require("node-cron");
// const OrderProduct = require("../models/orderdetails");
// const { sendMonthlyInvoice } = require("../controller/orderdetails");

// // Run on the 1st of every month at 12:00 AM
// cron.schedule("0 0 9 * *", async () => {
//     try {
//         const customers = await OrderProduct.distinct("customer"); // Get all unique customers
//         for (const customerId of customers) {
//             await sendMonthlyInvoice({ params: { customerId } }, { status: () => ({ json: () => {} }) });
//         }
//         console.log("Monthly invoices sent successfully.");
//     } catch (error) {
//         console.error("Error in sending invoices:", error.message);
//     }
// });

// module.exports = cron;


const cron = require("node-cron");
const OrderProduct = require("../models/orderdetails");
const { sendMonthlyInvoice } = require("../controller/orderdetails");

// Run on the 8th of every month at 9:45 PM IST (Indian Standard Time)
cron.schedule("15 16 8 * *", async () => {
    try {
        const customers = await OrderProduct.distinct("customer"); // Get all unique customers
        for (const customerId of customers) {
            await sendMonthlyInvoice({ params: { customerId } }, { status: () => ({ json: () => {} }) });
        }
        console.log("Monthly invoices sent successfully.");
    } catch (error) {
        console.error("Error in sending invoices:", error.message);
    }
});

module.exports = cron;
