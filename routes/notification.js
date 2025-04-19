const express = require('express');
const router = express.Router();
const controller = require('../controller/notification')

router.post('/',controller.create)
//get by customer id
router.get('/:customerId',controller.getNotificationByCustomerId)
//get by delvery boy id
router.get('/delivery/:deliveryboyId',controller.getNotificationByDeliveryboyId)


module.exports = router;
