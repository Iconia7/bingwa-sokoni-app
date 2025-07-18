const express = require('express');
const router = express.Router();
const {
  initiatePayHeroPush,
  handlePayHeroCallback,
  getUserTokens
} = require('../controllers/paymentController');

router.post('/initiate', initiatePayHeroPush);
router.post('/callback', handlePayHeroCallback); // Ensure this matches your PAYHERO_CALLBACK_URL
router.get('/tokens/:userId', getUserTokens);

module.exports = router;
