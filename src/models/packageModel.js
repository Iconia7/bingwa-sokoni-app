// models/packageModel.js
const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  tokens: { type: Number, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
});

module.exports = mongoose.model('Package', PackageSchema);