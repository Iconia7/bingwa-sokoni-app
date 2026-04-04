/**
 * Normalizes a Kenyan phone number to the standard format: 254XXXXXXXXX
 * Handles variants like:
 * - 0115332870
 * - 0712345678
 * - +254115332870
 * - 254115332870
 * 
 * @param {string} phone - The raw phone number input.
 * @returns {string|null} The normalized 12-digit number, or null if invalid.
 */
function normalizePhoneNumber(phone) {
    if (!phone) return null;

    // 1. Remove all non-digit characters
    let cleaned = phone.toString().replace(/\D/g, '');

    // 2. Handle numbers starting with '0' (local format)
    if (cleaned.startsWith('0') && (cleaned.length === 10)) {
        cleaned = '254' + cleaned.substring(1);
    }

    // 3. Handle numbers starting with '254'
    if (cleaned.startsWith('254') && (cleaned.length === 12)) {
        // Already in standard format
        return cleaned;
    }

    // 4. Handle edge cases (e.g. 712345678 without leading 0)
    if (cleaned.length === 9) {
        cleaned = '254' + cleaned;
    }

    // Final validation: Kenyan numbers should be 12 digits (254XXXXXXXXX)
    if (cleaned.length === 12 && cleaned.startsWith('254')) {
        return cleaned;
    }

    return null; // Invalid format
}

module.exports = { normalizePhoneNumber };
