const axios = require('axios');
require('dotenv').config();

/**
 * Generates a Safaricom Daraja Access Token using Consumer Key and Secret.
 */
const getAccessToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
        throw new Error('❌ M-Pesa Consumer Key or Secret is missing in .env');
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await axios.get(
            'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('❌ M-Pesa OAuth Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Initiates an M-Pesa Express (STK Push) request.
 * @param {string} phoneNumber - Recipient phone number (254XXXXXXXXX).
 * @param {number} amount - Amount to charge.
 * @param {string} accountReference - Reference for the transaction (e.g., Package ID).
 * @param {string} transactionDesc - Description of the transaction.
 * @param {string} partyB - The destination shortcode (Paybill or Till).
 * @param {string} transactionType - 'CustomerPayBillOnline' or 'CustomerBuyGoodsOnline'.
 */
const initiateStkPush = async (phoneNumber, amount, accountReference, transactionDesc, partyB = null, transactionType = null) => {
    try {
        const accessToken = await getAccessToken();
        const shortCode = process.env.MPESA_SHORTCODE;
        const passKey = process.env.MPESA_PASSKEY;
        const callbackUrl = process.env.MPESA_CALLBACK_URL;

        if (!shortCode || !passKey || !callbackUrl) {
            throw new Error('❌ M-Pesa ShortCode, PassKey, or CallbackURL is missing in .env');
        }

        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');

        const payload = {
            BusinessShortCode: shortCode, // Initiator code associated with credentials
            Password: password,
            Timestamp: timestamp,
            TransactionType: transactionType || 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: phoneNumber, // The user's phone number
            PartyB: partyB || shortCode, // Destination (Till or Paybill)
            PhoneNumber: phoneNumber,
            CallBackURL: `${callbackUrl}?secret=${process.env.MPESA_WEBHOOK_SECRET || ''}`,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc
        };

        const response = await axios.post(
            'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ M-Pesa STK Push Error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = { initiateStkPush };
