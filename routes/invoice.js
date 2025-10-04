const express = require('express');
const router = express.Router();
const controller = require('../controller/invoice')


router.get('/:customerId/date/:date',controller.getInvoiceId)
router.get('/',controller.getInvoiceAll)
router.get('/date/:date',controller.getInvoiceDate)
router.patch('/:customerId', controller.updateInvoiceId);
router.patch('/status/:customerId', controller.updateInvoiceStatus);





module.exports = router;
