/**
 * SystemMessageBuilder - Template-based system message construction
 * Handles dynamic content injection for AI agent system messages
 */

class SystemMessageBuilder {
    constructor(baseSystemMessage) {
        this.baseSystemMessage = baseSystemMessage || "";
        this.timeContext = "";
    }

    /**
     * Append time context to base system message
     * @param {string} timeContext - Formatted time context string
     * @returns {string} - Complete system message with time context
     */
    appendTimeContext(timeContext) {
        try {
            if (!timeContext) {
                return this.baseSystemMessage;
            }

            // Append time context as a new paragraph
            return `${this.baseSystemMessage}\n\n${timeContext}`;
        } catch (error) {
            console.warn("Error appending time context:", error);
            return this.baseSystemMessage;
        }
    }

    /**
     * Build complete system message with current time context
     * @returns {string} - Complete system message
     */
    buildSystemMessage() {
        try {
            if (!this.timeContext) {
                return this.baseSystemMessage;
            }

            return this.appendTimeContext(this.timeContext);
        } catch (error) {
            console.warn("Error building system message:", error);
            return this.baseSystemMessage;
        }
    }

    /**
     * Set time context for dynamic updates
     * @param {string} timeContext - Time context string to set
     */
    setTimeContext(timeContext) {
        this.timeContext = timeContext || "";
    }
}

export { SystemMessageBuilder };
