const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    packageId: { type: String, required: true },
    paymentType: { type: String, enum: ['MPESA', 'SAMBAZA_AIRTIME'], default: 'MPESA' },
    checkoutRequestId: { type: String, unique: true, sparse: true }, // Optional for airtime
    merchantRequestId: { type: String }, // Optional for airtime
    rawUssdResponse: { type: String }, // ✨ For Airtime verification
    targetPhoneNumber: { type: String }, 
    referrerPhone: { type: String, default: null }, 
    receiptNumber: { type: String }, 
    promoId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode' }, 
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
