const axios = require('axios');
const https = require('https');
const userModel = require('../models/userModel');
const Package = require('../models/packageModel');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper'); // 1. IMPORT YOUR PACKAGE MODEL

const agent = new https.Agent({
  rejectUnauthorized: false // Use only for development
});

// 2. DELETE the old hardcoded tokenPackages map. We'll get this from the DB now.
// const tokenPackages = { ... };

const initiatePayHeroPush = async (req, res) => {
  console.log("Received payment initiation request:", req.body);
  const { userId, amount, phoneNumber, packageId, customerName } = req.body;

  try {
    // 3. FETCH the package from the database instead of the hardcoded map
    const packageFromDB = await Package.findOne({ id: packageId });

    // 4. VALIDATE against the data from the database
    if (!userId || !amount || !phoneNumber || !packageId || !packageFromDB || packageFromDB.amount !== amount) {
      return res.status(400).json({ success: false, message: 'Invalid input.' });
    }

    await userModel.setPhoneNumber(userId, phoneNumber);

    const payload = {
      amount,
      phone_number: phoneNumber,
      channel_id: parseInt(process.env.PAYHERO_CHANNEL_ID),
      provider: "m-pesa",
      external_reference: `INV-${userId}-${packageId}-${Date.now()}`,
      callback_url: process.env.PAYHERO_CALLBACK_URL,
      customer_name: customerName || "PayHero User"
    };

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

const handlePayHeroCallback = async (req, res) => {
  const cb = req.body?.response;
  if (!cb || !cb.ExternalReference) {
    return res.status(400).json({ success: false, message: 'Invalid callback payload' });
  }
  
  const parts = cb.ExternalReference.split('-');
  parts.pop();
  const packageId = parts.pop();
  const userId = parts.slice(1).join('-');

  const resultCode = cb.ResultCode ?? (cb.MPESA_Reference ? 0 : 1);
  const amount = cb.Amount;
  
  // 5. FETCH the package from the database here as well
  const packageFromDB = await Package.findOne({ id: packageId });

  console.log(`PayHero Callback Received for userId: ${userId}, packageId: ${packageId}`);
  
  // 6. VALIDATE against the data from the database
  if (resultCode === 0 && userId && packageFromDB && packageFromDB.amount === amount) {
    try {
      await userModel.addTokens(userId, packageFromDB.tokens);
      console.log(`✅ Tokens added for user ${userId}: ${packageFromDB.tokens}`);
      
      const successMessage = `Hello! Your payment was successful. 🎉\n\n${packageFromDB.tokens} tokens have been added to your account.\n\nThank you for using Bingwa Sokoni!`;
      
      // Assuming the phone number is in the callback or you can fetch it
      const user = await userModel.getUser(userId);
      if(user && user.phoneNumber) {
          // You can re-enable your WhatsApp helper here if you want
          await sendWhatsAppMessage(user.phoneNumber, successMessage);
      }
      
      return res.status(200).json({ success: true, message: 'Tokens successfully added.' });
    } catch (tokenUpdateError) {
      console.error(`❌ Error adding tokens for user ${userId}:`, tokenUpdateError);
      return res.status(200).json({ success: true, message: 'Payment confirmed, but token update failed.' });
    }
  } else {
    console.warn(`❌ Payment callback not successful for ${cb.ExternalReference}.`);
    return res.status(200).json({ success: true, message: 'Callback received, no tokens added.' });
  }
};

module.exports = { initiatePayHeroPush, handlePayHeroCallback };