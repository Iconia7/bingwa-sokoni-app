const axios = require('axios');
const https = require('https');
const { User, ...userModel } = require('../models/userModel');
const Package = require('../models/packageModel');
const DataPlan = require('../models/dataPlanModel');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');

// Agent to bypass SSL certificate issues in development if needed.
const agent = new https.Agent({
  rejectUnauthorized: false 
});

/**
 * Initiates an STK push for either a Token Package or a Data Plan purchase.
 * It detects the purchase type based on the incoming request.
 */
const initiatePayHeroPush = async (req, res) => {
  console.log("Received payment initiation request:", req.body);
  const { userId, amount, phoneNumber, packageId, customerName, purchaseType } = req.body;

  try {
    let productFromDB;
    // If purchaseType is missing, we assume it's from the old Flutter app buying tokens.
    // Otherwise, we use the type sent from the request (e.g., the website).
    const type = purchaseType || 'TokenPackage';

    // Check the correct database collection based on the purchase type.
    if (type === 'DataPlan') {
      productFromDB = await DataPlan.findById(packageId);
    } else { // Assumes 'TokenPackage'
      productFromDB = await Package.findById(packageId);
    }

    // Universal validation check using the product we found.
    if (!userId || !amount || !phoneNumber || !packageId || !productFromDB || productFromDB.amount !== amount) {
      return res.status(400).json({ success: false, message: 'Invalid input. Please check the details and try again.' });
    }
    
    // Create the user if they don't exist, and save their phone number.
    const user = await userModel.getUser(userId);
    await userModel.setPhoneNumber(user.userId, phoneNumber);

    const payload = {
      amount,
      phone_number: phoneNumber,
      channel_id: parseInt(process.env.PAYHERO_CHANNEL_ID),
      provider: "m-pesa",
      // The external reference now includes the type, which is crucial for the webhook.
      external_reference: `INV-${userId}-${type}-${productFromDB._id}-${Date.now()}`,
      callback_url: process.env.PAYHERO_CALLBACK_URL,
      customer_name: customerName || "Valued Customer"
    };

    // Make the API call to PayHero.
    const response = await axios.post(
      "https://backend.payhero.co.ke/api/v2/payments",
      payload,
      {
        headers: {
          "Authorization": process.env.PAYHERO_BASIC_AUTH,
          "Content-Type": "application/json"
        },
        httpsAgent: agent
      }
    );

    return res.status(200).json({ success: true, response: response.data });

  } catch (err) {
    console.error("PayHero initiation error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
};

/**
 * Handles the webhook callback from PayHero after a payment is completed.
 * It correctly identifies the purchase type and processes the order.
 */
const handlePayHeroCallback = async (req, res) => {
  const callbackData = req.body;
  
  if (!callbackData || !callbackData.ExternalReference) {
    return res.status(200).json({ success: true, message: "Webhook received, but no reference found." });
  }
  
  // Parse the enhanced external reference to get all necessary details.
  const parts = callbackData.ExternalReference.split('-');
  parts.pop(); // Remove timestamp
  const productId = parts.pop();
  const purchaseType = parts.pop();
  const userId = parts.slice(1).join('-');

  if (callbackData.success && callbackData.MPESA_Reference) {
    try {
      if (purchaseType === 'TokenPackage') {
        // --- LOGIC FOR AWARDING TOKENS ---
        const packageFromDB = await Package.findById(productId);
        if (packageFromDB && packageFromDB.amount === callbackData.Amount) {
          await userModel.addTokens(userId, packageFromDB.tokens);
          console.log(`✅ TOKENS awarded for user ${userId}: ${packageFromDB.tokens}`);
        }
      } else if (purchaseType === 'DataPlan') {
        // --- LOGIC FOR FULFILLING DATA PLAN ---
        const dataPlanFromDB = await DataPlan.findById(productId);
        if (dataPlanFromDB && dataPlanFromDB.amount === callbackData.Amount) {
          console.log(`✅ DATA PLAN paid for by user ${userId}: ${dataPlanFromDB.planName}`);
          
          // Your worker app will now fulfill this. In the meantime, send a confirmation.
          const user = await userModel.getUser(userId);
          if (user && user.phoneNumber) {
            const successMessage = `Hello! Your payment for ${dataPlanFromDB.planName} was successful. 🎉 Your bundle is being processed.`;
            await sendWhatsAppMessage(user.phoneNumber, successMessage);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing callback:`, error);
    }
  }

  // Always return 200 to PayHero to acknowledge receipt of the webhook.
  return res.status(200).json({ success: true, message: 'Webhook processed.' });
};

module.exports = { initiatePayHeroPush, handlePayHeroCallback };