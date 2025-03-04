var express = require('express');
var router = express.Router();
const Controller = require('../controller/customer')
const multer = require("multer");
// const { Message } = require('twilio/lib/twiml/MessagingResponse');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

var upload = multer({ storage: storage });

//admin signup and login routes
router.post('/',upload.single("image"),Controller.create)

router.post("/verify-otp", Controller.verifyOtp);
router.get('/',Controller.getAll)
router.get('/:id',Controller.get)
router.put('/:id',Controller.update)
router.delete('/:id',Controller.delete)
router.delete('/',Controller.deleteAll)
router.post('/login',Controller.login)
router.post("/:id/addresses", Controller.addCustomerAddress);
router.get("/:id/addresses", Controller.getCustomerAddresses);
router.delete("/:id/addresses/:addressIndex", Controller.deleteCustomerAddress);
router.put("/:id/addresses/:addressIndex", Controller.editCustomerAddress);
router.put("/change-password/:id", Controller.changePassword);
router.put("/customerdetails/:id", Controller.updateCustomerDetails);
router.get('/confirm/:customerId', Controller.confirmCustomer);
router.put("/update-image/:customerId", upload.single("image"), Controller.updateCustomerImage);

// Route to add a paid amount (temporary, awaiting confirmation)
router.post("/:id/add-paid-amount", Controller.addPaidAmount);

// Route to confirm payment
router.post("/:id/confirm-payment", Controller.confirmPayment);
//get all customers by routeno
module.exports = router;
