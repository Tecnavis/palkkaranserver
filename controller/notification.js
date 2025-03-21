const Notification = require("../models/notification");

exports.create = async (req, res) => {
    try {
        const { customerId, message } = req.body;
        const notification = new Notification({ customerId, message });
        await notification.save();
        res.status(200).json({ success: true, message: "Notification sent and stored successfully." });
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ error: "Failed to send notification." });
    }
};


//getNotificationByCustomerId
exports.getNotificationByCustomerId = async (req, res) => {
    try {
        const { customerId } = req.params;
        const notifications = await Notification.find({ customerId });
        res.status(200).json({ notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
};