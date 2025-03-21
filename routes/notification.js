const express = require('express');
const router = express.Router();
const controller = require('../controller/notification')

router.post('/',controller.create)
//get by customer id
router.get('/:customerId',controller.getNotificationByCustomerId)

module.exports = router;