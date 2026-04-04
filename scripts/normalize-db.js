// scripts/normalize-db.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/userModel');
const { normalizePhoneNumber } = require('../src/utils/phoneUtils');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
}

async function startMigration() {
    console.log('🚀 Starting Phone Number Normalization Migration...');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('📦 Connected to MongoDB.');

        const users = await User.find({ phoneNumber: { $ne: null } });
        console.log(`🔍 Found ${users.length} users with phone numbers.`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            const original = user.phoneNumber;
            const normalized = normalizePhoneNumber(original);

            if (normalized && normalized !== original) {
                console.log(`✅ [${user.userId}] Normalizing: ${original} -> ${normalized}`);
                user.phoneNumber = normalized;
                await user.save();
                updatedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log('\n--- Migration Finished ---');
        console.log(`✅ Successfully Normalized: ${updatedCount}`);
        console.log(`⏭️ Already Standardized/Skipped: ${skippedCount}`);
        console.log(`---------------------------\n`);

    } catch (err) {
        console.error('❌ Migration Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
        process.exit(0);
    }
}

startMigration();
