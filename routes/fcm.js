const express = require('express');
const router = express.Router();
// const controller = require('../controller/fcm')
// const messaging = require('../config/firebaseconfig'); // Import Firebase Config

// // This registration token comes from the client FCM SDKs.
// const registrationToken = 'YOUR_REGISTRATION_TOKEN';

// const message = {
//   data: {
//     score: '850',
//     time: '2:45'
//   },
//   token: registrationToken
// };

// // Send a message to the device corresponding to the provided registration token.
// messaging.send(message)
//   .then((response) => {
//     console.log('Successfully sent message:', response);
//   })
//   .catch((error) => {
//     console.log('Error sending message:', error);
//   });

module.exports = router;