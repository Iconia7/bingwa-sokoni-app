// utils/whatsappHelper.js

const axios = require('axios');

/**
 * Sends a WhatsApp text message using the PayHero API.
 * @param {string} phoneNumber The recipient's phone number (e.g., 0712345678).
 * @param {string} message The text message to send.
 */
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // CHANGE 1: Read the full Basic Auth token and session name directly.
    const basicAuthToken = process.env.PAYHERO_BASIC_AUTH;
    const sessionName = process.env.PAYHERO_WHATSAPP_SESSION;

    if (!basicAuthToken || !sessionName) {
      console.error('PAYHERO_BASIC_AUTH or PAYHERO_WHATSAPP_SESSION not configured in .env file.');
      return;
    }
    
    // CHANGE 2: The token is already encoded, so we just use it.
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': process.env.PAYHERO_BASIC_AUTH,
    };
    
    const data = {
      message: message,
      phone_number: phoneNumber,
      session: sessionName,
    };

    console.log(`Sending WhatsApp message to ${phoneNumber}...`);
    await axios.post('https://backend.payhero.co.ke/api/v2/whatspp/sendText', data, { headers });

    console.log(`✅ WhatsApp message sent successfully to ${phoneNumber}.`);
  
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
  }
};

module.exports = { sendWhatsAppMessage };