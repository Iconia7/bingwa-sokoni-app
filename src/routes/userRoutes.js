// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// Import both the helper functions AND the User model from your userModel file
const { User, ...userModel } = require('../models/userModel');
// Import the new model for tracking processed deductions
const ProcessedDeduction = require('../models/ProcessedDeduction');
const Package = require('../models/packageModel');
const { sendSMS } = require('../utils/smsHelper');
const DataPlan = require('../models/dataPlanModel');
const profileController = require('../controllers/profileController');
const { normalizePhoneNumber } = require('../utils/phoneUtils');

// --- Public Storefront Routes ---
router.get('/public/user/:username', profileController.getPublicProfile);

// --- User Profile Management Routes ---
router.get('/profile/:userId', profileController.getPrivateProfile);
router.get('/profile/check-username/:username', profileController.checkUsername);
router.post('/profile/update', profileController.updateProfile);

router.post('/register_anonymous', async (req, res) => {
    const { userId } = req.body; // The anonymous ID sent from Flutter

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const user = await userModel.getUser(userId); // This will create the user if they don't exist

        // Only grant initial tokens if they haven't been granted before for this user
        // (This logic is now primarily handled within userModel.getUser)
        // You might want to remove initial_tokens_granted from userModel and handle the check here
        // if you have more complex initial grant logic.
        // For now, the userModel.getUser handles initial creation and token grant.

        return res.status(200).json({
            success: true,
            message: 'Anonymous user registered/retrieved and initial tokens granted.',
            tokens: user.tokens_balance // Return current balance
        });

    } catch (error) {
        console.error('Error registering anonymous user:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during anonymous registration.' });
    }
});

// In src/routes/userRoutes.js

