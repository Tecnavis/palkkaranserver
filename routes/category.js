var express = require('express');
var router = express.Router();
const Controller = require('../controller/category')
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

var upload = multer({ storage: storage });
//main category routes
router.post('/',upload.single("image"),Controller.create)
router.get('/',Controller.getAll)
router.get('/:id',Controller.get)
router.put('/:id',upload.single("image"),Controller.update)
router.delete('/:id',Controller.delete)

module.exports = router;
