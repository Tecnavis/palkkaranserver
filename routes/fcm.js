const express = require('express');
const router = express.Router();
const controller = require('../controller/fcm')


router.post('/', controller.sendFcmNotification)
// API to save FCM token in MongoDB
router.post('/save-fcm-token', controller.saveFcmToken);

module.exports = router;