router.post('/deduct-token', async (req, res) => {
    const { userId } = req.body; 
    const normalizedId = normalizePhoneNumber(userId) || userId;

    if (!normalizedId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    try {
        const user = await User.findOne({ userId: normalizedId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const cost = 1;
        const previousBalance = user.tokens_balance;
        
        // 1. Check for Active Subscription first
        const now = new Date();
        const hasActiveSub = user.subscriptionExpiry && user.subscriptionExpiry > now;
        
        if (hasActiveSub) {
            return res.status(200).json({ 
                success: true, 
                message: 'Active subscription: Deduction skipped.',
                newBalance: user.tokens_balance,
                previousBalance: user.tokens_balance,
                consumed: 0
            });
        }
        const newBalance = await userModel.updateTokens(normalizedId, -1);
        return res.status(200).json({
            success: true,
            newBalance: newBalance
        });
    } catch (error) {
        console.error('Error deducting token:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.get('/:userId/tokens', async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    try {
        // --- START OF FIX ---
    const normalizedId = normalizePhoneNumber(userId) || userId;

    if (!normalizedId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    try {
        // Fetch the full user document to get all details
        let user = await User.findOne({ userId: normalizedId });

        if (!user) {
            // If the user doesn't exist, create them using your existing helper
            console.log(`User ${normalizedId} not found, creating a new one.`);
            user = await userModel.getUser(normalizedId);
        }

        // Return an object with token balance and BOTH subscription expiries
        return res.status(200).json({
            success: true,
            tokenBalance: user.tokens_balance,
            tokensSubscriptionExpiry: user.subscriptionExpiry ? user.subscriptionExpiry.toISOString() : null,
            storefrontSubscriptionExpiry: user.storefrontSubscriptionExpiry ? user.storefrontSubscriptionExpiry.toISOString() : null,
            // Keep legacy field for backward compatibility if needed by the app
            subscriptionExpiry: user.subscriptionExpiry ? user.subscriptionExpiry.toISOString() : null
        });
    } catch (error) {
        console.error('Error fetching token balance:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.post('/update_tokens', async (req, res) => {
    const { userId, amount } = req.body; // Amount can be positive or negative
    if (!userId || amount == null || typeof amount !== 'number') { // Ensure amount is a number
        return res.status(400).json({ success: false, message: 'User ID and a numeric amount are required.' });
    }
    try {
        const newBalance = await userModel.updateTokens(userId, amount); // Use updateTokens for general adjustments
        if (newBalance === null) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({
            success: true,
            message: 'Tokens updated successfully.',
            tokens: newBalance
        });
    } catch (error) {
        console.error('Error updating tokens:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during token update.' });
    }
});

router.get('/packages', async (req, res) => {
    try {
        // Fetch all documents from the 'packages' collection in the database
        const packages = await Package.find({});
        res.status(200).json({ success: true, packages: packages });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.get('/dataplans', async (req, res) => {
    try {
        // Find all documents in the 'dataplans' collection
        const plans = await DataPlan.find({});
        res.status(200).json({ success: true, dataplans: plans });
    } catch (error) {
        console.error('Error fetching data plans:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching data plans.' });
    }
});

// --- FINAL, CORRECTED PAYMENT WEBHOOK ROUTE ---
// In src/routes/userRoutes.js

router.post('/payment-webhook', async (req, res) => {
    try {
        const callbackData = req.body.response;

        if (!callbackData || !callbackData.ExternalReference) {
            return res.status(200).json({ success: true, message: "Webhook received, but no reference." });
        }

        const parts = callbackData.ExternalReference.split('-');
        parts.pop(); // timestamp
        const productId = parts.pop();
        const purchaseType = parts.pop();
        const userId = parts.slice(1).join('-');

        if (callbackData.ResultCode === 0) {
            // --- THIS IS THE UPDATED LOGIC ---
            // 1. Find the user FIRST.
            const user = await User.findOne({ userId: userId });

            if (!user) {
                console.warn(`Webhook Error: User with ID [${userId}] not found.`);
                return res.status(200).json({ success: true, message: 'Webhook processed, user not found.' });
            }

            if (purchaseType === 'TokenPackage') {
                const packageFromDB = await Package.findById(productId);

                // 2. Validate the user, package, AND amount.
                if (packageFromDB && Number(packageFromDB.amount) === Number(callbackData.Amount)) {
                    if (packageFromDB.isSubscription) {
                        // IT'S A SUBSCRIPTION!
                        const isStorefront = packageFromDB.id.includes('storefront');
                        const subType = isStorefront ? 'storefront' : 'tokens';

                        const newExpiry = await userModel.extendSubscription(user.userId, packageFromDB.durationDays || 30, subType);
                        
                        console.log(`✅ ${subType.toUpperCase()} activated for user ${user.userId}. Expires on: ${newExpiry.toISOString()}`);

                        // Send confirmation
                        if (user.phoneNumber) {
                            const formattedPhone = normalizePhoneNumber(user.phoneNumber);
                            const successMessage = isStorefront 
                                ? `Congratulations! Your Storefront access is now active. Expires on: ${newExpiry.toLocaleDateString()}. Build your shop at bs.nexoracreatives.co.ke/${user.username || 'setup'}`
                                : `Congratulations! Your ${packageFromDB.label} subscription is now active. Expires on: ${newExpiry.toLocaleDateString()}. Enjoy unlimited automated transactions!`;
                            await sendSMS(formattedPhone, successMessage);
                        }
                    } else {
                        await userModel.addTokens(user.userId, packageFromDB.tokens);
                        console.log(`✅ TOKENS awarded for user ${user.userId}: ${packageFromDB.tokens}`);

                        if (user.phoneNumber) {
                            const formattedPhone = user.phoneNumber.startsWith('+') ? user.phoneNumber : `+${user.phoneNumber}`;
                            const successMessage = `Your purchase was successful! ${packageFromDB.tokens} tokens have been added to your Bingwa Sokoni account ${user.userId}.`;
                            await sendSMS(formattedPhone, successMessage);
                        }
                    }
                } else {
                    console.warn(`Webhook Warning: Amount or package mismatch for TokenPackage.`);
                }

            } else if (purchaseType === 'DataPlan') {
                const dataPlanFromDB = await DataPlan.findById(productId);

                // 3. Also validate the user here.
                if (dataPlanFromDB && Number(dataPlanFromDB.amount) === Number(callbackData.Amount)) {
                    console.log(`✅ DATA PLAN paid for by user ${user.userId}: ${dataPlanFromDB.planName}`);

                    if (user.phoneNumber) {
                        const formattedPhone = user.phoneNumber.startsWith('254') ? `+${user.phoneNumber}` : user.phoneNumber;
                        const successMessage = `Hello! Your payment for ${dataPlanFromDB.planName} was successful. 🎉 Your bundle is being processed.`;
                        await sendSMS(formattedPhone, successMessage);
                    }
                } else {
                    console.warn(`Webhook Warning: Amount or package mismatch for DataPlan.`);
                }
            }
        } else {
            console.warn(`Payment failed or was cancelled by user. ResultCode: ${callbackData.ResultCode}`);
        }
    } catch (error) {
        console.error('Error processing payment webhook:', error);
    }

    return res.status(200).json({ success: true, message: "Webhook processed." });
});

// In src/routes/userRoutes.js

router.post('/sync-deductions', async (req, res) => {
    try {
        const { userId, deductions } = req.body;

        if (!userId || !deductions || !Array.isArray(deductions) || deductions.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid sync request.' });
        }

        const user = await User.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // --- THIS IS THE NEW LOGIC ---
        // Check if the user has an active TOKEN subscription
        if (user.subscriptionExpiry && user.subscriptionExpiry > new Date()) {
            console.log(`Sync for subscribed user ${userId}. Ignoring ${deductions.length} offline deductions.`);
            
            const incomingDeductionIds = deductions.map(d => d.deductionId);
            const processedDocs = incomingDeductionIds.map(id => ({ deductionId: id, userId: userId }));
            await ProcessedDeduction.insertMany(processedDocs);

            return res.status(200).json({ success: true, newBalance: user.tokens_balance });
        }
        // --- END OF NEW LOGIC ---

        // If the user is NOT subscribed, proceed with the existing deduction logic.
        const incomingDeductionIds = deductions.map(d => d.deductionId);
        const alreadyProcessed = await ProcessedDeduction.find({
            deductionId: { $in: incomingDeductionIds }
        }).select('deductionId');
        const processedIdsSet = new Set(alreadyProcessed.map(d => d.deductionId));

        const newDeductionsToProcess = deductions.filter(d => !processedIdsSet.has(d.deductionId));
        if (newDeductionsToProcess.length === 0) {
            return res.status(200).json({ success: true, newBalance: user.tokens_balance });
        }

        const totalTokensToDeduct = newDeductionsToProcess.length;
        // --- ATOMIC UPDATE ---
        const newBalance = await userModel.updateTokens(userId, -totalTokensToDeduct);

        const processedDocs = newDeductionsToProcess.map(d => ({ deductionId: d.deductionId, userId: userId }));
        try {
            // Use ordered: false so if a certain ID was already processed, it skips it and continues
            await ProcessedDeduction.insertMany(processedDocs, { ordered: false });
        } catch (err) {
            // This occurs if some records were duplicates (BulkWriteError)
            console.log(`Sync: Handled ${totalTokensToDeduct} records with some duplicates for ${userId}`);
        }

        console.log(`Successfully synced and deducted ${totalTokensToDeduct} tokens for user ${userId}.`);
        res.status(200).json({ success: true, newBalance: newBalance });

    } catch (error) {
        console.error('Error during token sync:', error);
        res.status(500).json({ success: false, message: 'Server error during sync.' });
    }
});

module.exports = router;