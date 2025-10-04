// const cron = require("node-cron");
// const OrderProduct = require("../models/orderdetails");
// const { sendMonthlyInvoice } = require("../controller/orderdetails");

// // Run on the 1st of every month at 12:00 AM
// cron.schedule("0 0 1 * *", async () => {
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
const Notification = require("../models/notification");
const getLastMonthRange = () => {
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: firstDayLastMonth, end: firstDayThisMonth };
};

// Run on the 9th of every month at 12:00 AM
cron.schedule("0 0 1 * *", async () => {
    try {
        const { start, end } = getLastMonthRange();
        
        // Find customers who had orders last month
        const customersWithOrders = await OrderProduct.distinct("customer", {
            "selectedPlanDetails.dates.date": { $gte: start, $lt: end },
            "selectedPlanDetails.dates.status": "delivered"
        });

        if (!customersWithOrders.length) {
            return;
        }

        for (const customerId of customersWithOrders) {
            await sendMonthlyInvoice({ params: { customerId } }, { status: () => ({ json: () => {} }) });
        }
        console.error(`Invoices sent to ${customersWithOrders.length} customers.`);
        
    } catch (error) {
        console.error("Error in sending invoices:", error.message);
    }
});




// Runs every midnight to delete read notifications older than 7 days
cron.schedule("0 0 * * *", async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
        await Notification.deleteMany({ read: true, createdAt: { $lte: sevenDaysAgo } });
        console.error("Deleted old read notifications.");
    } catch (error) {
        console.error("Error deleting old notifications:", error);
    }
});

module.exports = cron;
