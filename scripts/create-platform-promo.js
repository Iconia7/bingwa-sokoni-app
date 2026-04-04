// scripts/create-platform-promo.js
require('dotenv').config();
const mongoose = require('mongoose');
const PromoCode = require('../src/models/promoCodeModel');

const MONGO_URI = process.env.MONGO_URI;

/**
 * Run this script to create a "Platform Level" promo code for sellers.
 * node scripts/create-platform-promo.js <CODE> <PERCENTAGE|FLAT> <VALUE> <TOKENS|STOREFRONT_ACCESS> [TARGET_USER_ID] [TARGET_PRODUCT_ID] [ONE_TIME_PER_USER: 0|1]
 */
async function createPromo() {
    const [,, code, type, value, appliesTo, targetId, targetProductId, oneTime] = process.argv;

    if (!code || !type || !value || !appliesTo) {
        console.log('Usage: node scripts/create-platform-promo.js <CODE> <PERCENTAGE|FLAT> <VALUE> <TOKENS|STOREFRONT_ACCESS> [TARGET_ID] [PROD_ID] [1|0]');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        
        const promo = new PromoCode({
            code: code.toUpperCase(),
            type: 'PLATFORM',
            creatorId: 'ADMIN',
            discountType: type.toUpperCase(),
            discountValue: parseFloat(value),
            appliesTo: appliesTo.toUpperCase(),
            targetId: targetId || null,
            targetProductId: targetProductId || null,
            oneTimePerUser: oneTime === '1',
            usageLimit: 100,
            expiryDate: new Date(+new Date() + 365*24*60*60*1000) // 1 year for platform codes
        });

        await promo.save();
        console.log(`✅ Platform Promo Created: ${promo.code}`);
        console.log(`🎁 Discount: ${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : ' KES'}`);
        console.log(`📅 Expires: ${promo.expiryDate.toLocaleDateString()}`);
        console.log(`🎯 Scope: ${promo.appliesTo}${promo.targetId ? ` (User: ${promo.targetId})` : ''}`);
        if (promo.targetProductId) console.log(`📦 Product Restricted: ${promo.targetProductId}`);
        if (promo.oneTimePerUser) console.log(`🔒 One-time use per customer: Enabled`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

createPromo();
