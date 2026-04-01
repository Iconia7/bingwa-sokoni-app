const AfricasTalking = require('africastalking');

// Initialize Africa's Talking with credentials from .env
const username = process.env.AT_USERNAME || 'sandbox';
const apiKey = process.env.AT_API_KEY;
const senderId = process.env.AT_SENDER_ID; // Your approved Sender ID (e.g., 'BINGWA')

const at = AfricasTalking({
    apiKey: apiKey || 'placeholder',
    username: username
});

console.log(`📡 [INFO] Initializing AT SDK for user: "${username}" (${username === 'sandbox' ? 'SANDBOX' : 'PRODUCTION'})`);

const sms = at.SMS;

/**
 * Sends an SMS message using Africa's Talking.
 * @param {string} to - Recipient phone number (format: +254XXXXXXXXX).
 * @param {string} message - The message content.
 * @returns {Promise<object>} The result from Africa's Talking API.
 */
const sendSMS = async (to, message) => {
    try {
        const options = {
            to: [to],
            message: message
        };

        // Only include 'from' if we have a valid-looking Sender ID
        if (senderId && senderId.trim().length > 0) {
            options.from = senderId.trim();
        }

        console.log(`📡 [SMS] Attempting dispatch to ${to} (SenderId: ${options.from || 'System Default'})`);

        const result = await sms.send(options);

        // Log detailed response for production monitoring
        if (result.SMSMessageData && result.SMSMessageData.Recipients) {
            result.SMSMessageData.Recipients.forEach(recipient => {
                console.log(`📡 [PRODUCTION] AT Status [${recipient.number}]: ${recipient.status} - Cost: ${recipient.cost}`);
            });
        }

        return result;
    } catch (error) {
        console.error(`❌ Africa's Talking API Error:`, error.message);
        throw error;
    }
};

module.exports = {
    sendSMS
};
