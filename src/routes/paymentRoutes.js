const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  initiatePublicPayment,
  getPaymentDetailsByReceipt,
  handleMpesaCallback
} = require('../controllers/paymentController');

// 1. Initiate M-Pesa Express (STK Push)
router.post('/initiate', initiatePayment);

// 2. Public Storefront Initiation (No userId required, just username)
router.post('/public-stk', initiatePublicPayment);

// 3. Receipt Details Lookup (For "Buy for Other" override)
router.get('/details/:receiptNumber', getPaymentDetailsByReceipt);

// 2. M-Pesa Callback (Safaricom calls this)
router.post('/callback', handleMpesaCallback);

// 3. Status Check (Optional, for client-side polling)
router.get('/status/:checkoutRequestId', async (req, res) => {
    // In production, query your 'PendingPayment' model using CheckoutRequestID
    res.status(200).json({ success: true, message: "Status polling logic goes here." });
});

module.exports = router;
