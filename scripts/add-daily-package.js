require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('../src/models/packageModel');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const dailyPkg = new Package({
            id: 'sub_daily_unlimited',
            amount: 30, // To be determined
            tokens: 0,
            label: '1 Day Unlimited',
            icon: 'workspace_premium_outlined',
            isSubscription: true,
            durationDays: 1
        });

        await dailyPkg.save();
        console.log("✅ Successfully added Daily Unlimited token package.");

    } catch (err) {
        if (err.code === 11000) {
            console.log("Package sub_daily_unlimited already exists.");
        } else {
            console.error("❌ Error adding package:", err);
        }
    } finally {
        await mongoose.disconnect();
    }
}
run();
