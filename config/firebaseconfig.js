
// const admin = require('firebase-admin');
// // const serviceAccount = require('../fibaseservice.json');

// const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);


// admin.initializeApp({
//  credential: admin.credential.cert(serviceAccount),
// });

// const messaging = admin.messaging();

// module.exports = messaging;

const admin = require('firebase-admin');
const dotenv = require("dotenv")
dotenv.config();

if (!process.env.FIREBASE_CONFIG) {
  console.error("❌ Missing FIREBASE_CONFIG environment variable");
  process.exit(1);
}

// ✅ Just parse it directly — no Buffer needed
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();
module.exports = messaging;

