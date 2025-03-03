const CustomerModel = require("../models/customer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
require('dotenv').config();
const twilio = require('twilio');
const CustomerCart = require('../models/customercart');
const Plan = require('../models/plans');



//login 
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Login controller to send OTP
exports.login = asyncHandler(async (req, res) => {
    const { phone, password } = req.body;

    // Check if the customer exists
    const customer = await CustomerModel.findOne({ phone });
    if (!customer) {
        return res.status(400).json({ message: "Incorrect phone number or password" });
    }

    // Check if the customer is confirmed
    if (!customer.isConfirmed) {
        return res.status(400).json({ message: "Your account is not confirmed. Please confirm your account before logging in." });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordMatch = await bcrypt.compare(password, customer.password);
    if (!isPasswordMatch) {
        return res.status(400).json({ message: "Incorrect phone number or password" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store OTP temporarily in the database (optional)
    customer.tokens = otp.toString(); 
    await customer.save();

    // Send OTP via Twilio SMS
    await client.messages.create({
        body: `Your OTP code is ${otp}. Do not share this with anyone.`,
        from: process.env.TWLIO_TRIAL_NUMBER,
        to: phone
    });

    res.status(200).json({
        message: "OTP sent successfully. Please verify to continue.",
        phone
    });
});


exports.verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;

    // Check if the user exists
    const customer = await CustomerModel.findOne({ phone });
    if (!customer) {
        return res.status(400).json({ message: "User not found" });
    }

    // Check if the OTP is correct
    if (customer.tokens !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear the OTP after successful verification
    customer.tokens = "";
    await customer.save();

    // Generate access token upon successful OTP verification
    const accessToken = jwt.sign(
        {
            user: {
                username: customer.name || "",
                userId: customer._id || "",
                userPhone: customer.phone || "",
                address: customer.address || "",
                location: customer.location || "",
                routeno: customer.routeno || "",
                routename: customer.routename || "",
            },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    res.status(200).json({
        message: "OTP verified successfully.",
        accessToken,
        user: {
            username: customer.name || "",
            _id: customer._id,
            UserId: customer.customerId,
            userPhone: customer.phone,
            address: customer.address,
            location: customer.location,
            routeno: customer.routeno || "",
            routename: customer.routename || "",
            proofimage: customer.image || "",
        },
    });
});





// Function to generate the next customerId
const generateCustomerId = async () => {
    // Get the last customer record
    const lastCustomer = await CustomerModel.findOne().sort({ _id: -1 }).select("customerId");
    let baseId = 1000; 
    if (lastCustomer && lastCustomer.customerId) {
        const numericPart = parseInt(lastCustomer.customerId.replace("CS", ""), 10);
        if (!isNaN(numericPart)) {
            baseId = numericPart + 1;
        }
    }
    return `CS${baseId}`;
};

exports.create = asyncHandler(async (req, res) => {
    const { name, password, phone, location, address, routeno, routename, email } = req.body;

    if (!password || !phone) {
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
            return res.status(400).json({ message: "Invalid address format. Address must be an array of objects." });
        }
    }

    // Check if customer already exists
    const customerExists = await CustomerModel.findOne({ phone });
    if (customerExists) {
        return res.status(400).json({ message: "Phone number already exists" });
    }

    // Generate a new customerId
    const customerId = await generateCustomerId();

    // Create the new customer; note that isConfirmed is false by default.
    const customer = await CustomerModel.create({
        customerId,
        name,
        password,
        phone,
        location,
        address: parsedAddress,
        routeno,
        routename,
        email
    });

    if (customer) {
        // Optionally, send a confirmation email or message here.
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
            message: "Customer created successfully. Please confirm your account to be able to login."
        });
    } else {
        res.status(400).json({ message: "Invalid customer data" });
    }
});




exports.getAll = asyncHandler(async (req, res) => {
    const customer = await CustomerModel.find();
    res.status(200).json(customer);
})

//get by Id
exports.get = asyncHandler(async (req, res) => {
    const customer = await CustomerModel.findById(req.params.id);
    res.status(200).json(customer);
})
//update customer

exports.update = asyncHandler(async (req, res) => {
    const { name, password, phone,location,address,routeno,routename,email } = req.body;
    const { id } = req.params;
    try {
        const customer = await CustomerModel.findById(id);
        if (!customer) {
            return res.status(400).json({ message: "Customer not found to update" });
        }
        customer.name = name;
        customer.password = password;
        customer.phone = phone;
        customer.location = location;
        customer.address = address;
        customer.routeno = routeno;
        customer.routename = routename;
        customer.email=email;
        const updatedCustomer = await customer.save();
        return res.json({ updatedCustomer });
        
    } catch (err) {
        console.log(err, "An error occurred during customer update");
        return res.status(500).json({ message: "An error occurred during customer update" });
    }
})


exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if customer exists
    const customer = await CustomerModel.findById(id);
    if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
    }

    // Delete related data
    await Promise.all([
        CustomerCart.deleteMany({ customerId: id }),  // Delete cart details
        Plan.deleteMany({ customer: id })  // Delete customer plans
    ]);

    // Delete customer
    await CustomerModel.findByIdAndDelete(id);

    res.status(200).json({ message: "Customer and related data deleted successfully" });
});


