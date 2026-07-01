const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const { isAuthenticated, isAdmin, isStaff, isStudent, isStaffOrAdmin } = require('./middleware/auth');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const paymentRoutes = require('./routes/payment');
const feedbackRoutes = require('./routes/feedback');

app.use('/auth', authRoutes);
app.use('/menu', isAuthenticated, menuRoutes);
app.use('/orders', isAuthenticated, isStudent, orderRoutes);
app.use('/admin', isAuthenticated, isAdmin, adminRoutes);
app.use('/staff', isAuthenticated, isStaffOrAdmin, staffRoutes);
app.use('/payment', isAuthenticated, paymentRoutes);
app.use('/feedback', isAuthenticated, feedbackRoutes);

// View routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/views/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/views/menu.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'menu.html'));
});

app.get('/views/my-orders.html', isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'my-orders.html'));
});

app.get('/views/profile.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/views/feedback.html', isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feedback.html'));
});

app.get('/views/payment-success.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'payment-success.html'));
});

app.get('/views/payment-failed.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'payment-failed.html'));
});

app.get('/views/staff/dashboard.html', isAuthenticated, isStaffOrAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'staff', 'dashboard.html'));
});

app.get('/views/admin/dashboard.html', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'dashboard.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});