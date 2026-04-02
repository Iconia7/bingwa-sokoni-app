const nodemailer = require('nodemailer');

/**
 * Reusable SMTP Transporter
 * For Gmail: Use an "App Password" if 2FA is enabled.
 */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: (process.env.SMTP_PORT == 465), // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends an OTP email.
 * @param {string} to - Recipient email address
 * @param {string} otpCode - The code to send
 */
const sendOtpEmail = async (to, otpCode) => {
    const mailOptions = {
        from: `"Bingwa Sokoni" <${process.env.SMTP_USER}>`,
        to: to,
        subject: 'Your Bingwa Sokoni Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Bingwa Sokoni Verification</h2>
                <p style="font-size: 16px; color: #555;">Hello,</p>
                <p style="font-size: 16px; color: #555;">Your 6-digit verification code is:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otpCode}</span>
                </div>
                <p style="font-size: 14px; color: #888;">This code will expire in 5 minutes.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">If you did not request this code, please ignore this email.</p>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
