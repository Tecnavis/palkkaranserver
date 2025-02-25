const express = require('express');
const router = express.Router();    

const Controller = require('../controller/route')

router.post('/',Controller.create)
router.get('/',Controller.getAll)
router.get('/:id',Controller.get)
router.put('/:id',Controller.update)
router.delete('/:id',Controller.delete)
router.delete('/',Controller.deleteAll)
router.get('/name/:name',Controller.getRoute)
router.get('/popular/product',Controller.getPopular)
router.get("/search/:query",Controller.searchProducts);
module.exports = router;