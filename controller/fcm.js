// const FCM = require("../models/fcmmodel");

// const admin = require("firebase-admin"); // Firebase Admin SDK
// const serviceAccount = require("../config/fibaseservice"); // Ensure correct path

// // Initialize Firebase Admin
// if (!admin.apps.length) {

//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//     });
// }

// // Function to send push notification and store the message
// exports.sendFcmNotification = async (req, res) => {
//   try {
//     const { customerId, message } = req.body;

//     if (!customerId || !message) {
//       return res.status(400).json({ error: "customerId and message are required." });
//     }

//     // Find FCM token for the customer
//     const fcmToken = await FCM.findOne({ customerId });

//     if (!fcmToken) {
//       return res.status(404).json({ error: "FCM token not found for this customer." });
//     }

//     // Store message in database
//     const newMessage = new FCM({ customerId, message, fcmtoken: fcmToken.fcmtoken });
//     await newMessage.save();

//     // Send push notification
//     const payload = {
//       notification: {
//         title: "Order Delivered",
//         body: message,
//         click_action: "FLUTTER_NOTIFICATION_CLICK",
//       },
//       token: fcmToken.fcmtoken,
//     };

//     await admin.messaging().send(payload);

//     res.status(200).json({ success: true, message: "Notification sent and stored successfully." });
//   } catch (error) {
//     console.error("Error sending notification:", error);
//     res.status(500).json({ error: "Failed to send notification." });
//   }
// };
