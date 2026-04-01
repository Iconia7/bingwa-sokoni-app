const mongoose = require('mongoose');
require('dotenv').config();
const DataPlan = require('../models/dataPlanModel');

const defaultPlans = [
  {
    id: '1',
    planName: '250MB, 24hrs',
    ussdCodeTemplate: '*180*5*2*PN*6*1#',
    amount: 20,
    placeholder: 'PN',
  },
  {
    id: '2',
    planName: '1GB, 1hr',
    ussdCodeTemplate: '*180*5*2*PN*5*1#',
    amount: 23,
    placeholder: 'PN',
  },
  {
    id: '3',
    planName: '1.5GB, 3hrs',
    ussdCodeTemplate: '*180*5*2*PN*1*1#',
    amount: 50,
    placeholder: 'PN',
  },
  {
    id: '4',
    planName: '1GB, 24hrs',
    ussdCodeTemplate: '*180*5*2*PN*7*1#',
    amount: 99,
    placeholder: 'PN',
  },
  {
    id: '5',
    planName: '1.25GB, till Midnight',
    ussdCodeTemplate: '*180*5*2*PN*8*1#',
    amount: 55,
    placeholder: 'PN',
  },
  {
    id: '6',
    planName: '50mins, till Midnight',
    ussdCodeTemplate: '*456#',
    amount: 53,
    placeholder: 'PN',
  },
  {
    id: '7',
    planName: '1GB, 1HR',
    ussdCodeTemplate: '*555*1*9*2*PN*1*1#',
    amount: 19,
    placeholder: 'PN',
  },
  {
    id: '8',
    planName: '1.5GB, 3HRS',
    ussdCodeTemplate: '*555*1*9*3*PN*1*1#',
    amount: 52,
    placeholder: 'PN',
  },
  {
    id: '9',
    planName: '2GB, 24hrs',
    ussdCodeTemplate: '*555*1*9*1*PN*1*1#',
    amount: 110,
    placeholder: 'PN',
  },
  {
    id: '10',
    planName: '43mins, 3hrs',
    ussdCodeTemplate: '*444#',
    amount: 24,
    placeholder: 'PN',
  },
  {
    id: '11',
    planName: '20mins, till Midnight',
    ussdCodeTemplate: '*444*5*1*PN*3*1*1#',
    amount: 22,
    placeholder: 'PN',
  },
  {
    id: '12',
    planName: '20sms, 24hrs',
    ussdCodeTemplate: '*188*7*1*1*PN*1*2#',
    amount: 5,
    placeholder: 'PN',
  },
  {
    id: '13',
    planName: '200sms, 24hrs',
    ussdCodeTemplate: '*188*7*1*2*PN*1*2#',
    amount: 10,
    placeholder: 'PN',
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bingwa');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing plans
    await DataPlan.deleteMany({});
    console.log('Cleared existing DataPlans.');

    // Insert new plans
    await DataPlan.insertMany(defaultPlans);
    console.log(`Successfully seeded ${defaultPlans.length} DataPlans!`);

    process.exit();
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
};

seedDB();
