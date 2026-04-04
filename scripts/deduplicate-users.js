// scripts/deduplicate-users.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/userModel');
const { normalizePhoneNumber } = require('../src/utils/phoneUtils');

const MONGO_URI = process.env.MONGO_URI;

async function deduplicate() {
    console.log('🚀 Starting Database Deduplication: Merging Conflicts...');
    
    try {
        await mongoose.connect(MONGO_URI);
        
        // 1. Find all phone numbers that appear more than once
        const duplicates = await User.aggregate([
            { $match: { phoneNumber: { $ne: null } } },
            { $group: {
                _id: "$phoneNumber",
                docs: { $push: "$$ROOT" },
                count: { $sum: 1 }
            }},
            { $match: { count: { $gt: 1 } } }
        ]);

        console.log(`🔍 Found ${duplicates.length} phone numbers with duplicate records.`);

        for (const group of duplicates) {
            const phone = group._id;
            const normalized = normalizePhoneNumber(phone);
            console.log(`📱 Processing: ${phone}`);

            // 2. Identify the "Principal" user (Preferably the one with userId as Phone)
            let principal = group.docs.find(u => u.userId === normalized);
            if (!principal) {
                // Find any with userId as phone (any format)
                principal = group.docs.find(u => u.userId === phone);
            }
            if (!principal) {
                // Default to the oldest record
                principal = group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
            }

            console.log(`   🌟 Principal Account: ${principal.userId}`);

            // 3. Merge data from others into Principal
            const others = group.docs.filter(u => u.userId !== principal.userId);
            
            let totalTokensToAdd = 0;
            let transactionsToMove = [];

            for (const other of others) {
                console.log(`   ♻️ Merging from: ${other.userId}`);
                totalTokensToAdd += (other.tokens_balance || 0);
                if (other.todayTransactions) {
                    transactionsToMove = [...transactionsToMove, ...other.todayTransactions];
                }
            }

            // 4. Update Principal
            await User.updateOne(
                { userId: principal.userId },
                { 
                    $inc: { tokens_balance: totalTokensToAdd },
                    $push: { todayTransactions: { $each: transactionsToMove } },
                    $set: { phoneNumber: normalized } // Ensure correct normalized format
                }
            );

            // 5. Delete Duplicates
            const otherIds = others.map(u => u.userId);
            const deleteResult = await User.deleteMany({ userId: { $in: otherIds } });
            console.log(`   ✅ Successfully merged and deleted ${deleteResult.deletedCount} duplicate records.`);
        }
        
        console.log('\n✨ Deduplication complete. Database is clean and ready for Portal access!');

    } catch (err) {
        console.error('❌ Deduplication Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

deduplicate();
