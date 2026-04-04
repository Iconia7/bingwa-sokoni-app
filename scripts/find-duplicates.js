// scripts/find-duplicates.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/userModel');

async function findDuplicates() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB.');

        const duplicates = await User.aggregate([
            { $match: { phoneNumber: { $ne: null } } },
            { $group: {
                _id: "$phoneNumber",
                ids: { $push: "$userId" },
                count: { $sum: 1 }
            }},
            { $match: { count: { $gt: 1 } } }
        ]);

        console.log(`🔍 Found ${duplicates.length} phone numbers with duplicate records.`);

        for (const d of duplicates) {
            console.log(`📱 Phone: ${d._id} | Records: ${d.count}`);
            d.ids.forEach(id => console.log(`   - UserID: ${id}`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

findDuplicates();
