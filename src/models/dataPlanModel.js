// models/dataPlanModel.js
const mongoose = require('mongoose');

const DataPlanSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  ussdCodeTemplate: { type: String, required: true },
  amount: { type: Number, required: true },
  placeholder: { type: String, required: true },
});

module.exports = mongoose.model('DataPlan', DataPlanSchema);