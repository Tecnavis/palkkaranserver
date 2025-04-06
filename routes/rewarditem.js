const express = require('express');
const router = express.Router();    

const Controller = require('../controller/rewarditem')

const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
  }).single("image");
  
  router.post("/", upload, Controller.createRewardItem);
  

router.post('/',upload, Controller.createRewardItem)
router.get('/',Controller.getAllRewardItems)
router.get('/:routeno',Controller.getASpecificRewards)
router.get('/:id',Controller.getRewardItemById)
router.put('/:id',upload, Controller.updateRewardItem)
router.delete('/:id',Controller.deleteRewardItem)


module.exports = router;


