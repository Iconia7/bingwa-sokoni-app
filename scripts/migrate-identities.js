// scripts/migrate-identities.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/userModel');
const { normalizePhoneNumber } = require('../src/utils/phoneUtils');

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
    console.log('🚀 Starting Identity Migration: UUID -> Phone ID...');
    
    try {
        await mongoose.connect(MONGO_URI);
        const users = await User.find({});
        console.log(`📊 Processing ${users.length} users.`);

        for (const user of users) {
            const isPhoneId = /^\d+$/.test(user.userId.replace(/\+/g, ''));
            
            if (!isPhoneId && user.phoneNumber) {
                const normalized = normalizePhoneNumber(user.phoneNumber);
                
                if (normalized) {
                    console.log(`🔄 [MIGRATE] user ${user.userId} has valid phoneNumber ${normalized}.`);
                    
                    // Check if another user already has this ID
                    const existing = await User.findOne({ userId: normalized });
                    
                    if (existing) {
                        console.warn(`⚠️ [CONFLICT] User ${normalized} already exists as a separate document. Skipping migration for UUID ${user.userId} to prevent duplication.`);
                        continue;
                    }

                    console.log(`✅ [SUCCESS] Changing UserID: ${user.userId} -> ${normalized}`);
                    user.userId = normalized;
                    await user.save();
                }
            }
        }
        
        console.log('\n✅ Migration complete. All valid users now use their phone number as their UserID.');

    } catch (err) {
        console.error('❌ Migration Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

migrate();
