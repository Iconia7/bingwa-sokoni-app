require('dotenv').config();
const mongoose = require('mongoose');
const DataPlan = require('../src/models/dataPlanModel');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const plans = await DataPlan.find({});
        console.log("Current Data Plans:");
        console.log(JSON.stringify(plans, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
