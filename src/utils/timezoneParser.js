/**
 * TimezoneParser - Timezone validation utilities
 * Provides IANA timezone validation and basic normalization functions
 *
 * NOTE: Hardcoded timezone pattern matching has been removed in favor of AI-powered detection
 * DEPRECATED: parseTimezoneFromMessage() function has been removed
 * Use AITimezoneDetector service for intelligent timezone detection from user messages
 */

/**
 * Normalize timezone to standard format
 * @param {string} timezone - Timezone string to normalize
 * @returns {string|null} - Normalized timezone or null if invalid
 */
function normalizeTimezone(timezone) {
    if (!timezone || typeof timezone !== "string") {
        return null;
    }

    // Check if it's already a valid IANA timezone
    if (isValidTimezone(timezone)) {
        return timezone;
    }

    return null;
}

/**
 * Validate if timezone is a valid IANA timezone
 * @param {string} timezone - Timezone string to validate
 * @returns {boolean} - True if valid timezone
 */
function isValidTimezone(timezone) {
    if (!timezone || typeof timezone !== "string") {
        return false;
    }

    try {
        // Try to create a DateTimeFormat with the timezone
        new Intl.DateTimeFormat("en-US", { timeZone: timezone });
        return true;
    } catch (error) {
        return false;
    }
}

export { normalizeTimezone, isValidTimezone };
