const express = require('express');
const router = express.Router();
const { User } = require('../models/userModel');

// 1. Sync All: App pushes state, transactions, and offers
router.post('/sync-all', async (req, res) => {
    const { userId, deviceState, todayTransactions, availableOffers, airtimeBalance } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update Device State
        if (deviceState) {
            user.deviceState = {
                ...user.deviceState,
                ...deviceState,
                lastSeen: new Date(),
            };
        }

        // Update Transactions (Today only)
        if (todayTransactions) {
            user.todayTransactions = todayTransactions;
        }

        // Update Offers
        if (availableOffers) {
            user.availableOffers = availableOffers;
        }

        await user.save();

        res.json({ success: true, message: 'Sync successful.' });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// 2. Poll Commands: App fetches pending actions
router.get('/pending-commands/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const pendingCommands = user.remoteCommands.filter(c => c.status === 'PENDING');

        // Mark them as "PROCESSING" so they aren't fetched multiple times
        pendingCommands.forEach(c => {
            c.status = 'PROCESSING';
        });

        await user.save();

        res.json({ success: true, commands: pendingCommands });
    } catch (error) {
        console.error('Fetch commands error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// 3. Command Response: App reports result
router.post('/command-result', async (req, res) => {
    const { userId, commandId, status, response } = req.body;

    if (!userId || !commandId || !status) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const command = user.remoteCommands.id(commandId);
        if (!command) return res.status(404).json({ success: false, message: 'Command not found.' });

        command.status = status; // COMPLETED or FAILED
        command.response = response;
        command.completedAt = new Date();

        await user.save();
        res.json({ success: true, message: 'Result updated.' });

    } catch (error) {
        console.error('Update result error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// 4. Issue Command: Portal queues a command
router.post('/issue-command', async (req, res) => {
    const { userId, type, payload } = req.body;

    if (!userId || !type) {
        return res.status(400).json({ success: false, message: 'UserId and Type are required.' });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        user.remoteCommands.push({
            type,
            payload,
            status: 'PENDING',
            createdAt: new Date(),
        });

        await user.save();
        res.json({ success: true, message: `Command ${type} queued.` });

    } catch (error) {
        console.error('Issue command error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// 5. Get Device Data: For the Seller Portal
router.get('/device-data/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({
            success: true,
            user: {
                userId: user.userId,
                phoneNumber: user.phoneNumber,
                username: user.username,
                deviceState: user.deviceState,
                todayTransactions: user.todayTransactions,
                availableOffers: user.availableOffers,
                remoteCommands: user.remoteCommands.slice(-10), // Last 10 commands
            }
        });
    } catch (error) {
        console.error('Get device data error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

module.exports = router;
