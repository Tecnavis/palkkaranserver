
const admin = require('firebase-admin');
// const serviceAccount = require('../fibaseservice.json');

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
 credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

module.exports = messaging;