// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel'); // Your user model

// Endpoint to register an anonymous user and grant initial tokens
// This is called by the Flutter app on its first launch.
// POST /api/users/register_anonymous
router.post('/register_anonymous', async (req, res) => {
    const { userId } = req.body; // The anonymous ID sent from Flutter

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const user = await userModel.getUser(userId); // This will create the user if they don't exist

        return res.status(200).json({
            success: true,
            message: 'Anonymous user registered/retrieved and initial tokens granted.',
            tokens: user.tokens_balance // Return current balance
        });

    } catch (error) {
        console.error('Error registering anonymous user:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during anonymous registration.' });
    }
});

module.exports = router;