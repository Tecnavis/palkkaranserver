const CustomerModel = require("../models/customer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const twilio = require('twilio');
const CustomerCart = require('../models/customercart');
const Plan = require('../models/plans');


// Twilio Configuration
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Temporary storage for OTPs (Use Redis for better scalability)
const otpStorage = new Map();

exports.login = asyncHandler(async (req, res) => {
    let { phone, password } = req.body;

    // Ensure +91 prefix with space
    if (!phone.startsWith("+91")) {
        phone = "+91 " + phone.replace(/^\+91\s*/, '').trim();
    }

    // Check if customer exists
    const customer = await CustomerModel.findOne({ phone });
    if (!customer) {
        return res.status(400).json({ message: "Incorrect phone number or password" });
    }

    // Check if account is confirmed
    if (!customer.isConfirmed) {
        return res.status(400).json({ message: "Your account is not confirmed. Please confirm your account before logging in." });
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, customer.password);
    if (!isPasswordMatch) {
        return res.status(400).json({ message: "Incorrect phone number or password" });
    }

    // Generate OTP (6-digit random number)
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStorage.set(phone, otp); // Store OTP temporarily

    // Send OTP via Twilio
    try {
        await client.messages.create({
            body: `Your verification code is: ${otp}`,
            from: process.env.TWLIO_NUMBER,
            to: phone
        });

        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Twilio Error:", error);
        res.status(500).json({ message: "Failed to send OTP" });
    }
});


exports.verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;

    // Check if OTP is valid
    const storedOtp = otpStorage.get(phone);
    if (!storedOtp || storedOtp != otp) {
        return res.status(400).json({ message: "Invalid OTP" });
    }

    // Remove OTP from temporary storage
    otpStorage.delete(phone);

    // Find customer
    const customer = await CustomerModel.findOne({ phone });
    if (!customer) {
        return res.status(400).json({ message: "Customer not found" });
    }

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
    let { name, password, phone, location, address, routeno, routename, email } = req.body;

    // Validate phone number
    if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
    }

    // Remove any existing +91 prefix and whitespace
    phone = phone.replace(/^\+91\s*/, '').replace(/\s/g, '');

    // Validate phone number is exactly 10 digits
    if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    // Add +91 prefix
    const formattedPhone = '+91 ' + phone;

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
            return res.status(400).json({ message: "Invalid address format. Address must be an array of objects." });
        }
    }

    // Check if customer already exists
    const customerExists = await CustomerModel.findOne({ phone: formattedPhone });
    if (customerExists) {
        return res.status(400).json({ message: "Phone number already exists" });
    }

    // Generate a new customerId
    const customerId = await generateCustomerId();

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
        email
    });

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

// Add a paid amount (temporary until confirmation)


// Add paid amount (unconfirmed)
exports.addPaidAmount = async (req, res) => {
    try {
        const { customerId, amount } = req.body;

        // Validate input
        if (!customerId || !amount || amount <= 0) {
            return res.status(400).json({ 
                message: 'Invalid customer ID or amount' 
            });
        }

        // Find the customer
        const customer = await CustomerModel.findOne({ customerId });

        if (!customer) {
            return res.status(404).json({ 
                message: 'Customer not found' 
            });
        }

        // Add unconfirmed paid amount
        customer.paidAmounts.push({
            amount: amount,
            date: new Date(),
            isGet: false // Initially set to unconfirmed
        });

        // Save the customer
        await customer.save();

        res.status(201).json({
            message: 'Paid amount added successfully',
            paidAmount: customer.paidAmounts[customer.paidAmounts.length - 1]
        });
    } catch (error) {
        console.error('Error adding paid amount:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};

// Confirm paid amount
exports.confirmPaidAmount = async (req, res) => {
    try {
        const { customerId, paidAmountId } = req.body;

        // Validate input
        if (!customerId || !paidAmountId) {
            return res.status(400).json({ 
                message: 'Customer ID and Paid Amount ID are required' 
            });
        }

        // Find the customer
        const customer = await CustomerModel.findOne({ customerId });

        if (!customer) {
            return res.status(404).json({ 
                message: 'Customer not found' 
            });
        }

        // Find the specific paid amount
        const paidAmountIndex = customer.paidAmounts.findIndex(
            payment => payment._id.toString() === paidAmountId
        );

        if (paidAmountIndex === -1) {
            return res.status(404).json({ 
                message: 'Paid amount not found' 
            });
        }

        // Confirm the paid amount
        customer.paidAmounts[paidAmountIndex].isGet = true;

        // Save the updated customer
        await customer.save();

        res.status(200).json({
            message: 'Paid amount confirmed successfully',
            confirmedPayment: customer.paidAmounts[paidAmountIndex]
        });
    } catch (error) {
        console.error('Error confirming paid amount:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
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
                message: 'Customer not found' 
            });
        }

        res.status(200).json({
            paidAmounts: customer.paidAmounts
        });
    } catch (error) {
        console.error('Error retrieving paid amounts:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
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
            return res.status(404).json({ message: "No customers found for this route." });
        }

        res.status(200).json({ message: "Customers retrieved successfully.", customers });

    } catch (error) {
        res.status(500).json({ message: "Internal server error.", error: error.message });
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
                message: 'Customer not found' 
            });
        }

        // Filter unconfirmed paid amounts
        const unconfirmedPaidAmounts = customer.paidAmounts.filter(payment => !payment.isGet);

        res.status(200).json({
            unconfirmedPaidAmounts
        });
    } catch (error) {
        console.error('Error retrieving unconfirmed paid amounts:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
        });
    }

}