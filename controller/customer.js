const CustomerModel = require("../models/customer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const CustomerCart = require("../models/customercart");
const Plan = require("../models/plans");
const OrderProduct = require("../models/orderdetails");
const admin = require("firebase-admin");

// Twilio Configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN );
const messaging = require("../config/firebaseconfig"); // Import Firebase Config
const AdminsModel = require("../models/admins");
const { AddOnResultInstance } = require("twilio/lib/rest/api/v2010/account/recording/addOnResult");
const Invoice = require("../models/invoice"); 

require("dotenv").config();



// exports.login = asyncHandler(async (req, res) => {
//   let { phone } = req.body;

//   // Ensure +91 prefix with space
//   if (!phone.startsWith("+91")) {
//     phone = "+91 " + phone.replace(/^\+91\s*/, "").trim();
//   }
    
//   // Check if customer exists
//   const customer = await CustomerModel.findOne({ phone });

  
//   if (!customer) {
//     return res.status(400).json({ message: "Phone number not registered" });
//   }

//   // Check if account is confirmed
//   if (!customer.isConfirmed) {
//     return res
//       .status(400)
//       .json({
//         message:
//           "Your account is not confirmed. Please confirm your account before logging in.",
//       });
//   }

  

//   // Generate OTP (6-digit random number)
//   const otp = Math.floor(100000 + Math.random() * 900000);

//   customer.otp = otp
//   customer.save();


//   // Send OTP via Twilio
//   try {
//     await client.messages.create({
//       body: `Your verification code is: ${otp}`,
//       from: process.env.TWLIO_NUMBER,
//       to: phone,
//     });

  
//     res.status(200).json({ message: "OTP sent successfully" , otp});
//   } catch (error) {
//     console.error("Twilio Error:", error);
//     res.status(500).json({ message: "Failed to send OTP" });
//   }
// });

// exports.verifyOtp = asyncHandler(async (req, res) => {
//   const { phone, otp, fcmToken } = req.body;

//   // Check if OTP is valid
//   const formattedPhone = phone.startsWith("+91")
//       ? phone
//       : "+91 " + phone.replace(/^\+91\s*/, "").trim();

//     // Validate OTP
//     const storedOtp = otpStorage.get(formattedPhone);
//     if (!storedOtp || storedOtp != otp) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }



//     // Remove OTP from storage
//     otpStorage.delete(formattedPhone);

//   // Find customer
//   const customer = await CustomerModel.findOne({ phone : formattedPhone });
//   if (!customer) {
//     return res.status(400).json({ message: "Customer not found" });
//   }


//   // Update or create FCM token
//   if (fcmToken && customer.fcmToken !== fcmToken) {
//     customer.fcmToken = fcmToken;
//     await customer.save();
//   }

//   // Generate access token
//   const accessToken = jwt.sign(
//     {
//       user: {
//         username: customer.name,
//         userId: customer._id,
//         userPhone: customer.phone,
//         address: customer.address,
//         location: customer.location,
//         routeno: customer.routeno,
//         routename: customer.routename,
//         fcmToken: customer.fcmToken,
//       },
//     },
//     process.env.ACCESS_TOKEN_SECRET,
//     { expiresIn: "15m" }
//   );

//   // Respond with access token and user details
//   res.status(200).json({
//     accessToken,
//     user: {
//       username: customer.name,
//       _id: customer._id,
//       UserId: customer.customerId,
//       userPhone: customer.phone,
//       address: customer.address,
//       location: customer.location,
//       routeno: customer.routeno || "",
//       routename: customer.routename || "",
//       proofimage: customer.image || "",
//       fcmToken: customer.fcmToken || "",
//     },
//   });
// });

// exports.verifyOtp = asyncHandler(async (req, res) => {
//     const { phone, otp } = req.body;

//     // Check if OTP is valid
//     const storedOtp = otpStorage.get(phone);
//     if (!storedOtp || storedOtp != otp) {
//         return res.status(400).json({ message: "Invalid OTP" });
//     }

//     // Remove OTP from temporary storage
//     otpStorage.delete(phone);

//     // Find customer
//     const customer = await CustomerModel.findOne({ phone });
//     if (!customer) {
//         return res.status(400).json({ message: "Customer not found" });
//     }

//     // Generate access token
//     const accessToken = jwt.sign(
//         {
//             user: {
//                 username: customer.name,
//                 userId: customer._id,
//                 userPhone: customer.phone,
//                 address: customer.address,
//                 location: customer.location,
//                 routeno: customer.routeno,
//                 routename: customer.routename,
//                 fcmToken: customer.fcmToken
//             },
//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         { expiresIn: "15m" }
//     );

//     // Respond with access token and user details
//     res.status(200).json({
//         accessToken,
//         user: {
//             username: customer.name,
//             _id: customer._id,
//             UserId: customer.customerId,
//             userPhone: customer.phone,
//             address: customer.address,
//             location: customer.location,
//             routeno: customer.routeno || "",
//             routename: customer.routename || "",
//             proofimage: customer.image || "",
//             fcmToken: customer.fcmToken|| "",
//         },
//     });
// });

// Function to generate the next customerId

exports.login = asyncHandler(async (req, res) => {
  let { phone } = req.body;

  // Ensure +91 prefix
  if (!phone.startsWith("+91")) {
    phone = "+91 " + phone.replace(/^\+91\s*/, "").trim();
  }

  const customer = await CustomerModel.findOne({ phone });
  if (!customer) {
    return res.status(400).json({ message: "Phone number not registered" });
  }

  if (!customer.isConfirmed) {
    return res.status(400).json({
      message: "Your account is not confirmed. Please confirm before logging in.",
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  customer.otp = otp;
  customer.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
  await customer.save();

  try {
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWLIO_NUMBER,
      to: phone,
    });
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Twilio Error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});


exports.verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, fcmToken } = req.body;
  const formattedPhone = phone.startsWith("+91")
    ? phone
    : "+91 " + phone.replace(/^\+91\s*/, "").trim();

  const customer = await CustomerModel.findOne({ phone: formattedPhone });
  if (!customer) {
    return res.status(400).json({ message: "Customer not found" });
  }

  if (customer.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (!customer.otpExpires || customer.otpExpires < new Date()) {
    return res.status(400).json({ message: "OTP expired, please request a new one" });
  }

  // Clear OTP
  customer.otp = null;
  customer.otpExpires = null;

  if (fcmToken && customer.fcmToken !== fcmToken) {
    customer.fcmToken = fcmToken;
  }

  await customer.save();

     // Generate access token
    const accessToken = jwt.sign(
        {
            user: {
                username: customer.name,
                userId: customer._id,
                userPhone: customer.phone,
                address: customer.address,
                location: customer.location,
                routeno: customer.routeno,
                routename: customer.routename,
                fcmToken: customer.fcmToken
            },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    // Respond with access token and user details
    res.status(200).json({
        accessToken,
        user: {
            username: customer.name,
            _id: customer._id,
            UserId: customer.customerId,
            userPhone: customer.phone,
            address: customer.address,
            location: customer.location,
            routeno: customer.routeno || "",
            routename: customer.routename || "",
            proofimage: customer.image || "",
            fcmToken: customer.fcmToken|| "",
        },
    });

});






const generateCustomerId = async () => {
  // Get the last customer record
  const lastCustomer = await CustomerModel.findOne()
    .sort({ _id: -1 })
    .select("customerId");
  let baseId = 1000;
  if (lastCustomer && lastCustomer.customerId) {
    const numericPart = parseInt(lastCustomer.customerId.replace("CS", ""), 10);
    if (!isNaN(numericPart)) {
      baseId = numericPart + 1;
    }
  }
  return `CS${baseId}`;
};

// exports.create = asyncHandler(async (req, res) => {
//     let { name, password, phone, location, address, routeno, routename, email,fcmToken } = req.body;

//     // Validate phone number
//     if (!phone) {
//         return res.status(400).json({ message: "Phone number is required" });
//     }

//     // Remove any existing +91 prefix and whitespace
//     phone = phone.replace(/^\+91\s*/, '').replace(/\s/g, '');

//     // Validate phone number is exactly 10 digits
//     if (!/^\d{10}$/.test(phone)) {
//         return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
//     }

//     // Add +91 prefix
//     const formattedPhone = '+91 ' + phone;

//     if (!password) {
//         return res.status(400).json({ message: "Please add all required fields" });
//     }

//     // Validate and parse address
//     let parsedAddress = [];
//     if (address) {
//         try {
//             parsedAddress = JSON.parse(address);
//             if (!Array.isArray(parsedAddress)) {
//                 throw new Error("Address must be an array of objects");
//             }
//         } catch (err) {
//             return res.status(400).json({ message: "Invalid address format. Address must be an array of objects." });
//         }
//     }

//     // Check if customer already exists
//     const customerExists = await CustomerModel.findOne({ phone: formattedPhone });
//     if (customerExists) {
//         return res.status(400).json({ message: "Phone number already exists" });
//     }

//     // Generate a new customerId
//     const customerId = await generateCustomerId();

//     // Create the new customer
//     const customer = await CustomerModel.create({
//         customerId,
//         name,
//         password,
//         phone: formattedPhone,
//         location,
//         address: parsedAddress,
//         routeno,
//         routename,
//         email,
//         fcmToken

//     });

//     if (customer) {
//         res.status(201).json({
//             _id: customer._id,
//             customerId: customer.customerId,
//             name: customer.name,
//             phone: customer.phone,
//             location: customer.location,
//             address: customer.address,
//             routeno: customer.routeno,
//             routename: customer.routename,
//             email: customer.email,
//             fcmToken: customer.fcmToken,
//             message: "Customer created successfully. Please confirm your account to be able to login."
//         });
//     } else {
//         res.status(400).json({ message: "Invalid customer data" });
//     }
// });

// Helper: Generate unique referral ID
function generateReferralId(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-${code}`;
}

exports.create = asyncHandler(async (req, res) => {
  let {
    name,
    password,
    phone,
    location,
    address,
    routeno,
    routename,
    email,
    fcmToken,
    referredBy,
  } = req.body;

  // Validate phone number
  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  phone = phone.replace(/^\+91\s*/, "").replace(/\s/g, "");

  if (!/^\d{10}$/.test(phone)) {
    return res
      .status(400)
      .json({ message: "Phone number must be exactly 10 digits" });
  }

  const formattedPhone = "+91 " + phone;

  if (!password) {
    return res.status(400).json({ message: "Please add all required fields" });
  }

  // Validate and parse address
  let parsedAddress = [];
  if (address) {
    try {
      parsedAddress = JSON.parse(address);
      if (!Array.isArray(parsedAddress)) {
        throw new Error("Address must be an array of objects");
      }
    } catch (err) {
      return res
        .status(400)
        .json({
          message:
            "Invalid address format. Address must be an array of objects.",
        });
    }
  }

  // Check if customer already exists
  const customerExists = await CustomerModel.findOne({ phone: formattedPhone });
  if (customerExists) {
    return res.status(400).json({ message: "Phone number already exists" });
  }

  // Generate a new customerId
  const customerId = await generateCustomerId(); // Make sure you have this function

  // Generate a unique referralId
  let referralId;
  let isUnique = false;
  while (!isUnique) {
    referralId = generateReferralId();
    const existing = await CustomerModel.findOne({ referralId });
    if (!existing) isUnique = true;
  }

  // Validate referredBy if provided
  let validReferrer = null;
  if (referredBy) {
    validReferrer = await CustomerModel.findOne({ referralId: referredBy });
    if (!validReferrer) {
      return res.status(400).json({ message: "Invalid referral ID provided." });
    }
  }

  // Create the new customer
  const customer = await CustomerModel.create({
    customerId,
    name,
    password,
    phone: formattedPhone,
    location,
    address: parsedAddress,
    routeno,
    routename,
    email,
    fcmToken,
    referralId,
    referredBy: validReferrer ? validReferrer.referralId : null,
  });

  // change not allow
  customer.isConfirmed = true;

  await customer.save();

  // not

  if (customer) {
    res.status(201).json({
      _id: customer._id,
      customerId: customer.customerId,
      name: customer.name,
      phone: customer.phone,
      location: customer.location,
      address: customer.address,
      routeno: customer.routeno,
      routename: customer.routename,
      email: customer.email,
      fcmToken: customer.fcmToken,
      referralId: customer.referralId,
      referredBy: customer.referredBy,
      message:
        "Customer created successfully. Please confirm your account to be able to login.",
    });
  } else {
    res.status(400).json({ message: "Invalid customer data" });
  }
});

exports.getAll = asyncHandler(async (req, res) => {
  const customer = await CustomerModel.find();
  res.status(200).json(customer);
});

//get by Id
exports.get = asyncHandler(async (req, res) => {
  const customer = await CustomerModel.findById(req.params.id);
  res.status(200).json(customer);
});
//update customer

exports.update = asyncHandler(async (req, res) => {
  let { name, password, phone, location, address, routeno, routename, email } =
    req.body;
  const { id } = req.params;
  try {
    const customer = await CustomerModel.findById(id);
    if (!customer) {
      return res.status(400).json({ message: "Customer not found to update" });
    }
    // Validate and format phone number
    if (phone) {
      phone = phone.replace(/^\+91\s*/, "").replace(/\s/g, ""); // Remove existing +91 and spaces

      if (!/^\d{10}$/.test(phone)) {
        return res
          .status(400)
          .json({ message: "Phone number must be exactly 10 digits" });
      }

      phone = "+91 " + phone; // Ensure +91 with space
    }

    customer.name = name;
    customer.password = password;
    customer.phone = phone;
    customer.location = location;
    customer.address = address;
    customer.routeno = routeno;
    customer.routename = routename;
    customer.email = email;
    const updatedCustomer = await customer.save();
    return res.json({ updatedCustomer });
  } catch (err) {
    console.log(err, "An error occurred during customer update");
    return res
      .status(500)
      .json({ message: "An error occurred during customer update" });
  }
});

exports.delete = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if customer exists
  const customer = await CustomerModel.findById(id);
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  // Delete related data
  await Promise.all([
    CustomerCart.deleteMany({ customerId: id }), // Delete cart details
    Plan.deleteMany({ customer: id }), // Delete customer plans
  ]);

  // Delete customer
  await CustomerModel.findByIdAndDelete(id);

  res
    .status(200)
    .json({ message: "Customer and related data deleted successfully" });
});

//delete all customer
exports.deleteAll = asyncHandler(async (req, res) => {
  const customer = await CustomerModel.deleteMany();
  res.status(200).json(customer);
});

//updateCustomerDetails by id (name,phone,email)
exports.updateCustomerDetails = async (req, res) => {
  const { phone, email, name } = req.body;

  if (!phone && !email && !name) {
    return res
      .status(400)
      .json({ message: "Please provide at least one field to update." });
  }

  try {
    // Find the customer by customerId
    const customer = await CustomerModel.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Update the provided fields
    if (phone) customer.phone = phone;
    if (email) customer.email = email;
    if (name) customer.name = name;

    // Save the updated customer
    await customer.save();

    return res.status(200).json({
      message: "Customer details updated successfully",
      updatedCustomer: {
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Error updating customer details:", error);

    // Check for duplicate fields
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res
        .status(400)
        .json({ message: `Duplicate ${field} is not allowed.` });
    }

    return res.status(500).json({ message: "Server error" });
  }
};
//changePassword
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Current and new passwords are required." });
  }

  try {
    // Find the customer by customerId
    const customer = await CustomerModel.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    // Check if the current password matches
    const isMatch = await bcrypt.compare(currentPassword, customer.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    customer.password = hashedNewPassword;
    await customer.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// Fetch all addresses for a customer
exports.getCustomerAddresses = async (req, res) => {
  try {
    const customer = await CustomerModel.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ addresses: customer.address });
  } catch (error) {
    console.error("Error fetching customer addresses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add a new address for a customer
exports.addCustomerAddress = async (req, res) => {
  const { postcode, streetAddress, apartment } = req.body;

  if (!postcode || !streetAddress) {
    return res
      .status(400)
      .json({ message: "Postcode and street address are required" });
  }

  try {
    const customer = await CustomerModel.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    customer.address.push({ postcode, streetAddress, apartment });
    await customer.save();

    return res.status(200).json({
      message: "Address added successfully",
      updatedAddresses: customer.address,
    });
  } catch (error) {
    console.error("Error adding customer address:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Edit a specific address for a customer
exports.editCustomerAddress = async (req, res) => {
  const { addressIndex } = req.params;
  const { postcode, streetAddress, apartment } = req.body;

  if (!postcode || !streetAddress) {
    return res
      .status(400)
      .json({ message: "Postcode and street address are required" });
  }

  try {
    const customer = await CustomerModel.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (addressIndex < 0 || addressIndex >= customer.address.length) {
      return res.status(400).json({ message: "Invalid address index" });
    }

    customer.address[addressIndex] = { postcode, streetAddress, apartment };
    await customer.save();

    return res.status(200).json({
      message: "Address updated successfully",
      updatedAddresses: customer.address,
    });
  } catch (error) {
    console.error("Error editing customer address:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a specific address for a customer
exports.deleteCustomerAddress = async (req, res) => {
  const { addressIndex } = req.params;

  try {
    const customer = await CustomerModel.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (addressIndex < 0 || addressIndex >= customer.address.length) {
      return res.status(400).json({ message: "Invalid address index" });
    }

    customer.address.splice(addressIndex, 1);
    await customer.save();

    return res.status(200).json({
      message: "Address deleted successfully",
      updatedAddresses: customer.address,
    });
  } catch (error) {
    console.error("Error deleting customer address:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// exports.confirmCustomer = asyncHandler(async (req, res) => {
//     const { customerId } = req.params;

//     // Find the customer by customerId
//     const customer = await CustomerModel.findOne({ customerId });
//     if (!customer) {
//         return res.status(404).json({ message: "Customer not found" });
//     }

//     // Update the confirmation status
//     customer.isConfirmed = true;
//     await customer.save();

//     res.status(200).json({ message: "Customer account confirmed successfully." });
// });

//proof image add

exports.updateCustomerImage = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required." });
    }

    // Get the uploaded file path
    const imagePath = req.file.filename;

    // Find the customer
    const customer = await CustomerModel.findOne({ customerId });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    // Update customer image
    customer.image = imagePath;
    await customer.save();

    res
      .status(200)
      .json({
        message: "Customer image updated successfully",
        image: imagePath,
      });
  } catch (error) {
    console.error("Error updating customer image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add a paid amount (temporary until confirmation)

exports.addPaidAmount = async (req, res) => {
  try {
    const { customerId, amount, date } = req.body;

    // Validate input
    if (!customerId || !amount || amount <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID or amount",
      });
    }

    // Validate date (optional: ensure it's a valid date)
    const paidDate = date ? new Date(date) : new Date(); // Use provided date or current date

    // Find the customer
    const customer = await CustomerModel.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // Add paid amount with the provided date
    customer.paidAmounts.push({
      amount: amount,
      date: paidDate,
      isGet: false, // Initially set to unconfirmed
    });

    // Save the customer
    await customer.save();

    res.status(201).json({
      message: "Paid amount added successfully",
      paidAmount: customer.paidAmounts[customer.paidAmounts.length - 1],
    });
  } catch (error) {
    console.error("Error adding paid amount:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


// auto generate invoice 
exports.generateMonthlyInvoices = async (req, res) => {
  try {
    const { date } = req.body;

    
    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }
    
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    
    const invoice = await Invoice.findOne({ invoMonth:  targetMonth,  invoYear: targetYear  })
    if(invoice) {
       if (invoice.invoMonth == targetMonth && invoice.invoYear == targetYear) {
      return res.status(400).json({ message: "invoice all ready register" });
    }
    }

   


    // 1️⃣ Get all unique customer IDs
    const ordersAll = await OrderProduct.find();
    const customerIds = [
      ...new Set(ordersAll.map((order) => order.customer.toString())),
    ];

    const results = [];

    // 2️⃣ Loop customers one by one
    for (const custId of customerIds) {
      const orders = await OrderProduct.find({ customer: custId })
        .populate("customer", "name email phone customerId paidAmounts")
        .populate("productItems.product", "category quantity")
        .populate("plan")
        .lean();

      if (!orders.length) continue;

      // 3️⃣ Calculate invoices for this customer
const formattedResponse = orders.map((order) => {
  let totalAmount = 0;
  let remainingDiscount = 3;

  const orderItems = order.selectedPlanDetails?.dates
    .filter((dateItem) => dateItem.status === "delivered")
    .map((dateItem, index) => ({
      no: index + 1,
      date: dateItem.date,
      status: dateItem.status,
      products: order.productItems.map((item) => {
        let adjustedQuantity = item.quantity;

        if (
          order.selectedPlanDetails?.planType === "introductory" &&
          remainingDiscount > 0
        ) {
          const deduction = Math.min(adjustedQuantity, remainingDiscount);
          adjustedQuantity -= deduction;
          remainingDiscount -= deduction;
        }

        const subtotal = adjustedQuantity * item.routePrice;
        totalAmount += subtotal;

        return {
          product: item.product?.category || "N/A",
          quantity: adjustedQuantity,
          routePrice: item.routePrice,
          ml: item.product?.quantity,
          subtotal,
        };
      }),
    }));
    
  return {
    customerId: order.customer?._id || order.customer, // ✅ FIXED
    orderItems,
    total: totalAmount,
  };
});

      // 4️⃣ Filter this month's data only
      const filteredInvoices = formattedResponse
        .map((inv) => {
          const filteredOrderItems = inv.orderItems?.filter((orderItem) => {
            const orderDate = new Date(orderItem.date);
            return (
              orderDate.getMonth() === targetMonth &&
              orderDate.getFullYear() === targetYear
            );
          });

          if (filteredOrderItems && filteredOrderItems.length > 0) {
            return {
              ...inv,
              orderItems: filteredOrderItems,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (!filteredInvoices.length) continue;

      // 5️⃣ Calculate grand total for this customer
      let grandTotal = 0;
      filteredInvoices.forEach((inv) => {
        inv.orderItems
          .filter((orderItem) => orderItem.status === "delivered")
          .forEach((orderItem) => {
            orderItem.products.forEach((prod) => {
              grandTotal += prod.subtotal;
            });
          });
      });

      // 6️⃣ Save to Invoice schema
      const newInvoice = new Invoice({
        customerId: custId,
        orderItems: filteredInvoices.flatMap((f) => f.orderItems), 
        monthAmount: grandTotal, 
        getAmount: 0,
        getBalance: 0,
        payBalance: 0,
        total: 0,
        invoMonth: String(targetMonth), 
        invoYear: String(targetYear),
        status: "un paid",
        paymentType: "not selected",
      });

      await newInvoice.save();
      results.push(newInvoice);
    }

    

    res.status(200).json({
      message: "Monthly invoices generated successfully",
      invoices: results,
    });
  } catch (error) {
    console.error("Error generating invoices:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



exports.confirmPaidAmount = async (req, res) => {
  try {
    const { customerId, paidAmountId } = req.body;

    // Validate input
    if (!customerId || !paidAmountId) {
      return res.status(400).json({
        message: "Customer ID and Paid Amount ID are required",
      });
    }

    // Find the customer
    const customer = await CustomerModel.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // Find the specific paid amount
    const paidAmountIndex = customer.paidAmounts.findIndex(
      (payment) => payment._id.toString() === paidAmountId
    );

    if (paidAmountIndex === -1) {
      return res.status(404).json({
        message: "Paid amount not found",
      });
    }

    // Confirm the paid amount
    customer.paidAmounts[paidAmountIndex].isGet = true;

    // Save the updated customer
    await customer.save();
    // Send push notification if FCM token is available
    if (customer.fcmToken) {
      const message = {
        token: customer.fcmToken,
        notification: {
          title: "Payment Confirmed",
          body: "Your payment has been confirmed successfully.",
        },
      };

      await admin.messaging().send(message);
    }

    res.status(200).json({
      message: "Paid amount confirmed successfully",
      confirmedPayment: customer.paidAmounts[paidAmountIndex],
    });
  } catch (error) {
    console.error("Error confirming paid amount:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all paid amounts for a customer
exports.getPaidAmounts = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Find the customer
    const customer = await CustomerModel.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }
    
    res.status(200).json({
      paidAmounts: customer.paidAmounts,
    });
  } catch (error) {
    console.error("Error retrieving paid amounts:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

//get all customers by routeno
exports.getCustomersByRouteNo = async (req, res) => {
  try {
    const { routeno } = req.params;

    if (!routeno) {
      return res.status(400).json({ message: "Route number is required." });
    }

    const customers = await CustomerModel.find({ routeno });

    if (customers.length === 0) {
      return res
        .status(404)
        .json({ message: "No customers found for this route." });
    }

    res
      .status(200)
      .json({ message: "Customers retrieved successfully.", customers });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

//get all unconfirmed paid amounts for a customer
exports.getUnconfirmedPaidAmounts = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Find the customer
    const customer = await CustomerModel.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // Filter unconfirmed paid amounts
    const unconfirmedPaidAmounts = customer.paidAmounts.filter(
      (payment) => !payment.isGet
    );

    res.status(200).json({
      unconfirmedPaidAmounts,
    });
  } catch (error) {
    console.error("Error retrieving unconfirmed paid amounts:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

//update customerindex by customerid
// exports.updateCustomerIndex = async (req, res) => {
//   try {
//     const { customerId } = req.params;
//     const { customerindex } = req.body;

//     console.log(customerId, customerindex, "iindex");
    
//     const customer = await CustomerModel.findOne({ customerId });
//     if (!customer) {
//       return res.status(404).json({ message: "Customer not found" });
//     }
//     customer.customerindex = customerindex;
//     await customer.save();
//     res.status(200).json({ message: "Customer index updated successfully" });
//   } catch (error) {
//     console.error("Error updating customer index:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

exports.updateCustomerIndex = async (req, res) => {
  
    try {
    const { customerId } = req.params;
    const { customerindex } = req.body;

  

    const customer = await CustomerModel.findOneAndUpdate(
      { customerId },
      { $set: { customerindex } },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
    res.json({ success: true });
  } 
};



//update payment by id

// Update payment details (amount or date)
exports.updatePayment = async (req, res) => {
  const { customerId, paidAmountId, date, amount } = req.body;

  if (!customerId || !paidAmountId) {
    return res.status(400).json({
      success: false,
      message: "Customer ID and payment ID are required",
    });
  }

  try {
    // Find the customer
    const customer = await CustomerModel.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Find the payment in the customer's paidAmounts array
    const paymentIndex = customer.paidAmounts.findIndex(
      (payment) => payment._id.toString() === paidAmountId
    );

    if (paymentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update the payment details
    if (date) {
      customer.paidAmounts[paymentIndex].date = new Date(date);
    }

    if (amount) {
      customer.paidAmounts[paymentIndex].amount = parseFloat(amount);
    }

    // Save the updated customer
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Payment details updated successfully",
      paidAmount: customer.paidAmounts[paymentIndex],
    });
  } catch (error) {
    console.error("Error updating payment details:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating payment details",
      error: error.message,
    });
  }
};

//   exports.confirmCustomer = asyncHandler(async (req, res) => {
//     const { customerId } = req.params;

//     // Find the customer by customerId
//     const customer = await CustomerModel.findOne({ customerId });
//     if (!customer) {
//         return res.status(404).json({ message: "Customer not found" });
//     }

//     // Update the confirmation status
//     customer.isConfirmed = true;
//     await customer.save();

//     // If customer has a route number, notify all admins on that route
//     if (customer.routeno) {
//         try {
//             // Find all admins on the same route who have fcmTokens
//             const adminsOnRoute = await AdminsModel.find({
//                 route: customer.routeno,  // Matching customer.routeno with admin.route
//                 fcmToken: { $exists: true, $ne: "" }
//             });

//             if (adminsOnRoute.length > 0) {
//                 // Prepare notification message
//                 const message = {
//                     notification: {
//                         title: "New Customer Confirmation",
//                         body: `You have a new customer on your route: ${customer.name || customer.customerId}`
//                     },
//                     data: {
//                         customerId: customer.customerId,
//                         routeNumber: customer.routeno,
//                         type: "new_customer_confirmation"
//                     }
//                 };

//                 // Send notifications to all admins on the route
//                 for (const admin of adminsOnRoute) {
//                     if (admin.fcmToken) {
//                         await messaging.send({
//                             token: admin.fcmToken,
//                             ...message
//                         }).catch(error => {
//                             console.error(`Failed to send notification to admin ${admin._id}:`, error);
//                         });
//                     }
//                 }

//                 console.log(`Notifications sent to ${adminsOnRoute.length} admins on route ${customer.routeno}`);
//             }
//         } catch (error) {
//             console.error("Error sending notifications:", error);
//             // Continue with response even if notifications fail
//         }
//     }

//     res.status(200).json({ message: "Customer account confirmed successfully." });
// });

exports.confirmCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  // Find the customer by customerId
  const customer = await CustomerModel.findOne({ customerId });
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  // ✅ Mark customer as confirmed
  customer.isConfirmed = true;

  // ✅ Reward referring customer (only once)
  if (customer.referredBy && !customer.referralRewarded) {
    const referrer = await CustomerModel.findOne({
      referralId: customer.referredBy,
    });
    if (referrer) {
      referrer.point += 5;
      await referrer.save();
      customer.point += 5;
      customer.referralRewarded = true; // mark referral as rewarded
    }
  }

  await customer.save();

  // ✅ Notify route admins
  if (customer.routeno) {
    try {
      const admins = await AdminsModel.find({
        route: customer.routeno,
        fcmToken: { $exists: true, $ne: "" },
      });

      const message = {
        notification: {
          title: "New Customer Confirmation",
          body: `You have a new customer on your route: ${
            customer.name || customer.customerId
          }`,
        },
        data: {
          customerId: customer.customerId,
          routeNumber: customer.routeno,
          type: "new_customer_confirmation",
        },
      };

      for (const admin of admins) {
        if (admin.fcmToken) {
          await messaging
            .send({
              token: admin.fcmToken,
              ...message,
            })
            .catch((error) => {
              console.error(`Failed to send to admin ${admin._id}:`, error);
            });
        }
      }
    } catch (error) {
      console.error("Error notifying admins:", error);
    }
  }

  res.status(200).json({ message: "Customer account confirmed successfully." });
});

