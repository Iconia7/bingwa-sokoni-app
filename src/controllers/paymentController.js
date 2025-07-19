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

const handlePayHeroCallback = async (req, res) => {
  const cb = req.body?.response;
  // Ensure the callback structure is as expected and contains essential fields
  if (!cb || typeof cb.ResultCode !== 'number' || !cb.ExternalReference || !cb.Amount) {
    console.warn('Invalid callback payload received:', req.body);
    return res.status(400).json({ success: false, message: 'Invalid callback payload' });
  }

  // Parse ExternalReference to extract userId and packageId
  const [_, userId, packageId, timestamp] = cb.ExternalReference.split('-');

  // Find the package using the packageId from the external reference
  const packageEntry = tokenPackages[packageId];

  // Log all relevant callback data for debugging
  console.log(`PayHero Callback Received:
    ResultCode: ${cb.ResultCode},
    Amount: ${cb.Amount},
    ExternalReference: ${cb.ExternalReference},
    userId: ${userId},
    packageId: ${packageId},
    packageEntry found: ${!!packageEntry}`
  );

  // Check for successful payment and valid data
  if (cb.ResultCode === 0 && userId && packageEntry && packageEntry.price === cb.Amount) {
    try {
      await userModel.addTokens(userId, packageEntry.tokens);
      console.log(`✅ Tokens added for user ${userId}: ${packageEntry.tokens}`);
      return res.status(200).json({ success: true, message: 'Tokens successfully added.' });
    } catch (tokenUpdateError) {
      console.error(`❌ Error adding tokens for user ${userId} on callback:`, tokenUpdateError);
      // Even if token update fails, acknowledge PayHero's callback as received
      return res.status(200).json({ success: true, message: 'Payment confirmed, but token update failed.' });
    }
  } else {
    // Payment failed or data mismatch
    console.warn(`❌ Payment callback not successful for ${cb.ExternalReference}. ResultCode: ${cb.ResultCode}, Amount: ${cb.Amount}`);
    if (!userId) console.warn('User ID missing from ExternalReference.');
    if (!packageEntry) console.warn('Package entry not found for packageId:', packageId);
    if (packageEntry && packageEntry.price !== cb.Amount) console.warn(`Amount mismatch: Expected ${packageEntry.price}, got ${cb.Amount}`);

    // Always return 200 to PayHero to acknowledge receipt of the callback,
    // regardless of whether we processed it as a success or not.
    return res.status(200).json({ success: true, message: 'Callback received, no tokens added due to status or data mismatch.' });
  }
};

const getUserTokens = async (req, res) => {
  try {
    const tokens = await userModel.getTokensBalance(req.params.userId); // Corrected function name
    if (tokens === null) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, tokens });
  } catch (err) {
    console.error("Error fetching user tokens:", err);
    return res.status(500).json({ success: false, message: 'Token fetch failed' });
  }
};

module.exports = { initiatePayHeroPush, handlePayHeroCallback, getUserTokens };