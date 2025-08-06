const express = require('express');
const router = express.Router();
const {
  initiatePayHeroPush,
  handlePayHeroCallback,
  getUserTokens
} = require('../controllers/paymentController');

router.post('/initiate', initiatePayHeroPush);
router.post('/callback', handlePayHeroCallback); // Ensure this matches your PAYHERO_CALLBACK_URL
router.get('/status/:paymentId', async (req, res) => {
  const paymentId = req.params.paymentId;
  const payment = await PaymentModel.findById(paymentId);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  res.status(200).json({ status: payment.status });
});

// When PayHero confirms payment
router.post('/payhero/callback', async (req, res) => {
  const paymentId = req.body.external_reference;
  const status = req.body.status === 'completed' ? 'success' : 'failed';
  
  await PaymentModel.updateStatus(paymentId, status);
  
  // Add tokens if payment succeeded
  if (status === 'success') {
    const payment = await PaymentModel.findById(paymentId);
    await UserModel.addTokens(payment.userId, payment.tokens);
  }
  
  res.status(200).send('OK');
});

module.exports = router;
