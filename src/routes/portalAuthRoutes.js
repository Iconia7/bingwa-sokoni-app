const express = require('express');
const router = express.Router();
const { User } = require('../models/userModel');
const bcrypt = require('bcryptjs');
const { normalizePhoneNumber } = require('../utils/phoneUtils');

// 1. Login To Portal
router.post('/login', async (req, res) => {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || !pin) {
        return res.status(400).json({ success: false, message: 'Phone number and PIN are required.' });
    }

    try {
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        if (!normalizedPhone) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
        }

        const user = await User.findOne({ phoneNumber: normalizedPhone });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found. Please register on the app first.' });
        }

        if (!user.isPinSet) {
            return res.status(200).json({ success: true, isFirstTime: true, message: 'Please set your portal PIN.' });
        }

        const isMatch = await bcrypt.compare(pin, user.portalPin);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid PIN.' });
        }

        // Return user data (excluding PIN)
        const userData = user.toObject();
        delete userData.portalPin;

        res.json({ success: true, user: userData });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// 2. Set Portal PIN
router.post('/set-pin', async (req, res) => {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || !pin) {
        return res.status(400).json({ success: false, message: 'Phone number and PIN are required.' });
    }

    try {
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        if (!normalizedPhone) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
        }
        
        const user = await User.findOne({ phoneNumber: normalizedPhone });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.portalPin = await bcrypt.hash(pin, salt);
        user.isPinSet = true;
        await user.save();

        res.json({ success: true, message: 'PIN set successfully. You can now login.' });
    } catch (error) {
        console.error('Set PIN error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

module.exports = router;
