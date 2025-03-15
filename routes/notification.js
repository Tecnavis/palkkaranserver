const express = require('express');
const router = express.Router();
const controller = require('../controller/notification')

router.post('/',controller.create)

module.exports = router;