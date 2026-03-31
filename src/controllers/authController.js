const Otp = require('../models/otpModel');
const { sendSMS } = require('../utils/smsHelper');

/**
 * Generates a random 6-digit OTP.
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * POST /api/auth/send-otp
 * Body: { phoneNumber: '+254XXXXXX' }
 */
exports.sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    try {
        const otpCode = generateOtp();

        // 1. Save or Update OTP in DB
        await Otp.findOneAndUpdate(
            { phoneNumber },
            { otp: otpCode, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        // 💡 [DEBUG] Log OTP to console for easy testing if SMS fails
        console.log(`\n🔑 [DEV MODE] OTP for ${phoneNumber} is: ${otpCode}\n`);

        // 2. Send SMS via Africa's Talking
        const message = `Welcome to Bingwa Sokoni! 🦍 Your One Time Password (OTP) verification code is: ${otpCode}. It expires in 5 minutes.`;

        // We don't await this strictly if we want to allow dev-mode login even on failure
        sendSMS(phoneNumber, message).catch(err => {
            console.error('⚠️ Background SMS failed (Check AT balance/blacklist):', err.message);
        });

        res.status(200).json({
            success: true,
            message: 'OTP processed! Check console if SMS doesn\'t arrive.'
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
};

/**
 * POST /api/auth/verify-otp
 * Body: { phoneNumber: '+254XXXXXX', otp: '1234' }
 */
exports.verifyOtp = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json({ success: false, message: 'Phone number and OTP are required.' });
    }

    try {
        // 1. Find OTP in DB
        const otpRecord = await Otp.findOne({ phoneNumber, otp });

        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        // 2. OTP is valid - consume it (delete it)
        await Otp.deleteOne({ _id: otpRecord._id });

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully!'
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
    }
};
