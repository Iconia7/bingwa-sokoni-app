const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  handleMpesaCallback
} = require('../controllers/paymentController');

// 1. Initiate M-Pesa Express (STK Push)
router.post('/initiate', initiatePayment);

// 2. M-Pesa Callback (Safaricom calls this)
router.post('/callback', handleMpesaCallback);

// 3. Status Check (Optional, for client-side polling)
router.get('/status/:checkoutRequestId', async (req, res) => {
    // In production, query your 'PendingPayment' model using CheckoutRequestID
    res.status(200).json({ success: true, message: "Status polling logic goes here." });
});

module.exports = router;
