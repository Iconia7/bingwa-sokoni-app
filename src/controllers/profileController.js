const { User } = require('../models/userModel');
const DataPlan = require('../models/dataPlanModel');

/**
 * GET /api/public/user/:username
 * Publicly accessible endpoint to fetch seller's profile and published plans.
 */
exports.getPublicProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Shop not found.' });
        }

        const plans = (user.selectedOffers || []).map(plan => ({
            id: plan.id,
            planName: plan.planName,
            amount: plan.amount,
            placeholder: plan.placeholder, // Keeping placeholder as it might be used for UI hints
        }));

        res.status(200).json({
            success: true,
            profile: {
                username: user.username,
                shopName: user.branding?.shopName || `${user.username}'s Data Shop`,
                profilePicUrl: user.branding?.profilePicUrl,
                bannerUrl: user.branding?.bannerUrl,
                sellerTillNumber: user.sellerTillNumber,
            },
            plans: plans
        });
    } catch (error) {
        console.error('Error fetching public profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/profile/:userId
 * Private endpoint for the app to fetch the current user's full storefront settings.
 */
exports.getPrivateProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            user: {
                username: user.username,
                sellerTillNumber: user.sellerTillNumber,
                selectedOffers: user.selectedOffers,
                branding: user.branding
            }
        });
    } catch (error) {
        console.error('Error fetching private profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/profile/update
 * Private endpoint for the app to update the user's storefront settings.
 */
exports.updateProfile = async (req, res) => {
    try {
        const { userId, username, sellerTillNumber, selectedOffers, branding } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'UserId is required' });
        }

        // Check if username is being changed and if it's already taken
        if (username) {
            const existingUser = await User.findOne({ 
                username: username.toLowerCase(), 
                userId: { $ne: userId } 
            });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Username is already taken' });
            }
        }

        const updateData = {};
        if (username !== undefined) updateData.username = username.toLowerCase();
        if (sellerTillNumber !== undefined) updateData.sellerTillNumber = sellerTillNumber;
        if (selectedOffers !== undefined) updateData.selectedOffers = selectedOffers;
        if (branding !== undefined) updateData.branding = branding;

        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { $set: updateData },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                username: updatedUser.username,
                sellerTillNumber: updatedUser.sellerTillNumber,
                selectedOffers: updatedUser.selectedOffers,
                branding: updatedUser.branding
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
};

/**
 * GET /api/profile/check-username/:username
 * Checks if a username is available.
 */
exports.checkUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const exists = await User.findOne({ username: username.toLowerCase() });
        res.status(200).json({ success: true, available: !exists });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error checking username' });
    }
};
