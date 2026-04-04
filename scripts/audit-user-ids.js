// scripts/audit-user-ids.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/userModel');

async function audit() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({});
        console.log(`📊 Total Users: ${users.length}`);

        let phoneIds = 0;
        let uuidIds = 0;

        users.forEach(u => {
            if (/^\d+$/.test(u.userId.replace(/\+/g, ''))) {
                phoneIds++;
            } else {
                uuidIds++;
            }
        });

        console.log(`📱 Users with Phone-like UserIDs: ${phoneIds}`);
        console.log(`🆔 Users with UUID-like UserIDs: ${uuidIds}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

audit();
