const mongoose = require('mongoose');

const PromoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    type: {
        type: String,
        enum: ['PLATFORM', 'SELLER'],
        required: true,
        default: 'SELLER'
    },
    creatorId: {
        type: String, // 'ADMIN' or the Seller's userId (normalized)
        required: true,
        index: true
    },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FLAT'],
        required: true,
        default: 'PERCENTAGE'
    },
    discountValue: {
        type: Number,
        required: true
    },
    usageLimit: {
        type: Number,
        default: 100 // Default max 100 uses
    },
    usageCount: {
        type: Number,
        default: 0
    },
    expiryDate: {
        type: Date,
        default: () => new Date(+new Date() + 30*24*60*60*1000) // Default 30 days from now
    },
    appliesTo: {
        type: String,
        enum: ['TOKENS', 'STOREFRONT_ACCESS', 'STOREFRONT_PLANS'],
        required: true,
        default: 'STOREFRONT_PLANS'
    },
    targetId: {
        type: String, // Specific Phone or UserID
        index: true,
        default: null
    },
    targetProductId: {
        type: String, // Specific Package/Plan ID
        index: true,
        default: null
    },
    oneTimePerUser: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PromoCode', PromoCodeSchema);
