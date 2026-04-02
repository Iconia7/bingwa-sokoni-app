// models/dataPlanModel.js
const mongoose = require('mongoose');

const DataPlanSchema = new mongoose.Schema({
  id: { type: String, required: true },
  planName: { type: String, required: true },
  ussdCodeTemplate: { type: String, required: true },
  amount: { type: Number, required: true },
  placeholder: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Data', 'Minutes', 'SMS'], 
    default: 'Data' 
  },
  category: { 
    type: String, 
    enum: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Other'], 
    default: 'Daily' 
  },
  isMultiSession: { type: Boolean, default: false },
  sessionSteps: { type: [String], default: [] },
  buyingPrice: { type: Number, default: 0 },
});

// Explicitly set 'dataplans' as the collection name
module.exports = mongoose.model('DataPlan', DataPlanSchema, 'dataplans');