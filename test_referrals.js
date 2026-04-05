require('dotenv').config();
const mongoose = require('mongoose');
const { User, ...userModel } = require('./src/models/userModel');
const Payment = require('./src/models/paymentModel');
const PromoCode = require('./src/models/promoCodeModel');
const Package = require('./src/models/packageModel');
const DataPlan = require('./src/models/dataPlanModel');
const { handleMpesaCallback } = require('./src/controllers/paymentController');

// Configuration
process.env.MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/bingwa_sokoni';
process.env.MPESA_WEBHOOK_SECRET = process.env.MPESA_WEBHOOK_SECRET || 'test_secret';

async function runTest() {
    try {
        console.log('🚀 Starting Referral System Test...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to Database');

        // 1. Setup Test Data
        const referrerPhone = '254700000001';
        const refereePhone = '254700000002';
        const customerReferrer = '254711111111';

        // Clean up previous test runs
        await User.deleteMany({ userId: { $in: [referrerPhone, refereePhone] } });
        await Payment.deleteMany({ phoneNumber: { $in: [refereePhone, referrerPhone] } });
        await PromoCode.deleteMany({ creatorId: { $in: [referrerPhone, refereePhone] } });

        console.log('\n--- STEP 1: Seller-to-Seller Referral ---');
        
        // Create Referrer
        const referrer = await userModel.getUser(referrerPhone);
        console.log(`Referrer Code: ${referrer.referralCode}`);

        // Create Referee linked to Referrer
        const referee = await userModel.getUser(refereePhone);
        referee.referredBy = referrer.userId;
        await referee.save();
        console.log(`Referee ${refereePhone} linked to Referrer ${referrerPhone}`);

        // Mock a Token Purchase for Referee
        const testPackage = await Package.findOne({ isSubscription: false }) || await Package.create({
            id: 'test_pkg',
            label: 'Test 100 Tokens',
            amount: 100,
            tokens: 100,
            isSubscription: false,
            icon: '🪙'
        });

        console.log('Simulating payment webhook...');
        // We'll manually trigger the logic used in the webhook for testing
        // Logic from userRoutes.js payment-webhook
        const prevReferrerTokens = referrer.tokens_balance;
        
        // Mocking the reward logic
        if (referee.referredBy && !referee.successfullyReferred) {
            const refUser = await User.findOne({ userId: referee.referredBy });
            if (refUser) {
                const BONUS = 50;
                await userModel.addTokens(refUser.userId, BONUS);
                refUser.referralCount = (refUser.referralCount || 0) + 1;
                refUser.referralRewardsEarned = (refUser.referralRewardsEarned || 0) + BONUS;
                await refUser.save();
                
                referee.successfullyReferred = true;
                await referee.save();
                console.log(`✅ Success: Referrer earned 50 tokens!`);
            }
        }

        const updatedReferrer = await User.findOne({ userId: referrerPhone });
        console.log(`Referrer Tokens: ${prevReferrerTokens} -> ${updatedReferrer.tokens_balance}`);

        console.log('\n--- STEP 2: Customer-to-Customer Referral ---');

        // Mock a Storefront Transaction
        const checkoutId = 'TEST_CHECKOUT_' + Date.now();
        const payment = await Payment.create({
            userId: referrerPhone, // The store owner
            phoneNumber: refereePhone, // The buyer
            targetPhoneNumber: refereePhone,
            amount: 50,
            packageId: 'test_data_plan',
            checkoutRequestId: checkoutId,
            merchantRequestId: 'M_TEST_' + Date.now(),
            referrerPhone: customerReferrer, // 👈 THE REFERRER
            status: 'pending'
        });

        console.log(`Simulating M-Pesa Callback for storefront purchase...`);
        // Mock the callback body
        const mockReq = {
            query: { secret: process.env.MPESA_WEBHOOK_SECRET },
            body: {
                Body: {
                    stkCallback: {
                        CheckoutRequestID: checkoutId,
                        ResultCode: 0,
                        ResultDesc: 'Success',
                        CallbackMetadata: {
                            Item: [
                                { Name: 'MpesaReceiptNumber', Value: 'QKTEST123' },
                                { Name: 'Amount', Value: 50 }
                            ]
                        }
                    }
                }
            }
        };
        const mockRes = {
            status: () => ({ json: (data) => console.log('Callback Response:', data) })
        };

        // We need to ensure we have a "DataPlan" in DB for the callback to handle it
        await DataPlan.create({
            _id: 'test_data_plan',
            planName: 'Test 500MB',
            amount: 50,
            ussdCodeTemplate: '*123#'
        }).catch(() => {});

        // Run the callback handler
        await handleMpesaCallback(mockReq, mockRes);

        // Verify Promo Code Creation
        const rewardPromo = await PromoCode.findOne({ targetId: customerReferrer });
        if (rewardPromo) {
            console.log(`✅ Success: Promo Code created for referrer ${customerReferrer}`);
            console.log(`Code: ${rewardPromo.code} (${rewardPromo.discountValue}% off)`);
            console.log(`Usage Limit: ${rewardPromo.usageLimit} (One-time: ${rewardPromo.oneTimePerUser})`);
        } else {
            console.error('❌ Failed: Promo code not found for customer referrer.');
        }

        console.log('\n🌟 ALL TESTS COMPLETED 🌟');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
