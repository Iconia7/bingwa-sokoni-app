const Otp = require('../models/otpModel');
const { sendSMS } = require('../utils/smsHelper');
const { sendOtpEmail: dispatchEmail } = require('../utils/mailer');

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
    console.log(`📡 [OTP] Request received for: ${phoneNumber}`);

    try {
        const otpCode = generateOtp();
        console.log(`🔑 [OTP] Generated: ${otpCode}`);

        // 1. Save to DB
        console.log(`💾 [OTP] Attempting DB Save...`);
        const saved = await Otp.findOneAndUpdate(
            { phoneNumber },
            { otp: otpCode, createdAt: Date.now() },
            { upsert: true, new: true }
        );
        console.log(`✅ [OTP] DB Save Success for ${phoneNumber}`);

        // 2. Send SMS
        const message = `Welcome to Bingwa Sokoni! Your One-Time Password (OTP) is: ${otpCode}. It expires in 5 minutes.`;
        sendSMS(phoneNumber, message).then((result) => {
            // Inspect the response for delivery status
            const recipient = result.SMSMessageData?.Recipients?.[0];
            const isDelivered = recipient && (recipient.status === 'Success' || recipient.status === 'Sent');

            if (isDelivered) {
                console.log(`📲 [OTP] SMS delivered successfully to ${phoneNumber}`);
            } else {
                console.log(`⚠️ [OTP] SMS dispatch accepted, but delivery status: ${recipient?.status || 'Unknown'} for ${phoneNumber}`);
                // Provide full debug info if it fails
                console.log("🔍 [DEBUG] Full AT Response:", JSON.stringify(result));
            }
        }).catch(err => {
            console.error(`❌ [OTP] SMS API Connection FAILED:`, err.message);
        });

        res.status(200).json({ success: true, message: 'OTP processed!' });
    } catch (error) {
        console.error('❌ [OTP] CRITICAL FAILURE:', error.message);
        res.status(500).json({ success: false, message: `OTP Error: ${error.message}` });
    }
};


/**
 * POST /api/auth/send-otp-email
 * Body: { phoneNumber: '+254XXXXXX', email: 'user@example.com' }
 */
exports.sendOtpEmail = async (req, res) => {
    const { phoneNumber, email } = req.body;
    console.log(`📡 [OTP-EMAIL] Request received for: ${phoneNumber} -> ${email}`);

    if (!phoneNumber || !email) {
        return res.status(400).json({ success: false, message: 'Phone number and email are required.' });
    }

    try {
        // 1. Find or Generate OTP
        let otpRecord = await Otp.findOne({ phoneNumber });
        let otpCode;

        if (otpRecord) {
            otpCode = otpRecord.otp;
            console.log(`🔑 [OTP-EMAIL] Re-using existing OTP: ${otpCode}`);
        } else {
            otpCode = generateOtp();
            console.log(`🔑 [OTP-EMAIL] Generated New OTP: ${otpCode}`);
            otpRecord = await Otp.findOneAndUpdate(
                { phoneNumber },
                { otp: otpCode, createdAt: Date.now() },
                { upsert: true, new: true }
            );
        }

        // 2. Send Email
        await dispatchEmail(email, otpCode);
        console.log(`📧 [OTP-EMAIL] Sent successfully to ${email}`);

        res.status(200).json({ success: true, message: 'OTP sent to your email!' });
    } catch (error) {
        console.error('❌ [OTP-EMAIL] FAILURE:', error.message);
        res.status(500).json({ success: false, message: `Email Error: ${error.message}` });
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
