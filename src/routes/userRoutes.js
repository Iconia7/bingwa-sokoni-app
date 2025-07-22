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

        // Only grant initial tokens if they haven't been granted before for this user
        // (This logic is now primarily handled within userModel.getUser)
        // You might want to remove initial_tokens_granted from userModel and handle the check here
        // if you have more complex initial grant logic.
        // For now, the userModel.getUser handles initial creation and token grant.

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

router.post('/deduct-token', async (req, res) => {
  const { userId } = req.body;
  const newBalance = await userModel.updateTokens(userId, -1);
  res.status(200).json({ newBalance });
});

router.post('/update_tokens', async (req, res) => {
    const { userId, amount } = req.body; // Amount can be positive or negative
    if (!userId || amount == null || typeof amount !== 'number') { // Ensure amount is a number
        return res.status(400).json({ success: false, message: 'User ID and a numeric amount are required.' });
    }
    try {
        const newBalance = await userModel.updateTokens(userId, amount); // Use updateTokens for general adjustments
        if (newBalance === null) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({
            success: true,
            message: 'Tokens updated successfully.',
            tokens: newBalance
        });
    } catch (error) {
        console.error('Error updating tokens:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during token update.' });
    }
});
module.exports = router;