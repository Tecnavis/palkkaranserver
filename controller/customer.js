const CustomerModel = require("../models/customer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const twilio = require('twilio');

// Your Twilio account SID and Auth token
// const accountSid = 'XXXXXXX';
// const authToken = 'XXXXXXX';
// const client = new twilio(accountSid, authToken);

// Function to generate a random OTP
// function generateOTP() {
//     return Math.floor(100000 + Math.random() * 900000); // 6 digit OTP
// }

// Send OTP to the user's mobile number
// exports.sendOTP = async (req, res) => {
//     const { phone } = req.body;

//     // Find customer by phone number
//     const customer = await CustomerModel.findOne({ phone });

//     if (!customer) {
//         return res.status(404).json({ message: 'Customer not found' });
//     }

//     // Generate OTP
//     const otp = generateOTP();

//     // Send OTP via Twilio (SMS)
//     try {
//         await client.messages.create({
//             body: `Your OTP for password reset is: ${otp}`,
//             from: '+1234567890', // Twilio phone number
//             to: `+${phone}` // Customer's phone number with country code
//         });

//         // Save OTP in the customer's record (temporarily, for verification)
//         customer.otp = otp;
//         customer.otpExpires = Date.now() + 15 * 60 * 1000; // OTP expires in 15 minutes
//         await customer.save();

//         res.status(200).json({ message: 'OTP sent successfully' });
//     } catch (error) {
//         console.error('Error sending OTP:', error);
//         res.status(500).json({ message: 'Error sending OTP' });
//     }
// };

// // Verify OTP and allow password reset
// exports.verifyOTP = async (req, res) => {
//     const { phone, otp, newPassword } = req.body;

//     // Find customer by phone number
//     const customer = await CustomerModel.findOne({ phone });

//     if (!customer) {
//         return res.status(404).json({ message: 'Customer not found' });
//     }

//     // Check if OTP exists and is within the expiry time
//     if (customer.otp !== otp || customer.otpExpires < Date.now()) {
//         return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }

//     // Hash the new password before saving
//     try {
//         const hashedPassword = await bcrypt.hash(newPassword, 10);
//         customer.password = hashedPassword;
//         customer.otp = undefined; // Clear OTP after use
//         customer.otpExpires = undefined; // Clear OTP expiry

//         await customer.save();

//         res.status(200).json({ message: 'Password reset successful' });
//     } catch (error) {
//         console.error('Error resetting password:', error);
//         res.status(500).json({ message: 'Error resetting password' });
//     }
// };

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

    // Create the new customer
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
        res.status(201).json({
            _id: customer._id,
            customerId: customer.customerId,
            name: customer.name,
            phone: customer.phone,
            location: customer.location,
            address: customer.address,
            routeno: customer.routeno,
            routename: customer.routename,
            email: customer.email
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
    const admin = await CustomerModel.findByIdAndDelete(req.params.id);
    res.status(200).json({message: "customer deleted"});
})



//delete all customer
exports.deleteAll = asyncHandler(async (req, res) => {
    const customer = await CustomerModel.deleteMany();
    res.status(200).json(customer);
})

//login customer  and store token and details in local storage
exports.login = asyncHandler(async (req, res) => {
    const { phone, password } = req.body;

    // Check if the customer exists
    const customer = await CustomerModel.findOne({ phone });
    if (!customer) {
        return res.status(400).json({ message: "Incorrect phone number or password" });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordMatch = await bcrypt.compare(password, customer.password);
    if (!isPasswordMatch) {
        return res.status(400).json({ message: "Incorrect phone number or password" });
    }

    // Generate access token if phone and password are correct
    const accessToken = jwt.sign({
        user: {
            username: customer.name,
            userId: customer._id,
            userPhone: customer.phone,
            address: customer.address,
            location: customer.location,
        },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' });

    // Respond with the access token and user details
    res.status(200).json({
        accessToken,
        user: {
            username: customer.name,
            userId: customer._id,
            userPhone: customer.phone,
            address: customer.address,
            location: customer.location,
        },
    });
});


// exports.getCustomerAddresses = async (req, res) => {

//     try {
//         // Find the customer by customerId
//         const customer = await CustomerModel.findById(req.params.id);

//         if (!customer) {
//             return res.status(404).json({ message: "Customer not found" });
//         }

//         // Return the addresses
//         return res.status(200).json({ addresses: customer.address });
//     } catch (error) {
//         console.error("Error fetching customer addresses:", error);
//         return res.status(500).json({ message: "Server error" });
//     }
// };
// exports. addCustomerAddress = async (req, res) => {
//     const { newAddress } = req.body; // The new address to add

//     if (!newAddress) {
//         return res.status(400).json({ message: "New address is required" });
//     }

//     try {
//         // Find the customer by customerId
//         const customer = await CustomerModel.findById(req.params.id);

//         if (!customer) {
//             return res.status(404).json({ message: "Customer not found" });
//         }

//         // Add the new address to the address array
//         customer.address.push(newAddress);

//         // Save the updated customer
//         await customer.save();

//         return res.status(200).json({
//             message: "Address added successfully",
//             updatedAddresses: customer.address,
//         });
//     } catch (error) {
//         console.error("Error adding customer address:", error);
//         return res.status(500).json({ message: "Server error" });
//     }
// };


// // Controller to edit a specific address for a customer by their ID
// exports. editCustomerAddress = async (req, res) => {
//     const {  addressIndex } = req.params;
//     const { updatedAddress } = req.body;

//     if (!updatedAddress) {
//         return res.status(400).json({ message: "Updated address is required" });
//     }

//     try {
//         // Find the customer by customerId
//         const customer = await CustomerModel.findById(req.params.id);

//         if (!customer) {
//             return res.status(404).json({ message: "Customer not found" });
//         }

//         // Validate the address index
//         if (addressIndex < 0 || addressIndex >= customer.address.length) {
//             return res.status(400).json({ message: "Invalid address index" });
//         }

//         // Update the address at the specified index
//         customer.address[addressIndex] = updatedAddress;

//         // Save the updated customer
//         await customer.save();

//         return res.status(200).json({
//             message: "Address updated successfully",
//             updatedAddresses: customer.address,
//         });
//     } catch (error) {
//         console.error("Error editing customer address:", error);
//         return res.status(500).json({ message: "Server error" });
//     }
// };



// // Controller to delete a specific address for a customer by their ID
// exports. deleteCustomerAddress = async (req, res) => {
//     const {  addressIndex } = req.params;

//     try {
//         // Find the customer by customerId
//         const customer = await CustomerModel.findById(req.params.id);

//         if (!customer) {
//             return res.status(404).json({ message: "Customer not found" });
//         }

//         // Validate the address index
//         if (addressIndex < 0 || addressIndex >= customer.address.length) {
//             return res.status(400).json({ message: "Invalid address index" });
//         }

//         // Remove the address at the specified index
//         customer.address.splice(addressIndex, 1);

//         // Save the updated customer
//         await customer.save();

//         return res.status(200).json({
//             message: "Address deleted successfully",
//             updatedAddresses: customer.address,
//         });
//     } catch (error) {
//         console.error("Error deleting customer address:", error);
//         return res.status(500).json({ message: "Server error" });
//     }
// };

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



//{{baseURL1}}/customer/change-password/6791f1dc7c1f0de514d255b1



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