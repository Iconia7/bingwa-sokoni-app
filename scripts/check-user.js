// scripts/check-user.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/userModel');

const MONGO_URI = process.env.MONGO_URI;

async function checkUser() {
    try {
        await mongoose.connect(MONGO_URI);
        const search = '0115332870';
        console.log(`🔍 Searching for variants of: ${search}`);

        // Try exact, and variants
        const variants = [search, '254' + search.substring(1), '+' + '254' + search.substring(1)];
        
        for (const v of variants) {
            const user = await User.findOne({ phoneNumber: v });
            if (user) {
                console.log(`✅ FOUND! Format: "${v}" -> UserID: ${user.userId}`);
            } else {
                console.log(`❌ Not found: "${v}"`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkUser();
