var express = require('express');
var router = express.Router();
var Controller = require('../controller/customercart');

//customer cart  routes
router.post('/',Controller.create)
router.get("/:customerId",Controller.getByCustomerId);
router.delete('/:id',Controller.delete)

router.put('/:id', Controller.updateCartQuantity);


module.exports = router;
