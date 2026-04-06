const mongoose = require('mongoose');
const { normalizePhoneNumber } = require('../utils/phoneUtils');

// 1. Defined Sub-Schemas for Plans/Offers to prevent CastErrors
const SelectedOfferSchema = new mongoose.Schema({
    id: String,
    planName: String,
    ussdCodeTemplate: String,
    amount: Number,
    placeholder: String,
    type: { type: String, default: 'Data' },
    category: { type: String, default: 'Daily' },
    isMultiSession: { type: Boolean, default: false },
    sessionSteps: { type: [String], default: [] }
}, { _id: true }); // Ensure each has an ID for sub-doc manipulation

const AvailableOfferSchema = new mongoose.Schema({
    id: { type: String, required: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    ussdCode: { type: String, required: true },
    category: { type: String, default: 'Daily' },
    type: { type: String, default: 'Data' },
    isMultiSession: { type: Boolean, default: false },
    sessionSteps: { type: [String], default: [] }
}, { _id: true });

// 2. Define the Main Schema for our User
const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    tokens_balance: {
        type: Number,
        required: true,
        default: 20,
    },
    phoneNumber: {
        type: String,
        default: null,
        unique: true,
        sparse: true,
    },
    subscriptionType: {
        type: String,
        enum: ['none', 'sub_weekly_unlimited', 'sub_monthly_unlimited', 'storefront_access', 'active'],
        default: 'none',
    },
    subscriptionExpiry: {
        type: Date,
        default: null,
    },
    storefrontSubscriptionExpiry: {
        type: Date,
        default: null,
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    sellerTillNumber: {
        type: String,
        default: null,
    },
    selectedOffers: [SelectedOfferSchema],
    branding: {
        shopName: { type: String, default: null },
        profilePicUrl: { type: String, default: null },
        bannerUrl: { type: String, default: null },
    },
    portalPin: {
        type: String,
        default: null,
    },
    isPinSet: {
        type: Boolean,
        default: false,
    },
    deviceState: {
        batteryLevel: { type: Number, default: 0 },
        isCharging: { type: Boolean, default: false },
        networkOperator: { type: String, default: 'Unknown' },
        signalStrength: { type: Number, default: 0 },
        airtimeBalance: { type: Number, default: 0 },
        lastSeen: { type: Date, default: null },
    },
    todayTransactions: [
        {
            date: { type: Date, default: Date.now },
            amount: Number,
            recipient: String,
            status: String,
            reference: String,
        }
    ],
    availableOffers: [AvailableOfferSchema],
    remoteCommands: [
        {
            type: { type: String, enum: ['PURCHASE_OFFER', 'BALANCE_CHECK', 'WAKE_UP'] },
            payload: mongoose.Schema.Types.Mixed,
            status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
            createdAt: { type: Date, default: Date.now },
            completedAt: { type: Date },
            response: String,
        }
    ],
    referralCode: {
        type: String,
        unique: true,
        uppercase: true,
        sparse: true,
        index: true,
    },
    referredBy: {
        type: String, // userId of the referrer
        index: true,
        default: null,
    },
    referralCount: {
        type: Number,
        default: 0,
    },
    referralRewardsEarned: {
        type: Number,
        default: 0,
    },
    successfullyReferred: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.portalPin;
            return ret;
        }
    },
    toObject: {
        transform: function (doc, ret) {
            delete ret.portalPin;
            return ret;
        }
    }
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
    const normalizedId = normalizePhoneNumber(userId) || userId;
    
    // Atomic 'Get or Create' using upsert: true
    let user = await User.findOne({ userId: normalizedId });
    
    if (!user) {
        // Generate a random 6-character unique referral code
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        user = await User.findOneAndUpdate(
            { userId: normalizedId },
            { $setOnInsert: { userId: normalizedId, phoneNumber: normalizedId, tokens_balance: 20, referralCode } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } else if (!user.referralCode) {
        // --- DATA REPAIR: If user exists but is missing a referral code, generate one ---
        user.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await user.save();
        console.log(`🛠️ Referral Code Repaired for existing user ${normalizedId}: ${user.referralCode}`);
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
    const normalizedId = normalizePhoneNumber(userId) || userId;
    if (amount <= 0) {
        console.warn(`Attempted to add non-positive tokens for user ${normalizedId}: ${amount}`);
        const user = await User.findOne({ userId: normalizedId });
        return user ? user.tokens_balance : null;
    }
    
    const updatedUser = await User.findOneAndUpdate(
        { userId: normalizedId },
        { $inc: { tokens_balance: amount } }, // $inc is an atomic increment operation
        { new: true } // This option returns the updated document
    );

    if (updatedUser) {
        console.log(`✨ Tokens added for user ${normalizedId}. New balance: ${updatedUser.tokens_balance}`);
        return updatedUser.tokens_balance;
    }
    
    console.warn(`Attempted to add tokens for non-existent user: ${normalizedId}`);
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
    const normalizedId = normalizePhoneNumber(userId) || userId;
    // We use an aggregation pipeline in update to perform atomic math with a lower bound of 0
    const updatedUser = await User.findOneAndUpdate(
        { userId: normalizedId },
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
        console.log(`🔄 Tokens updated atomically for user ${normalizedId}. New balance: ${updatedUser.tokens_balance}`);
        return updatedUser.tokens_balance;
    }

    console.warn(`Attempted to update tokens for non-existent user: ${normalizedId}`);
    return null;
};

/**
 * Retrieves a user's current token balance.
 * @param {string} userId - The user's ID.
 * @returns {Promise<number|null>} The current token balance, or null if user not found.
 */
const getTokensBalance = async (userId) => {
    const normalizedId = normalizePhoneNumber(userId) || userId;
    const user = await User.findOne({ userId: normalizedId });
    return user ? user.tokens_balance : null;
};

/**
 * Sets or updates the M-Pesa phone number for a user.
 * @param {string} userId - The user's ID.
 * @param {string} phoneNumber - The M-Pesa phone number.
 * @returns {Promise<boolean>} True if updated, false if user not found.
 */
const setPhoneNumber = async (userId, phoneNumber) => {
    const normalizedId = normalizePhoneNumber(userId) || userId;
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
        console.warn(`⚠️ Invalid phone number format provided for user ${normalizedId}: ${phoneNumber}`);
        return false;
    }
    const result = await User.updateOne({ userId: normalizedId }, { phoneNumber: normalizedPhone });
    if (result.matchedCount > 0) {
        console.log(`📞 Phone number for user ${normalizedId} set and normalized to: ${normalizedPhone}`);
        return true;
    }
    return false;
};

/**
 * Extends the user's subscription (Tokens or Storefront).
 * @param {string} userId - The user's ID.
 * @param {number} days - Number of days to add.
 * @param {string} type - 'tokens' or 'storefront'
 * @returns {Promise<Date|null>} The new expiry date.
 */
const extendSubscription = async (userId, days, type = 'tokens') => {
    const normalizedId = normalizePhoneNumber(userId) || userId;
    const user = await User.findOne({ userId: normalizedId });
    if (!user) return null;

    const now = new Date();
    const expiryField = type === 'storefront' ? 'storefrontSubscriptionExpiry' : 'subscriptionExpiry';
    
    let currentExpiry = user[expiryField] || now;
    
    // If the subscription is already active and in the future, add to it.
    // Otherwise, start from today.
    const baseDate = (currentExpiry > now) ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + (days * 24 * 60 * 60 * 1000));

    user[expiryField] = newExpiry;
    
    // Update type if it's a tokens sub
    if (type === 'tokens') {
        user.subscriptionType = 'active'; // Generic active marker
    } else {
        user.subscriptionType = 'storefront_access';
    }
    
    await user.save();

    console.log(`📅 ${type} Subscription extended for ${userId}. New Expiry: ${newExpiry}`);
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