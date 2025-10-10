var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var connectDB = require('./config/db');
var cors = require('cors');
const cron = require("node-cron");
require("./middleware/cronjob"); // Load cron job


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var admin = require('./routes/admins');
var Customer = require('./routes/customer');
var warehouse = require('./routes/warehouse');
var category = require('./routes/category');
var product = require('./routes/product');
var customerCart= require('./routes/customercart')
var wishlist= require('./routes/wishlist')
var plan = require('./routes/plan');
var orderdetails = require('./routes/orderdetails');
var review = require('./routes/review');
var banner = require('./routes/banner');
var route = require('./routes/route');
var rewarditem = require('./routes/rewarditem');
var notification = require('./routes/notification');
var invoice = require('./routes/invoice');

const rewardRoutes = require("./routes/reward");
const { autoGenerateOrders } = require('./controller/orderdetails');
const { generateMonthlyInvoices } = require("./controller/customer");

// Connect to database
connectDB();

var app = express();

// CORS configuration
app.use(cors({
  origin: ["http://localhost:5174", "http://localhost:3000", "https://admin.palkkaran.in", "http://localhost:4173"],
  methods: ["PUT", "DELETE", "POST", "GET", "PATCH"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware setup
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// cron.schedule("0 18 * * *", async () => {
//   console.log("Running daily auto order generation at 6:00 PM...");
//   await autoGenerateOrders();
// });

cron.schedule("49 21 * * *", async () => {
  console.log("Running daily auto order generation at 9:06 PM...");
  await autoGenerateOrders();
});


// Run every 1st of month at 12:00 AM
cron.schedule("0 0 1 * *", async () => {
  try {
    const today = new Date();
    let prevMonth = today.getMonth() - 1;
    let year = today.getFullYear();
    
    if (prevMonth < 0) {
      prevMonth = 11; // December
      year = year - 1;
    }

    // Create a date for the first day of previous month
    const firstDayPrevMonth = new Date(year, prevMonth, 1);


    await generateMonthlyInvoices({ body: { date: firstDayPrevMonth } }, {
      status: (code) => ({
        json: (data) => console.log("Cron response:", data)
      })
    });

  } catch (err) {
    console.error("Error in scheduled invoice generation:", err);
  }
});


// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', admin);
app.use('/customer', Customer);
app.use('/warehouse', warehouse);
app.use('/category', category);
app.use('/product', product);
app.use('/cart',customerCart)
app.use('/wishlist',wishlist)
app.use('/plan',plan)
app.use('/orderdetails',orderdetails)
app.use('/review',review)
app.use('/banner',banner)
app.use('/route',route)
app.use('/rewarditem', rewarditem)
app.use('/notification',notification)
app.use('/invoice', invoice)
app.use("/rewards", rewardRoutes);
// 404 handler - This should come after all valid routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 404,
    message: 'The requested resource was not found',
    path: req.path
  });
});

// Error handler - This should be the last middleware
app.use((err, req, res, next) => {
  // Set locals, only providing error in development
  const error = req.app.get('env') === 'development' ? err : {};
  
  // Send error response
  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || 'Internal Server Error',
    error: req.app.get('env') === 'development' ? error : {}
  });
});

module.exports = app;