const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    packageId: { type: String, required: true },
    checkoutRequestId: { type: String, required: true, unique: true },
    merchantRequestId: { type: String, required: true },
    targetPhoneNumber: { type: String }, // ✨ The number that will receive the data
    referrerPhone: { type: String, default: null }, // ✨ Customer who referred this buyer
    receiptNumber: { type: String }, // M-Pesa Receipt Number
    promoId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode' }, // ✨ Track used coupon
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
