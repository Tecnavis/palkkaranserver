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
router.post('/add-paid-amount/customer', Controller.addPaidAmount);

// Route to confirm a paid amount
router.patch('/confirm-paid-amount/confirm', Controller.confirmPaidAmount);

// Route to get all paid amounts for a customer
router.get('/paid-amounts/:customerId', Controller.getPaidAmounts);
//get unconfirmed paid amounts
router.get('/unconfirmed-paid-amounts/:customerId', Controller.getUnconfirmedPaidAmounts);

//get all customers by routeno
router.get("/routeno-based-customer/:routeno", Controller.getCustomersByRouteNo);
//update customerindex by customerid
router.put("/update-customer-index/:customerId", Controller.updateCustomerIndex);

router.patch("/update-payment", Controller.updatePayment);
module.exports = router;
