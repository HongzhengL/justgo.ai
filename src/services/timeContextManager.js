/**
 * TimeContextManager - Hybrid time context management system
 * Handles timezone detection, overrides, and time context generation for conversations
 */

import AITimezoneDetector from "./aiTimezoneDetector.js";
import { normalizeTimezone } from "../utils/timezoneParser.js";

class TimeContextManager {
    constructor(conversationId) {
        this.conversationId = conversationId;
        this.timezoneOverride = null;
        this.conversationTimezones = new Map(); // In-memory storage for session
        this.aiTimezoneDetector = new AITimezoneDetector();
    }

    /**
     * Detect timezone mentions in user messages
     * @param {string} message - User message text
     * @returns {Promise<string|null>} - Detected timezone or null
     */
    async detectTimezoneFromMessage(message) {
        try {
            return await this.aiTimezoneDetector.detectTimezone(message);
        } catch (error) {
            console.error("Error detecting timezone from message with AI:", error);
            return null;
        }
    }

    /**
     * Set timezone override for the conversation
     * @param {string} timezone - Timezone string
     */
    setTimezoneOverride(timezone) {
        try {
            // Normalize timezone to standard format
            const normalizedTimezone = normalizeTimezone(timezone);

            if (normalizedTimezone) {
                this.timezoneOverride = normalizedTimezone;
                this.conversationTimezones.set(this.conversationId, normalizedTimezone);
            } else {
                console.warn(`Could not normalize timezone: ${timezone}`);
            }
        } catch (error) {
            console.error("Error normalizing timezone:", error);
        }
    }

    /**
     * Get current user time based on detected or overridden timezone
     * @param {string} frontendTimezone - Browser-detected timezone
     * @returns {string} - Current user time formatted for AI
     */
    getCurrentUserTime(frontendTimezone = null) {
        try {
            // Priority: Override > Frontend detection > Server time
            const userTimezone = this.timezoneOverride || frontendTimezone || "UTC";

            const now = new Date();
            const timeInUserTimezone = new Intl.DateTimeFormat("en-US", {
                timeZone: userTimezone,
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                weekday: "long",
            }).format(now);

            return timeInUserTimezone;
        } catch (error) {
            // Fallback to server time
            console.warn("Error getting user time:", error);
            return new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                weekday: "long",
            });
        }
    }

    /**
     * Get formatted time context for AI consumption
     * @param {string} frontendTimezone - Browser-detected timezone
     * @returns {string} - Formatted time context
     */
    getTimeContextForAI(frontendTimezone = null) {
        const userTime = this.getCurrentUserTime(frontendTimezone);
        return `Current user time: ${userTime}`;
    }

    /**
     * Clear timezone override for the conversation
     */
    clearOverride() {
        this.timezoneOverride = null;
        this.conversationTimezones.delete(this.conversationId);
    }
}

export { TimeContextManager };
