const mongoose = require('mongoose');

// 1. Define the Schema for our User
const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true, // Ensures no two users have the same anonymous ID
        index: true, // Improves query performance for finding users
    },
    tokens_balance: {
        type: Number,
        required: true,
        default: 20, // Automatically grants 20 tokens to new users on creation
    },
    phoneNumber: {
        type: String,
        default: null,
    },
    subscriptionType: {
        type: String,
        enum: ['none', 'sub_weekly_unlimited', 'sub_monthly_unlimited'], // Defines possible values
        default: 'none',
    },
    subscriptionExpiry: {
        type: Date, // Stores the exact date and time the subscription ends
        default: null,
    },
    // --- Public Storefront Fields ---
    username: {
        type: String,
        unique: true,
        sparse: true, // Allows null/missing values while still enforcing uniqueness
        trim: true,
        lowercase: true,
        index: true,
    },
    sellerTillNumber: {
        type: String,
        default: null,
    },
    selectedOffers: [
        {
            id: String,
            planName: String,
            ussdCodeTemplate: String,
            amount: Number,
            placeholder: String,
            isMultiSession: Boolean,
            sessionSteps: [String]
        }
    ],
    branding: {
        shopName: { type: String, default: null },
        profilePicUrl: { type: String, default: null },
        bannerUrl: { type: String, default: null },
    },
}, {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
});


// 2. Create the Mongoose Model from the Schema
const User = mongoose.model('User', UserSchema);


// 3. Re-implement the model functions using Mongoose
/**
 * Retrieves a user by ID. If the user doesn't exist, it creates a new one.
 * The `default: 20` in the schema handles the initial token grant automatically.
 * @param {string} userId - The unique anonymous ID from the Flutter app.
 * @returns {Promise<object>} The user document from the database.
 */
const getUser = async (userId) => {
    let user = await User.findOne({ userId });

    if (!user) {
        console.log(`👤 User ${userId} not found. Creating new user...`);
        user = new User({ userId }); // Mongoose will apply the default 20 tokens
        await user.save();
        console.log(`✅ New user ${userId} created with 20 tokens.`);
    }

    return user;
};

/**
 * Adds a specific amount of tokens to a user's balance (for purchases).
 * @param {string} userId - The user's ID.
 * @param {number} amount - The positive amount of tokens to add.
 * @returns {Promise<number|null>} The new token balance, or null if user not found.
 */
const addTokens = async (userId, amount) => {
    if (amount <= 0) {
        console.warn(`Attempted to add non-positive tokens for user ${userId}: ${amount}`);
        const user = await User.findOne({ userId });
        return user ? user.tokens_balance : null;
    }
    
    const updatedUser = await User.findOneAndUpdate(
        { userId },
        { $inc: { tokens_balance: amount } }, // $inc is an atomic increment operation
        { new: true } // This option returns the updated document
    );

    if (updatedUser) {
        console.log(`✨ Tokens added for user ${userId}. New balance: ${updatedUser.tokens_balance}`);
        return updatedUser.tokens_balance;
    }
    
    console.warn(`Attempted to add tokens for non-existent user: ${userId}`);
    return null;
};

/**
 * Updates a user's token balance atomically (for consumption, e.g., deducting 1 token).
 * Uses a MongoDB aggregation pipeline to ensure atomicity and prevent balances below zero.
 * @param {string} userId - The user's ID.
 * @param {number} amount - The amount to change (e.g., -1 to deduct).
 * @returns {Promise<number|null>} The new token balance, or null if user not found.
 */
const updateTokens = async (userId, amount) => {
    // We use an aggregation pipeline in update to perform atomic math with a lower bound of 0
    const updatedUser = await User.findOneAndUpdate(
        { userId },
        [
            { 
                $set: { 
                    tokens_balance: { 
                        $max: [0, { $add: ["$tokens_balance", amount] }] 
                    } 
                } 
            }
        ],
        { new: true }
    );

    if (updatedUser) {
        console.log(`🔄 Tokens updated atomically for user ${userId}. New balance: ${updatedUser.tokens_balance}`);
        return updatedUser.tokens_balance;
    }

    console.warn(`Attempted to update tokens for non-existent user: ${userId}`);
    return null;
};

/**
 * Retrieves a user's current token balance.
 * @param {string} userId - The user's ID.
 * @returns {Promise<number|null>} The current token balance, or null if user not found.
 */
const getTokensBalance = async (userId) => {
    const user = await User.findOne({ userId });
    return user ? user.tokens_balance : null;
};

/**
 * Sets or updates the M-Pesa phone number for a user.
 * @param {string} userId - The user's ID.
 * @param {string} phoneNumber - The M-Pesa phone number.
 * @returns {Promise<boolean>} True if updated, false if user not found.
 */
const setPhoneNumber = async (userId, phoneNumber) => {
    const result = await User.updateOne({ userId }, { phoneNumber });
    if (result.matchedCount > 0) {
        console.log(`📞 Phone number for user ${userId} set to: ${phoneNumber}`);
        return true;
    }
    return false;
};

/**
 * Extends the user's storefront subscription.
 * @param {string} userId - The user's ID.
 * @param {number} days - Number of days to add.
 * @returns {Promise<Date|null>} The new expiry date.
 */
const extendSubscription = async (userId, days) => {
    const user = await User.findOne({ userId });
    if (!user) return null;

    const now = new Date();
    let currentExpiry = user.subscriptionExpiry || now;
    
    // If the subscription is already active and in the future, add to it.
    // Otherwise, start from today.
    const baseDate = (currentExpiry > now) ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + (days * 24 * 60 * 60 * 1000));

    user.subscriptionExpiry = newExpiry;
    user.subscriptionType = 'storefront_access'; // Generic type for now
    await user.save();

    console.log(`📅 Subscription extended for ${userId}. New Expiry: ${newExpiry}`);
    return newExpiry;
};


module.exports = {
    User,
    getUser,
    addTokens,
    updateTokens,
    getTokensBalance,
    setPhoneNumber,
    extendSubscription,
};