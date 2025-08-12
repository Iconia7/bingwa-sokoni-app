const axios = require('axios');
const https = require('https');
const { User, ...userModel } = require('../models/userModel');
const Package = require('../models/packageModel');
const DataPlan = require('../models/dataPlanModel');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');

const agent = new https.Agent({
  rejectUnauthorized: false
});

const initiatePayHeroPush = async (req, res) => {
  console.log("Received payment initiation request:", req.body);
  const { userId, amount, phoneNumber, packageId, customerName, purchaseType } = req.body;

  try {
    let productFromDB;
    let channelId;
    const type = purchaseType || 'TokenPackage'; // Default to 'TokenPackage' if type is missing (from old app)

    // --- THIS IS THE FIX: USE THE CORRECT QUERY FOR EACH TYPE ---
    if (type === 'DataPlan') {
      // For the website, find by the unique MongoDB _id 
      productFromDB = await DataPlan.findById(packageId);
      channelId = process.env.PAYHERO_CHANNEL_ID_WEBSITE;  
    } else { 
      // For the Flutter app, find by your custom 'id' field (e.g., 'package_50')
      productFromDB = await Package.findOne({ id: packageId });
      channelId = process.env.PAYHERO_CHANNEL_ID_APP;
    }
    // --- END OF FIX ---

    if (!userId || !amount || !phoneNumber || !packageId || !productFromDB || productFromDB.amount !== amount) {
      return res.status(400).json({ success: false, message: 'Invalid input.' });
    }

    const user = await userModel.getUser(userId);
    await userModel.setPhoneNumber(user.userId, phoneNumber);

    const payload = {
      amount,
      phone_number: phoneNumber,
      channel_id: parseInt(channelId),
      provider: "m-pesa",
      // Use the correct product ID (_id from DB for uniqueness) in the reference
      external_reference: `INV-${userId}-${type}-${productFromDB._id}-${Date.now()}`,
      callback_url: process.env.PAYHERO_CALLBACK_URL,
      customer_name: customerName || "Customer"
    };

    const response = await axios.post(
      "https://backend.payhero.co.ke/api/v2/payments",
      payload,
      {
        headers: { "Authorization": process.env.PAYHERO_BASIC_AUTH, "Content-Type": "application/json" },
        httpsAgent: agent
      }
    );
    return res.status(200).json({ success: true, response: response.data });
  } catch (err) {
    console.error("PayHero initiation error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
};

const handlePayHeroCallback = async (req, res) => {
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
                        // IT'S A SUBSCRIPTION! Activate it.
                        const now = new Date();
                        const expiryDate = new Date(now.setDate(now.getDate() + packageFromDB.durationDays));
                        
                        user.subscriptionType = packageFromDB.id;
                        user.subscriptionExpiry = expiryDate;
                        await user.save();
                        console.log(`✅ SUBSCRIPTION activated for user ${user.userId}. Expires on: ${expiryDate.toISOString()}`);
                        
                        // Send confirmation
                        if (user.phoneNumber) {
                            const successMessage = `Congratulations! Your ${packageFromDB.label} subscription is now active. Enjoy unlimited automated transactions!`;
                            await sendWhatsAppMessage(user.phoneNumber, successMessage);
                        }
                    } else {
                    await userModel.addTokens(user.userId, packageFromDB.tokens);
                    console.log(`✅ TOKENS awarded for user ${user.userId}: ${packageFromDB.tokens}`);
                    
                    if (user.phoneNumber) {
                        const successMessage = `Your purchase was successful! ${packageFromDB.tokens} tokens have been added to your account.`;
                        await sendWhatsAppMessage(user.phoneNumber, successMessage);
                    }}
                } else {
                    console.warn(`Webhook Warning: Amount or package mismatch for TokenPackage.`);
                }

            } else if (purchaseType === 'DataPlan') {
                const dataPlanFromDB = await DataPlan.findById(productId);
                
                // 3. Also validate the user here.
                if (dataPlanFromDB && Number(dataPlanFromDB.amount) === Number(callbackData.Amount)) {
                    console.log(`✅ DATA PLAN paid for by user ${user.userId}: ${dataPlanFromDB.planName}`);
                    
                    if (user.phoneNumber) {
                        const successMessage = `Hello! Your payment for ${dataPlanFromDB.planName} was successful. 🎉 Your bundle is being processed.`;
                        await sendWhatsAppMessage(user.phoneNumber, successMessage);
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
};

module.exports = { initiatePayHeroPush, handlePayHeroCallback };