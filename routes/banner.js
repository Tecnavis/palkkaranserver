const express = require('express');
const router = express.Router();
const Controller = require('../controller/banner')
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

// Use .array() to handle multiple images
router.post('/', upload.array("images", 10), Controller.create); // 10 is the max number of images allowed
router.get('/', Controller.getAll);
router.get('/:id', Controller.get);
router.put('/:id', upload.array("images", 10), Controller.update);
router.delete('/:id', Controller.delete);
router.delete('/', Controller.deleteAll);

module.exports = router;
