var express = require('express');
var router = express.Router();
var Controller = require('../controller/wishlist');

//whish list routes
router.post('/',Controller.create)
router.get("/:customerId",Controller.getWhishlistByCustomerId);
router.delete('/:id',Controller.delete)


module.exports = router;
