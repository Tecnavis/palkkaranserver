require('dotenv').config();
const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
} = process.env;
const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    lazyLoading: true
});
module.exports = client