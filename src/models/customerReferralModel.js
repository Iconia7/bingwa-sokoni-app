const mongoose = require('mongoose');

const CustomerReferralSchema = new mongoose.Schema({
    referrerPhone: {
        type: String,
        required: true,
        index: true,
    },
    refereePhone: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'REWARD_SENT'],
        default: 'PENDING',
    },
    rewardCode: {
        type: String,
        default: null,
    },
    firstPurchaseDate: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true
});

// Compound index to ensure a customer can only be referred once
CustomerReferralSchema.index({ refereePhone: 1 }, { unique: true });

module.exports = mongoose.model('CustomerReferral', CustomerReferralSchema);
