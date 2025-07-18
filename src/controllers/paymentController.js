const axios = require('axios');
const https = require('https');
const userModel = require('../models/userModel');

const agent = new https.Agent({
  rejectUnauthorized: false // Only for dev
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

  await userModel.setPhoneNumber(userId, phoneNumber); // Optional: update user record

  const payload = {
    amount,
    phone_number: phoneNumber,
    channel_id: parseInt(process.env.PAYHERO_CHANNEL_ID),
    provider: "m-pesa",
    external_reference: `INV-${userId}-${Date.now()}`,
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
    console.error(err.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
};

const handlePayHeroCallback = async (req, res) => {
  const cb = req.body?.response;
  if (!cb || typeof cb.ResultCode !== 'number' || !cb.ExternalReference) {
    return res.status(400).json({ success: false, message: 'Invalid callback payload' });
  }

  const [_, userId, timestamp] = cb.ExternalReference.split('-');
  const packageEntry = Object.values(tokenPackages).find(p => p.price == cb.Amount);

  if (cb.ResultCode === 0 && userId && packageEntry) {
    await userModel.addTokens(userId, packageEntry.tokens);
    return res.status(200).json({ success: true });
  }

  return res.status(200).json({ success: true, message: 'No action taken.' });
};

const getUserTokens = async (req, res) => {
  try {
    const tokens = await userModel.getUserTokens(req.params.userId);
    return res.status(200).json({ success: true, tokens });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Token fetch failed' });
  }
};

module.exports = { initiatePayHeroPush, handlePayHeroCallback, getUserTokens };
