// models/dataPlanModel.js
const mongoose = require('mongoose');

const DataPlanSchema = new mongoose.Schema({
  id: { type: String, required: true },
  planName: { type: String, required: true },
  ussdCodeTemplate: { type: String, required: true },
  amount: { type: Number, required: true },
  placeholder: { type: String, required: true },
});

// Explicitly set 'dataplans' as the collection name
module.exports = mongoose.model('DataPlan', DataPlanSchema, 'dataplans');