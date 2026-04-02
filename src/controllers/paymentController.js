const axios = require('axios');
const { User, ...userModel } = require('../models/userModel');
const Package = require('../models/packageModel');
const DataPlan = require('../models/dataPlanModel');
const Payment = require('../models/paymentModel'); // ✨ Track STK Push
const { sendSMS } = require('../utils/smsHelper');
const { initiateStkPush } = require('../utils/mpesaHelper');

/**
 * Endpoint to initiate M-Pesa STK Push.
 */
const initiatePayment = async (req, res) => {
    console.log("Received payment initiation request:", req.body);
    const { userId, amount, phoneNumber, packageId, customerName, purchaseType } = req.body;

    try {
        let productFromDB;
        const type = purchaseType || 'TokenPackage';

        if (type === 'DataPlan') {
            productFromDB = await DataPlan.findById(packageId);
        } else {
            productFromDB = await Package.findOne({ id: packageId });
        }

        if (!userId || !amount || !phoneNumber || !packageId || !productFromDB || productFromDB.amount !== amount) {
            return res.status(400).json({ success: false, message: 'Invalid input.' });
        }

        const user = await userModel.getUser(userId);
        if (phoneNumber) await userModel.setPhoneNumber(user.userId, phoneNumber);

        // 1. Initiate STK Push via Daraja
        const response = await initiateStkPush(
            phoneNumber,
            amount,
            userId, // AccountReference
            `Payment for ${productFromDB.label || productFromDB.planName}` // TransactionDesc
        );

        // 2. SAVE PENDING PAYMENT TO DB ✨
        // This is critical to map Safaricom's CheckoutRequestID back to our User
        await Payment.create({
            userId: user.userId,
            phoneNumber: phoneNumber,
            amount: amount,
            packageId: packageId,
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
            status: 'pending'
        });

        return res.status(200).json({
            success: true,
            message: '📲 Check your phone to complete payment.',
            response: response
        });
    } catch (err) {
        console.error("M-Pesa initiation error:", err.message);
        return res.status(500).json({ success: false, message: err.message || 'Payment initiation failed' });
    }
};

/**
 * Endpoint for public storefront purchases (direct to seller).
 */
const initiatePublicPayment = async (req, res) => {
    const { sellerUsername, amount, phoneNumber, packageId, targetPhoneNumber } = req.body;
    console.log(`🛍️ [PUBLIC] Payment initiation for seller: ${sellerUsername}`);

    try {
        const seller = await User.findOne({ username: sellerUsername.toLowerCase() });
        if (!seller || !seller.sellerTillNumber) {
            return res.status(404).json({ success: false, message: 'Seller not found or has no payment setup.' });
        }

        // 1. Find the plan INSIDE the seller's personalized list
        const productFromDB = (seller.selectedOffers || []).find(p => p.id === packageId);

        if (!productFromDB || Number(productFromDB.amount) !== Number(amount)) {
            return res.status(400).json({ success: false, message: 'Invalid plan or amount.' });
        }

        // 2. Initiate STK Push to the SELLER'S Till Number
        const response = await initiateStkPush(
            phoneNumber,
            amount,
            `BINGWA-${seller.userId}`, // Reference for automation
            `Plan: ${productFromDB.planName} (to ${targetPhoneNumber || phoneNumber})`,
            seller.sellerTillNumber,
            'CustomerBuyGoodsOnline'
        );

        // 3. Track the payment (Including the Target Number Override!)
        await Payment.create({
            userId: seller.userId,
            phoneNumber: phoneNumber, // Payer
            targetPhoneNumber: targetPhoneNumber || phoneNumber, // Recipient
            amount: amount,
            packageId: packageId,
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
            status: 'pending'
        });

        return res.status(200).json({
            success: true,
            message: '📲 Check your phone to complete payment.',
            checkoutRequestId: response.CheckoutRequestID
        });
    } catch (err) {
        console.error("Public M-Pesa initiation error:", err.message);
        return res.status(500).json({ success: false, message: 'Payment initiation failed' });
    }
};

/**
 * Handle Safaricom Daraja STK Callback.
 */
