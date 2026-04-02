const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Routes for OTP Authentication
router.post('/send-otp', authController.sendOtp);
router.post('/send-otp-email', authController.sendOtpEmail);
router.post('/verify-otp', authController.verifyOtp);

module.exports = router;
