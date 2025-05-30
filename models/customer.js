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
        type: String,
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
    isConfirmed: {
        type: Boolean,
        default: false
    },

    //paid amounts with date
    paidAmounts: [
        {
            date: { type: Date, default: Date.now },
            amount: { type: Number, default: 0 },
            isGet: { type: Boolean, default: false },
        },
    ],
    customerindex: {
        type: Number,
    },
    fcmToken: {
        type: String
    },
    referralId: { type: String, unique: true },
    referredBy: { type: String, default: null }, 
    referralRewarded: { type: Boolean, default: false },
    point:{
      type: Number,
      default: 0
    }
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
