
// const admin = require('firebase-admin');
// // const serviceAccount = require('../fibaseservice.json');

// const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

// admin.initializeApp({
//  credential: admin.credential.cert(serviceAccount),
// });

// const messaging = admin.messaging();

// module.exports = messaging;


const admin = require('firebase-admin');

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_CONFIG_BASE64, 'base64').toString('utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();
module.exports = messaging;
