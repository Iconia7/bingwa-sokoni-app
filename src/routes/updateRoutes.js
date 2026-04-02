const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/check', (req, res) => {
    try {
        // Read the config file on every request so you don't need to restart the server when you change it
        const configPath = path.join(__dirname, '../../update-config.json');
        
        if (fs.existsSync(configPath)) {
            const rawData = fs.readFileSync(configPath);
            const updateConfig = JSON.parse(rawData);
            
            // Allow checking against current version sent by the app
            const clientVersion = req.query.currentVersion;
            
            if (clientVersion && clientVersion === updateConfig.latestVersion) {
                return res.json({ updateAvailable: false });
            }
            
            return res.json(updateConfig);
        } else {
            return res.status(500).json({ error: 'Update config file not found' });
        }
    } catch (error) {
        console.error("Error reading update config:", error);
        return res.status(500).json({ error: 'Failed to read update configuration' });
    }
});

// Dedicated route to serve the APK file to bypass potential static file proxy issues
router.get('/download', (req, res) => {
    const apkPath = path.join(__dirname, '../../public/update.apk');
    if (fs.existsSync(apkPath)) {
        res.download(apkPath, 'BingwaSokoniUpdate.apk');
    } else {
        res.status(404).json({ error: 'Update file not found on server' });
    }
});

module.exports = router;
