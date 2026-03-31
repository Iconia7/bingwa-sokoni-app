// src/app.js
require('dotenv').config(); // Load environment variables first
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');  // Import the DB connection function

const app = express();

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies from incoming requests

// Serve static files (like the update.apk) from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Import route modules
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes'); // Imported auth routes
const updateRoutes = require('./routes/updateRoutes'); // OTA Update routes

// Mount routes
app.use('/api/payments', paymentRoutes); // All payment-related endpoints will start with /api/payments
app.use('/api/users', userRoutes);     // All user-related endpoints will start with /api/users
app.use('/api/auth', authRoutes);     // All authentication-related endpoints start with /api/auth
app.use('/api/update', updateRoutes); // OTA Update endpoints start with /api/update

// Simple root route
app.get('/', (req, res) => {
    res.send('Bingwa Sokoni Backend Running! 🚀');
});

// Diagnostic Health Route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
    });
});

module.exports = app;