const express = require('express');
const router = express.Router();
const PromoCode = require('../models/promoCodeModel');
const Payment = require('../models/paymentModel');
const { normalizePhoneNumber } = require('../utils/phoneUtils');

/**
 * POST /api/promo/validate
 * Validates a promo code for a given transaction.
 */
router.post('/validate', async (req, res) => {
    const { code, userId, amount, productType, productId } = req.body;
    
    if (!code) return res.status(400).json({ success: false, message: 'Promo code is required.' });

    try {
        const normalizedCode = code.toUpperCase().trim();
        const promo = await PromoCode.findOne({ code: normalizedCode, isActive: true });

        if (!promo) {
            return res.status(404).json({ success: false, message: 'Invalid or inactive promo code.' });
        }

        // Check Product Type Scope ✨
        if (productType && promo.appliesTo !== productType) {
            const scopeNames = { 
                TOKENS: 'Token Top-ups', 
                STOREFRONT_ACCESS: 'Storefront Access', 
                STOREFRONT_PLANS: 'Customer Plans' 
            };
            return res.status(400).json({ 
                success: false, 
                message: `This code is only valid for ${scopeNames[promo.appliesTo] || 'other products'}.` 
            });
        }

        // Check Targeting 🎯
        if (promo.targetId && normalizePhoneNumber(userId) !== normalizePhoneNumber(promo.targetId)) {
            return res.status(403).json({ success: false, message: 'This promo code is restricted to a specific user.' });
        }

        // Check Product Specificity 📦
        if (promo.targetProductId && productId !== promo.targetProductId) {
            return res.status(400).json({ success: false, message: 'This promo code is only valid for a specific plan or package.' });
        }

        // Check One-Time Per User 🔒
        if (promo.oneTimePerUser) {
            const searchId = normalizePhoneNumber(userId) || userId;
            const alreadyUsed = await Payment.exists({ 
                $or: [{ userId: searchId }, { phoneNumber: searchId }],
                promoId: promo._id, 
                status: 'success' 
            });
            if (alreadyUsed) {
                return res.status(400).json({ success: false, message: 'You have already used this promo code.' });
            }
        }

        // Check Expiry
        if (new Date() > promo.expiryDate) {
            return res.status(400).json({ success: false, message: 'This promo code has expired.' });
        }

        // Check Usage Limit
        if (promo.usageCount >= promo.usageLimit) {
            return res.status(400).json({ success: false, message: 'This promo code has reached its usage limit.' });
        }

        // Calculate Discount
        let discount = 0;
        if (promo.discountType === 'PERCENTAGE') {
            discount = (promo.discountValue / 100) * amount;
        } else {
            discount = promo.discountValue;
        }

        const finalAmount = Math.max(1, amount - discount); // Minimum KES 1

        return res.status(200).json({
            success: true,
            promoId: promo._id,
            discount: Math.floor(discount),
            finalAmount: Math.floor(finalAmount),
            message: `Promo code applied! Enjoy KES ${Math.floor(discount)} off.`
        });

    } catch (error) {
        console.error('Promo validation error:', error);
        res.status(500).json({ success: false, message: 'Error validating promo code.' });
    }
});

/**
 * GET /api/promo/seller/:userId
 * Returns all promo codes created by a specific seller.
 */
router.get('/seller/:userId', async (req, res) => {
    try {
        const userId = normalizePhoneNumber(req.params.userId) || req.params.userId;
        const promos = await PromoCode.find({ creatorId: userId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, promos });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching promo codes.' });
    }
});

/**
 * POST /api/promo/create
 * Creates a new promo code for a seller.
 */
router.post('/create', async (req, res) => {
    const { 
        code, creatorId, discountType, discountValue, 
        usageLimit, expiryDays, appliesTo,
        targetId, targetProductId, oneTimePerUser
    } = req.body;
    
    try {
        const normalizedId = normalizePhoneNumber(creatorId) || creatorId;
        const normalizedCode = code.toUpperCase().trim();
        
        // Ensure code doesn't exist globally
        const existing = await PromoCode.findOne({ code: normalizedCode });
        if (existing) {
            return res.status(400).json({ success: false, message: 'This promo code already exists. Please choose a unique name.' });
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (expiryDays || 30));

        const newPromo = new PromoCode({
            code: normalizedCode,
            creatorId: normalizedId,
            type: normalizedId === 'ADMIN' ? 'PLATFORM' : 'SELLER',
            discountType,
            discountValue,
            usageLimit,
            expiryDate,
            appliesTo: appliesTo || 'STOREFRONT_PLANS',
            targetId: targetId ? normalizePhoneNumber(targetId) || targetId : null,
            targetProductId: targetProductId || null,
            oneTimePerUser: oneTimePerUser || false
        });

        await newPromo.save();
        res.status(201).json({ success: true, promo: newPromo });

    } catch (error) {
        console.error('Error creating promo:', error);
        res.status(500).json({ success: false, message: 'Error creating promo code.' });
    }
});

/**
 * DELETE /api/promo/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        await PromoCode.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Promo code deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting promo code.' });
    }
});

module.exports = router;
