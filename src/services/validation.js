import { FlightSearchParams } from "../api/types.js";

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 * @property {string[]} suggestions - Array of helpful suggestions
 */

/**
 * Validation Service
 * Provides validation for AI-extracted parameters before API calls
 * Includes retry logic for handling AI extraction failures
 */
export default class ValidationService {
    constructor() {
        // IATA airport code pattern (3 uppercase letters)
        this.iataCodePattern = /^[A-Z]{3}$/;

        // Date pattern (YYYY-MM-DD)
        this.datePattern = /^\d{4}-\d{2}-\d{2}$/;
    }

    /**
     * Validates flight search parameters extracted by AI
     * @param {Object} params - AI-extracted parameters
     * @returns {ValidationResult} - Validation result with errors and suggestions
     */
    validateFlightParameters(params) {
        const errors = [];
        const warnings = [];
        const suggestions = [];

        // Check if parameters object exists
        if (!params) {
            errors.push("No parameters provided");
            suggestions.push("Please provide your travel details");
            return { isValid: false, errors, warnings, suggestions };
        }

        // Check intent
        if (!params.intent) {
            errors.push("Intent not specified");
        } else if (params.intent !== "flight_search") {
            warnings.push(`Expected flight_search intent, got: ${params.intent}`);
        }

        // Validate departure
        if (!params.departure) {
            errors.push("Departure location is required");
            suggestions.push("Please specify where you want to fly from");
        } else if (typeof params.departure !== "string") {
            errors.push("Departure must be a valid location or airport code");
        }

        // Validate destination (will be mapped to arrival)
        if (!params.destination) {
            errors.push("Destination location is required");
            suggestions.push("Please specify where you want to fly to");
        } else if (typeof params.destination !== "string") {
            errors.push("Destination must be a valid location or airport code");
        }

        // Validate outbound date
        if (!params.outboundDate) {
            errors.push("Departure date is required");
            suggestions.push("Please specify when you want to travel (YYYY-MM-DD format)");
        } else if (!this.datePattern.test(params.outboundDate)) {
            errors.push("Departure date must be in YYYY-MM-DD format");
            suggestions.push("Example: 2024-12-25 for December 25, 2024");
        } else if (!this.isValidDate(params.outboundDate)) {
            errors.push("Departure date is not a valid date");
        } else if (this.isPastDate(params.outboundDate)) {
            warnings.push("Departure date appears to be in the past");
        }

        // Validate return date (optional)
        if (params.returnDate) {
            if (!this.datePattern.test(params.returnDate)) {
                errors.push("Return date must be in YYYY-MM-DD format");
            } else if (!this.isValidDate(params.returnDate)) {
                errors.push("Return date is not a valid date");
            } else if (params.outboundDate && params.returnDate <= params.outboundDate) {
                errors.push("Return date must be after departure date");
            }
        }

        // Validate adults count
        if (params.adults !== undefined) {
            if (!Number.isInteger(params.adults) || params.adults < 1 || params.adults > 9) {
                errors.push("Number of adults must be between 1 and 9");
            }
        }

        // Validate children count (optional)
        if (params.children !== undefined) {
            if (!Number.isInteger(params.children) || params.children < 0 || params.children > 8) {
                errors.push("Number of children must be between 0 and 8");
            }
        }

        // Validate travel class (optional)
        if (
            params.travelClass &&
            !["economy", "business", "first"].includes(params.travelClass.toLowerCase())
        ) {
            warnings.push(
                "Travel class should be economy, business, or first - will default to economy",
            );
        }

        // Check for missing adults default
        if (!params.adults && errors.length === 0) {
            warnings.push("Number of passengers not specified - will default to 1 adult");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
        };
    }

    /**
     * Validates place search parameters extracted by AI
     * @param {Object} params - AI-extracted parameters
     * @returns {ValidationResult} - Validation result with errors and suggestions
     */
    validatePlaceParameters(params) {
        const errors = [];
        const warnings = [];
        const suggestions = [];

        if (!params) {
            errors.push("No parameters provided");
            return { isValid: false, errors, warnings, suggestions };
        }

        // For place search, we need either destination or query
        if (!params.destination && !params.query) {
            errors.push("Either destination or search query is required");
            suggestions.push("Please specify what type of place you're looking for and where");
        }

        // Validate query if provided
        if (params.query && typeof params.query !== "string") {
            errors.push("Search query must be text");
        }

        // Validate location if provided
        if (params.location) {
            if (
                typeof params.location !== "object" ||
                !params.location.lat ||
                !params.location.lng
            ) {
                warnings.push("Location coordinates invalid - will use text-based search");
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
        };
    }

    /**
     * Formats validation errors into user-friendly message
     * @param {string[]} errors - Array of error messages
     * @returns {string} - Formatted error message for users
     */
    formatValidationErrors(errors) {
        if (!errors || errors.length === 0) {
            return "";
        }

        if (errors.length === 1) {
            return `I need more information: ${errors[0]}`;
        }

        return `I need more information:\n${errors.map((error) => `• ${error}`).join("\n")}`;
    }

    /**
     * Retry parameter extraction with improved prompts
     * @param {string} originalMessage - Original user message
     * @param {Object} aiAgent - AI agent instance for retry
     * @returns {Promise<Object>} - Re-extracted parameters
     */
    async retryParameterExtraction(originalMessage, aiAgent) {
        try {
            // Enhanced prompt for better parameter extraction
            const retryPrompt = `
                Extract flight search parameters from this message with extra attention to:
                - Departure and arrival locations (cities or airport codes)
                - Travel dates in YYYY-MM-DD format
                - Number of passengers (adults and children separately)
                - Travel class preferences (economy/business/first)
                
                Original message: "${originalMessage}"
                
                Be very specific about extracting location names and dates.
            `;

            // Use the AI agent's extraction method with enhanced prompt
            const retryParameters = await aiAgent.extractTravelParameters(retryPrompt);

            console.log("Retry parameter extraction result:", retryParameters);
            return retryParameters;
        } catch (error) {
            console.error("Retry parameter extraction failed:", error);
            // Return basic structure with general_question intent as fallback
            return {
                intent: "general_question",
                originalMessage: originalMessage,
            };
        }
    }

    /**
     * Helper method to validate date string
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {boolean} - Whether date is valid
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return (
            date instanceof Date && !isNaN(date) && dateString === date.toISOString().split("T")[0]
        );
    }

    /**
     * Helper method to check if date is in the past
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {boolean} - Whether date is in the past
     */
    isPastDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        return date < today;
    }
}
