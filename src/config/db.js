const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // We add { family: 4 } to force IPv4 and bypass VPS routing issues
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4 
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📡 Database Name: ${conn.connection.name}`);
    } catch (error) {
        console.error(`❌ DB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;