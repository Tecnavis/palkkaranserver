const express = require('express');
const router = express.Router();
const controller = require('../controller/notification')

router.post('/',controller.create)
//get by customer id
router.get('/:customerId',controller.getNotificationByCustomerId)
//get by delvery boy id
router.get('/delivery/:deliveryboyId',controller.getNotificationByDeliveryboyId)


//get by customer id read
router.get('/:customerId/read',controller.getNotificationReadByCustomerId)
//get by delvery boy id read
router.get('/delivery/:deliveryboyId/read',controller.getNotificationReadByDeliveryboyId)

// read costemer notificaion
router.patch('/:customerId/read', controller.markNotificationsAsReadCostmerId);

// read delvery boy notificaion
router.patch('/delivery/:deliveryboyId/read', controller.markNotificationsAsReadDelveryboyId );



module.exports = router;
