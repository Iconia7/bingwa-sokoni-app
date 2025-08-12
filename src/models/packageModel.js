// models/packageModel.js
const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  tokens: { type: Number, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  isSubscription: {
    type: Boolean,
    default: false, // Default to false for your existing token packages
  },
  durationDays: {
    type: Number,
    default: 0, // Duration in days (e.g., 7 or 30)
  },
});

module.exports = mongoose.model('Package', PackageSchema);