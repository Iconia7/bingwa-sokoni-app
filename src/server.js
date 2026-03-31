// server.js
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        console.log('🚀 Finalizing production boot sequence...');
        
        // Ensure Database is connected BEFORE listening on port
        await connectDB();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Bingwa Sokoni ready on Port ${PORT}`);
            console.log(`📡 URL: https://bingwa.nexoracreatives.co.ke/api/health`);
        });
    } catch (error) {
        console.error('❌ FATAL BOOT ERROR:', error);
        process.exit(1);
    }
};

startServer();