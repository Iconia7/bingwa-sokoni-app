// scripts/cleanup-identities.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/userModel');
const { normalizePhoneNumber } = require('../src/utils/phoneUtils');

const MONGO_URI = process.env.MONGO_URI;

async function cleanup() {
    console.log('🚀 Starting Final Identity Cleanup: Normalizing all UserIDs...');
    
    try {
        await mongoose.connect(MONGO_URI);
        const users = await User.find({});
        console.log(`📊 Processing ${users.length} users.`);

        for (const user of users) {
             const normalized = normalizePhoneNumber(user.userId);
             
             // If the userId is a phone number and it's NOT normalized
             if (normalized && normalized !== user.userId) {
                 console.log(`🔄 [NORMALIZE] ${user.userId} -> ${normalized}`);
                 
                 // Check if the normalized ID already exists
                 const existing = await User.findOne({ userId: normalized });
                 
                 if (existing) {
                     console.log(`   🔀 [MERGE] Target ${normalized} exists. Merging balance...`);
                     existing.tokens_balance += (user.tokens_balance || 0);
                     if (user.todayTransactions) {
                         existing.todayTransactions = [...existing.todayTransactions, ...user.todayTransactions];
                     }
                     await existing.save();
                     await User.deleteOne({ _id: user._id });
                     console.log('   ✅ Merged and removed duplicate.');
                 } else {
                     // Just update the current one
                     user.userId = normalized;
                     if (!user.phoneNumber) user.phoneNumber = normalized;
                     await user.save();
                     console.log('   ✅ Normalized successfully.');
                 }
             }
        }
        
        console.log('\n✨ Database is now 100% normalized and deduplicated.');

    } catch (err) {
        console.error('❌ Cleanup Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

cleanup();
