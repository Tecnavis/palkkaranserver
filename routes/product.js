var express = require('express');
var router = express.Router();
const Controller = require('../controller/product')
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// //product routes
// var upload = multer({ storage: storage }).fields([{ name: 'images', maxCount: 10 }, { name: 'coverimage', maxCount: 1 }]);
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}).fields([{ name: "images", maxCount: 10 }, { name: "coverimage", maxCount: 1 }]);

router.post('/', upload, Controller.create);
router.get('/',Controller.getAll)

router.get("/popular", Controller.getPopular); 
router.get('/:id',Controller.get)
router.delete('/:id',Controller.deleteProduct)
router.put('/:id',upload,Controller.update)

router.get("/search/:query", Controller.searchProducts);

router.get("/category/:categoryName", Controller.getProductsByCategory);
//random products
module.exports = router;