const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        index: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // 5 minutes TTL
    },
});

const Otp = mongoose.model('Otp', OtpSchema);

module.exports = Otp;
