// src/models/userModel.js
// IMPORTANT: This is an in-memory store for demonstration purposes.
// For a production application, replace this with a proper database (e.g., MongoDB, PostgreSQL, MySQL)
// and an ORM (e.g., Mongoose, Sequelize, Prisma).

let users = {}; // Key: userId (the anonymous ID), Value: { id, tokens_balance, initial_tokens_granted, phoneNumber }

/**
 * Retrieves a user by ID. If the user doesn't exist, it creates a new
 * anonymous user with 20 free tokens and marks them as having received initial tokens.
 * @param {string} userId - The unique anonymous ID from the Flutter app.
 * @returns {Promise<object>} The user object.
 */
const getUser  = async (userId) => {
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            tokens_balance: 20, // Initial free tokens for new installs
            initial_tokens_granted: true,
            phoneNumber: null
        };
        console.log(`👤 New anonymous user ${userId} created with 20 free tokens.`);
    }
    return users[userId];
};

/**
 * Updates a user's token balance.
 * @param {string} userId - The user's ID.
 * @param {number} amount - The amount of tokens to add (can be negative for consumption).
 * @returns {Promise<number|null>} The new token balance, or null if user not found.
 */
const updateTokens = async (userId, amount) => {
    if (users[userId]) {
        users[userId].tokens_balance += amount;
        console.log(`✨ Tokens updated for user ${userId}. New balance: ${users[userId].tokens_balance}`);
        return users[userId].tokens_balance;
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
    if (users[userId]) {
        return users[userId].tokens_balance;
    }
    console.warn(`Attempted to get tokens for non-existent user: ${userId}`);
    return null;
};

/**
 * Sets or updates the M-Pesa phone number associated with a user.
 * @param {string} userId - The user's ID.
 * @param {string} phoneNumber - The M-Pesa phone number.
 * @returns {Promise<boolean>} True if updated, false if user not found.
 */
const setPhoneNumber = async (userId, phoneNumber) => {
    if (users[userId]) {
        users[userId].phoneNumber = phoneNumber;
        console.log(`📞 Phone number for user ${userId} set to: ${phoneNumber}`);
        return true;
    }
    console.warn(`Attempted to set phone number for non-existent user: ${userId}`);
    return false;
};

module.exports = {
    getUser,
    updateTokens,
    getTokensBalance,
    setPhoneNumber
};