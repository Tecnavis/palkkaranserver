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

          const notifications = await Notification.find({ customerId, read: false })
    .sort({ createdAt: -1 });

        res.status(200).json({ notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
};


exports.getNotificationReadByCustomerId = async (req, res) => {
    try {
        const { customerId } = req.params;

          const notifications = await Notification.find({ customerId, read: true })
    .sort({ createdAt: -1 });

        res.status(200).json({ notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
};


// Mark notifications as read
exports.markNotificationsAsReadCostmerId = async (req, res) => {
        const { customerId } = req.params;

  try {
   
     // Update all unread notifications to read: true
        await Notification.updateMany(
            { customerId, read: false }, 
            { $set: { read: true } }
        );

    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications as read', error });
  }
};


//getNotificationByDeliveryboyId
exports.getNotificationByDeliveryboyId = async (req, res) => {
    try {
        const { deliveryboyId } = req.params;
        
        // Fetch updated notifications

             const notifications = await Notification.find({ deliveryboyId, read: false })
    .sort({ createdAt: -1 });


        res.status(200).json({ notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
};

exports.getNotificationReadByDeliveryboyId = async (req, res) => {
    try {
        const { deliveryboyId } = req.params;
        
        // Fetch updated notifications
        
             const notifications = await Notification.find({ deliveryboyId, read: true })
    .sort({ createdAt: -1 });


        res.status(200).json({ notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
};


// Mark notifications as read
exports.markNotificationsAsReadDelveryboyId = async (req, res) => {
        const { deliveryboyId } = req.params;

  try {
   
    // Update all unread notifications to read: true
        await Notification.updateMany(
            { deliveryboyId, read: false }, 
            { $set: { read: true } }
        );

    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications as read', error });
  }
};
