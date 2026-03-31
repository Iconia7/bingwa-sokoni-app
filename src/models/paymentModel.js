const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    packageId: { type: String, required: true },
    checkoutRequestId: { type: String, required: true, unique: true },
    merchantRequestId: { type: String, required: true },
    receiptNumber: { type: String }, // M-Pesa Receipt Number
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