//delete all customer
exports.deleteAll = asyncHandler(async (req, res) => {
    const customer = await CustomerModel.deleteMany();
    res.status(200).json(customer);
})

//login customer  and store token and details in local storage
// exports.login = asyncHandler(async (req, res) => {
//     const { phone, password } = req.body;

//     // Check if the customer exists
//     const customer = await CustomerModel.findOne({ phone });
//     if (!customer) {
//         return res.status(400).json({ message: "Incorrect phone number or password" });
//     }

//     // Check if the customer is confirmed
//     if (!customer.isConfirmed) {
//         return res.status(400).json({ message: "Your account is not confirmed. Please confirm your account before logging in." });
//     }

//     // Compare the provided password with the hashed password in the database
//     const isPasswordMatch = await bcrypt.compare(password, customer.password);
//     if (!isPasswordMatch) {
//         return res.status(400).json({ message: "Incorrect phone number or password" });
//     }

//     // Generate access token if phone and password are correct
//     const accessToken = jwt.sign({
//             user: {
//                 username: customer.name,
//                 userId: customer._id,
//                 userPhone: customer.phone,
//                 address: customer.address,
//                 location: customer.location,
//                 routeno: customer.routeno,
//                 routename: customer.routename,
//             },
//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         { expiresIn: '15m' }
//     );

//     // Respond with the access token and user details
//     res.status(200).json({
//         accessToken,
//         user: {
//             username: customer.name,
//             _id: customer._id,
//             UserId: customer.customerId,
//             userPhone: customer.phone,
//             address: customer.address,
//             location: customer.location,
//             routeno: customer.routeno||"",
//             routename: customer.routename||"",
//             proofimage: customer.image||"",
//         },
//     });
// });


//updateCustomerDetails by id (name,phone,email)
exports.updateCustomerDetails = async (req, res) => {
    const { phone, email, name } = req.body;

    if (!phone && !email && !name) {
        return res.status(400).json({ message: "Please provide at least one field to update." });
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
            return res.status(400).json({ message: `Duplicate ${field} is not allowed.` });
        }

        return res.status(500).json({ message: "Server error" });
    }
};
//changePassword
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required." });
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
            return res.status(400).json({ message: "Current password is incorrect." });
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
        return res.status(400).json({ message: "Postcode and street address are required" });
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
        return res.status(400).json({ message: "Postcode and street address are required" });
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


exports.confirmCustomer = asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    
    // Find the customer by customerId
    const customer = await CustomerModel.findOne({ customerId });
    if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
    }

    // Update the confirmation status
    customer.isConfirmed = true;
    await customer.save();

    res.status(200).json({ message: "Customer account confirmed successfully." });
});


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

        res.status(200).json({ message: "Customer image updated successfully", image: imagePath });
    } catch (error) {
        console.error("Error updating customer image:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
