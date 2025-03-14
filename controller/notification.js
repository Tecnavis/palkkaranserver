// const Notification = require("../models/notification");
// exports.getNotifications = async (req, res) => {
//     try {
//         const customerId = req.params.customerId;
//         const notifications = await Notification.find({ customerId }).sort({ createdAt: -1 });
//         res.status(200).json({ success: true, notifications });
//     } catch (error) {
//         console.error("Error fetching notifications:", error);
//         res.status(500).json({ error: "Failed to fetch notifications." });
//     }
// };
