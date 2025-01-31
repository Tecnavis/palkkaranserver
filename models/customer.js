const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Address sub-schema
const addressSchema = new mongoose.Schema({
    postcode: { type: String}, // Postcode is required
    streetAddress: { type: String }, // Street address is required
    apartment: { type: String } // Apartment is optional
});

const customerSchema = new mongoose.Schema({
    customerId: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String
    },
    name: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    image: {
        type: String
    },
    address: [addressSchema], // Array of address objects
    location: {
        type: String
    },
    routeno: {
        type: String
    },
    routename: {
        type: String
    },
    tokens: {
        type: String,
        default: ""
    },

    // otp: { type: Number }, // OTP for password reset
    // otpExpires: { type: Date } // OTP expiration time
});

// Pre-save hook to hash passwords
customerSchema.pre("save", async function (next) {
    if (this.isModified("password") || this.isNew) {
        if (!this.password.startsWith("$2b$")) {
            try {
                const hashedPassword = await bcrypt.hash(this.password, 10);
                this.password = hashedPassword;
                next();
            } catch (err) {
                console.error("Error hashing password:", err.message);
                return next(err);
            }
        } else {
            console.log("Password is already hashed.");
            return next();
        }
    } else {
        console.log("Password is not modified.");
        return next();
    }
});

module.exports = mongoose.model("Customer", customerSchema);
