// src/app.js
require('dotenv').config(); // Load environment variables first
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');  // Import the DB connection function

// Connect to MongoDB
connectDB();
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies from incoming requests

// Import route modules
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes'); // New import for user-related routes

// Mount routes
app.use('/api/payments', paymentRoutes); // All payment-related endpoints will start with /api/payments
app.use('/api/users', userRoutes);     // All user-related endpoints will start with /api/users

// Simple root route for health check
app.get('/', (req, res) => {
    res.send('Bingwa Sokoni Backend Running! 🚀');
});

module.exports = app;