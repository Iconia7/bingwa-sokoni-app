// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
// Import both the helper functions AND the User model from your userModel file
const { User, ...userModel } = require('../models/userModel'); 
// Import the new model for tracking processed deductions
const ProcessedDeduction = require('../models/ProcessedDeduction');
const Package = require('../models/packageModel');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const DataPlan = require('../models/dataPlanModel');

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
    const { userId } = req.body; // Flutter sends more, but we only need userId
    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    try {
        const newBalance = await userModel.updateTokens(userId, -1);
        if (newBalance === null) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        // FIX: Return the response format Flutter expects
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
        const balance = await userModel.getTokensBalance(userId);
        if (balance === null) {
            // To avoid errors in Flutter, we can create the user on the fly
            const newUser = await userModel.getUser(userId);
            return res.status(200).json({ success: true, tokenBalance: newUser.tokens_balance });
        }
        return res.status(200).json({ success: true, tokenBalance: balance });
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
router.post('/payment-webhook', async (req, res) => {
    const callbackData = req.body;
    console.log('Received payment webhook:', JSON.stringify(callbackData, null, 2));

    if (!callbackData || !callbackData.ExternalReference) {
        return res.status(200).json({ success: true, message: "Webhook received, but no reference found." });
    }
    
    // Parse the enhanced external reference to get all necessary details
    const parts = callbackData.ExternalReference.split('-');
    parts.pop(); // Remove timestamp
    const productId = parts.pop(); // This is the MongoDB _id of the product
    const purchaseType = parts.pop();
    const userId = parts.slice(1).join('-');

    if (callbackData.success && callbackData.MPESA_Reference) {
        try {
            if (purchaseType === 'TokenPackage') {
                const packageFromDB = await Package.findById(productId);
                
                // Validate the transaction amount
                if (packageFromDB && Number(packageFromDB.amount) === Number(callbackData.Amount)) {
                    await userModel.addTokens(userId, packageFromDB.tokens);
                    console.log(`✅ TOKENS awarded for user ${userId}: ${packageFromDB.tokens}`);
                    
                    // Optional: Send WhatsApp confirmation for token purchase
                    const user = await userModel.getUser(userId);
                    if(user && user.phoneNumber) {
                        const successMessage = `Your purchase was successful! ${packageFromDB.tokens} tokens have been added to your account.`;
                        await sendWhatsAppMessage(user.phoneNumber, successMessage);
                    }
                } else {
                    console.warn(`Webhook Warning: Amount or package mismatch for TokenPackage.`);
                }

            } else if (purchaseType === 'DataPlan') {
                const dataPlanFromDB = await DataPlan.findById(productId);
                
                // Validate the transaction amount
                if (dataPlanFromDB && Number(dataPlanFromDB.amount) === Number(callbackData.Amount)) {
                    console.log(`✅ DATA PLAN paid for by user ${userId}: ${dataPlanFromDB.planName}`);
                    
                    // Here, you would trigger your "worker" app via FCM.
                    // For now, we send a WhatsApp confirmation.
                    const user = await userModel.getUser(userId);
                    if (user && user.phoneNumber) {
                        const successMessage = `Hello! Your payment for ${dataPlanFromDB.planName} was successful. 🎉 Your bundle is being processed.`;
                        await sendWhatsAppMessage(user.phoneNumber, successMessage);
                    }
                } else {
                    console.warn(`Webhook Warning: Amount or package mismatch for DataPlan.`);
                }
            }
        } catch (error) {
            console.error(`❌ Error processing callback:`, error);
        }
    }
    
    // ALWAYS return 200 to PayHero to acknowledge receipt of the webhook
    return res.status(200).json({ success: true, message: 'Webhook processed.' });
});

router.post('/sync-deductions', async (req, res) => {
  try {
    const { userId, deductions } = req.body;

    // 1. Basic Validation
    if (!userId || !deductions || !Array.isArray(deductions) || deductions.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid sync request.' });
    }

    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // 2. Find out which deductions have already been processed
    const incomingDeductionIds = deductions.map(d => d.deductionId);
    const alreadyProcessed = await ProcessedDeduction.find({
      deductionId: { $in: incomingDeductionIds }
    }).select('deductionId');
    
    const processedIdsSet = new Set(alreadyProcessed.map(d => d.deductionId));

    // 3. Filter to get only the new, unprocessed deductions
    const newDeductionsToProcess = deductions.filter(
      d => !processedIdsSet.has(d.deductionId)
    );

    if (newDeductionsToProcess.length === 0) {
      console.log(`Sync request for user ${userId} had no new deductions.`);
      return res.status(200).json({ success: true, newBalance: user.tokens_balance });
    }

    // 4. Perform the deduction using your schema's field name `tokens_balance`
    const totalTokensToDeduct = newDeductionsToProcess.length;
    user.tokens_balance -= totalTokensToDeduct;
    if (user.tokens_balance < 0) {
      user.tokens_balance = 0; // Ensure tokens never go below zero
    }

    // 5. Record the IDs of the deductions we just processed
    const processedDocs = newDeductionsToProcess.map(d => ({
      deductionId: d.deductionId,
      userId: userId,
    }));
    await ProcessedDeduction.insertMany(processedDocs);
    
    // 6. Save the user with the new token balance
    await user.save();
    
    console.log(`Successfully synced and deducted ${totalTokensToDeduct} tokens for user ${userId}.`);

    // 7. Send the final, authoritative balance back to the app
    res.status(200).json({ success: true, newBalance: user.tokens_balance });

  } catch (error) {
    console.error('Error during token sync:', error);
    res.status(500).json({ success: false, message: 'Server error during sync.' });
  }
});

module.exports = router;