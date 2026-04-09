require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('../src/models/packageModel');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const pkgs = await Package.find({});
        console.log("Current Packages:");
        console.log(JSON.stringify(pkgs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
