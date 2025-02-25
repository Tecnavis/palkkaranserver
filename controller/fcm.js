const FCMModel = require("../models/fcmmodel");

exports. sendFcmNotification = async (req, res) => {
    try {
        const { fcmtoken, message } = req.body;
        const fcm = await FCMModel.create({ fcmtoken, message });
        res.status(200).json(fcm);
    } catch (error) {
        res.status(500).json({ message: "Error sending FCM notification", error });
    }
};


//save FCM token in MongoDB
exports.saveFcmToken = async (req, res) => {
    try {
        const { fcmtoken, customerId, message } = req.body;
        const fcm = await FCMModel.create({ fcmtoken, customerId, message });
        res.status(200).json(fcm);
    } catch (error) {
        res.status(500).json({ message: "Error saving FCM token", error });
    }
};