const handleMpesaCallback = async (req, res) => {
    try {
        // ✨ Layer 1: Secret Token Authentication
        const secret = req.query.secret;
        if (!secret || secret !== process.env.MPESA_WEBHOOK_SECRET) {
            console.error("🚨 UNAUTHORIZED WEBHOOK ATTEMPT BLOCKED. Invalid Secret.");
            return res.status(401).json({ success: false, message: "Unauthorized Request" });
        }

        const callbackData = req.body?.Body?.stkCallback;
        if (!callbackData) {
            return res.status(400).json({ success: false, message: "Invalid payload format" });
        }

        console.log("📥 M-Pesa Callback Received:", JSON.stringify(callbackData));

        const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

        // 1. Find the pending payment record ✨
        const pendingPayment = await Payment.findOne({ checkoutRequestId: CheckoutRequestID });

        if (!pendingPayment) {
            console.error(`❌ Payment Record [${CheckoutRequestID}] not found in DB.`);
            return res.status(200).json({ success: true, message: "Record not found." });
        }

        // ✨ Layer 2: Replay Attack Prevention (Prevent Double Spending)
        if (pendingPayment.status === 'success') {
            console.warn(`⚠️ REPLAY ATTACK BLOCKED: Session [${CheckoutRequestID}] is already processed.`);
            return res.status(200).json({ success: true, message: "Already processed." });
        }

        if (ResultCode === 0 && CallbackMetadata) {
            console.log(`✅ Success for User: ${pendingPayment.userId}`);

            // 2. Extract Metadata
            const meta = CallbackMetadata.Item;
            const receipt = meta.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            const amountPaid = meta.find(i => i.Name === 'Amount')?.Value;

            // ✨ Layer 3: Strict Amount Validation (Spoofed Payload Protection)
            if (amountPaid === undefined || parseFloat(amountPaid) !== parseFloat(pendingPayment.amount)) {
                console.error(`🚨 FRAUD ALERT MISMATCH: User paid [${amountPaid}], but database expected [${pendingPayment.amount}]`);
                pendingPayment.status = 'failed';
                if (receipt) pendingPayment.receiptNumber = receipt;
                await pendingPayment.save();
                return res.status(200).json({ success: true, message: "Amount mismatch detected. Transaction nullified." });
            }

            // 3. Update Payment Record
            pendingPayment.status = 'success';
            pendingPayment.receiptNumber = receipt;
            await pendingPayment.save();

            // 4. AWARD TOKENS OR EXTEND SUBSCRIPTION ✨
            const packageFromDB = await Package.findOne({ id: pendingPayment.packageId });
            if (packageFromDB) {
                const user = await User.findOne({ userId: pendingPayment.userId });
                let successMessage = "";

                if (packageFromDB.isSubscription) {
                    // DISTINGUISH BETWEEN STOREFRONT AND TOKENS
                    const isStorefront = packageFromDB.id.includes('storefront');
                    const subType = isStorefront ? 'storefront' : 'tokens';

                    const newExpiry = await userModel.extendSubscription(
                        pendingPayment.userId,
                        packageFromDB.durationDays || 30,
                        subType
                    );

                    const expiryString = new Date(newExpiry).toLocaleDateString('en-GB');

                    if (isStorefront) {
                        successMessage = `Congratulations! Your Bingwa Sokoni Storefront has been extended by ${packageFromDB.durationDays || 30} days. Your shop is active until ${expiryString}. Link: bs.nexoracreatives.co.ke/${user.username || 'setup'}`;
                    } else {
                        successMessage = `Congratulations! Your Unlimited Tokens subscription has been extended by ${packageFromDB.durationDays || 30} days. Valid until ${expiryString}.`;
                    }
                } else {
                    // AWARD TOKENS
                    await userModel.addTokens(pendingPayment.userId, packageFromDB.tokens);
                    successMessage = `Payment Received! ${packageFromDB.tokens} tokens added to your Bingwa Sokoni account ${pendingPayment.userId}. Enjoy the automation freedom. M-Pesa Receipt: ${receipt}`;
                }

                console.log(`💰 Processed ${packageFromDB.isSubscription ? 'Subscription' : 'Tokens'} for ${pendingPayment.userId}`);

                // 5. Send Notification (SMS) ✨
                if (user && user.phoneNumber) {
                    const formattedPhone = user.phoneNumber.startsWith('+') ? user.phoneNumber : `+${user.phoneNumber}`;
                    await sendSMS(formattedPhone, successMessage);
                }
            }
        } else {
            console.warn(`❌ Payment Failed for [${CheckoutRequestID}]: ${ResultDesc}`);
            pendingPayment.status = 'failed';
            await pendingPayment.save();
        }
    } catch (error) {
        console.error('❌ Error processing M-Pesa webhook:', error);
    }

    return res.status(200).json({ success: true, message: "Webhook processed." });
};

/**
 * GET /api/payments/details/:receiptNumber
 * Public/App endpoint to resolve specific recipient for a transaction.
 */
const getPaymentDetailsByReceipt = async (req, res) => {
    try {
        const { receiptNumber } = req.params;
        const payment = await Payment.findOne({ receiptNumber: receiptNumber });

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }

        res.status(200).json({
            success: true,
            targetPhoneNumber: payment.targetPhoneNumber || payment.phoneNumber, // Fallback to payer if no override
            packageId: payment.packageId,
            userId: payment.userId
        });
    } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    initiatePayment,
    initiatePublicPayment,
    handleMpesaCallback,
    getPaymentDetailsByReceipt
};