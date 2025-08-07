const axios = require('axios');
const https = require('https');
const userModel = require('../models/userModel');

const agent = new https.Agent({
  rejectUnauthorized: false // Only for dev, should be true in production
});

const tokenPackages = {
  package_100: { tokens: 50, price: 15 },
  package_500: { tokens: 150, price: 35 },
  package_1000: { tokens: 250, price: 60 },
};

const initiatePayHeroPush = async (req, res) => {
  console.log("Received payment initiation request:", req.body);
  const { userId, amount, phoneNumber, packageId, customerName } = req.body;

  const selected = tokenPackages[packageId];
  if (!userId || !amount || !phoneNumber || !packageId || !selected || selected.price !== amount) {
    return res.status(400).json({ success: false, message: 'Invalid input.' });
  }

  // It's generally better to set the phone number during user registration
  // or have a dedicated endpoint for profile updates, rather than
  // doing it on every payment initiation. However, for a simple flow, it's acceptable.
  await userModel.setPhoneNumber(userId, phoneNumber);

  const payload = {
    amount,
    phone_number: phoneNumber,
    channel_id: parseInt(process.env.PAYHERO_CHANNEL_ID),
    provider: "m-pesa",
    external_reference: `INV-${userId}-${packageId}-${Date.now()}`, // Include packageId for callback verification
    callback_url: process.env.PAYHERO_CALLBACK_URL,
    customer_name: customerName || "PayHero User"
  };

  try {
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

// In paymentController.js

const handlePayHeroCallback = async (req, res) => {
  const cb = req.body?.response;
  if (!cb || !cb.ExternalReference) { // Simplified check
    console.warn('Invalid callback payload received:', req.body);
    return res.status(400).json({ success: false, message: 'Invalid callback payload' });
  }

  // --- FIX STARTS HERE ---
  // OLD BROKEN LINE:
  // const [_, userId, packageId, timestamp] = cb.ExternalReference.split('-');
  
  // NEW ROBUST LOGIC:
  const parts = cb.ExternalReference.split('-'); // Split into an array of parts
  parts.pop();                 // 1. Get the last part (timestamp)
  const packageId = parts.pop();                 // 2. Get the new last part (packageId)
  const userId = parts.slice(1).join('-');       // 3. Join the remaining middle parts back together to form the full User ID
  // --- FIX ENDS HERE ---

  const packageEntry = tokenPackages[packageId];
  const resultCode = cb.ResultCode ?? (cb.MPESA_Reference ? 0 : 1); // Handle different success indicators
  const amount = cb.Amount;

  // Log all relevant callback data for debugging
  console.log(`PayHero Callback Received:
    ResultCode: ${resultCode},
    Amount: ${amount},
    ExternalReference: ${cb.ExternalReference},
    userId: ${userId},
    packageId: ${packageId},
    packageEntry found: ${!!packageEntry}`
  );

  // Check for successful payment and valid data
  if (resultCode === 0 && userId && packageEntry && packageEntry.price === amount) {
    try {
      await userModel.addTokens(userId, packageEntry.tokens);
      console.log(`✅ Tokens added for user ${userId}: ${packageEntry.tokens}`);
      // Acknowledge the callback was received and processed successfully.
      return res.status(200).json({ success: true, message: 'Tokens successfully added.' });
    } catch (tokenUpdateError) {
      console.error(`❌ Error adding tokens for user ${userId} on callback:`, tokenUpdateError);
      // Even if token update fails, acknowledge PayHero's callback.
      return res.status(200).json({ success: true, message: 'Payment confirmed, but token update failed.' });
    }
  } else {
    // Payment failed or data mismatch
    console.warn(`❌ Payment callback not successful for ${cb.ExternalReference}. ResultCode: ${resultCode}, Amount: ${amount}`);
    if (!userId) console.warn('User ID missing from ExternalReference.');
    if (!packageEntry) console.warn('Package entry not found for packageId:', packageId);
    if (packageEntry && packageEntry.price !== amount) console.warn(`Amount mismatch: Expected ${packageEntry.price}, got ${amount}`);

    // Always return 200 to PayHero to acknowledge receipt of the callback
    return res.status(200).json({ success: true, message: 'Callback received, no tokens added due to status or data mismatch.' });
  }
};


module.exports = { initiatePayHeroPush, handlePayHeroCallback };