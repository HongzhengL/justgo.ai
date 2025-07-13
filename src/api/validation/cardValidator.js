/**
 * StandardizedCard Schema Validator
 * Validates card data structure against TODO.md interface specifications
 */

/**
 * TODO.md StandardizedCard Interface Specification
 * Used as reference for validation rules
 */
const STANDARDIZED_CARD_SCHEMA = {
    required: [
        "id", // string
        "type", // 'flight' | 'place' | 'transit'
        "title", // string
        "subtitle", // string
        "location", // Location object
        "details", // object with type-specific details
        "essentialDetails", // object subset for card display
        "externalLinks", // object with booking/maps/directions/website URLs
        "metadata", // object with provider, confidence, timestamp, bookingToken?
    ],
    optional: [
        "price", // { amount: number, currency: string }
        "duration", // number (minutes)
    ],
    types: {
        flight: "flight",
        place: "place",
        transit: "transit",
    },
};

/**
 * Location Schema (nested in StandardizedCard)
 */

/**
 * ExternalLinks Schema
 */
const EXTERNAL_LINKS_SCHEMA = {
    properties: {
        booking: "string", // For flights: booking URL or Google Flights search
        maps: "string", // For places: Google Maps URL
        directions: "string", // For transit: Google Maps directions
        website: "string", // For places: official website
    },
};

/**
 * Metadata Schema
 */
const METADATA_SCHEMA = {
    required: ["provider", "timestamp"],
    optional: ["confidence", "bookingToken"],
    properties: {
        provider: "string", // API provider name
        confidence: "number", // 0-1 confidence score
        timestamp: "string", // ISO timestamp
        bookingToken: "string", // SerpAPI booking token for flights
    },
};

/**
 * Price Schema
 */
const PRICE_SCHEMA = {
    required: ["amount", "currency"],
    properties: {
        amount: "number",
        currency: "string",
    },
};

/**
 * Validation Error Types
 */
const ERROR_TYPES = {
    MISSING_FIELD: "MISSING_FIELD",
    INVALID_TYPE: "INVALID_TYPE",
    INVALID_VALUE: "INVALID_VALUE",
    MISSING_NESTED_FIELD: "MISSING_NESTED_FIELD",
    INVALID_NESTED_TYPE: "INVALID_NESTED_TYPE",
    SCHEMA_VIOLATION: "SCHEMA_VIOLATION",
};

/**
 * Validation Error Class
 */
class ValidationError {
    constructor(type, field, expected, actual, message) {
        this.type = type;
        this.field = field;
        this.expected = expected;
        this.actual = actual;
        this.message = message;
        this.severity = this.getSeverity();
    }

    getSeverity() {
        switch (this.type) {
            case ERROR_TYPES.MISSING_FIELD:
                return STANDARDIZED_CARD_SCHEMA.required.includes(this.field)
                    ? "critical"
                    : "warning";
            case ERROR_TYPES.INVALID_TYPE:
            case ERROR_TYPES.INVALID_VALUE:
                return "critical";
            case ERROR_TYPES.MISSING_NESTED_FIELD:
            case ERROR_TYPES.INVALID_NESTED_TYPE:
                return "warning";
            default:
                return "info";
        }
    }

    toString() {
        return `[${this.severity.toUpperCase()}] ${this.type}: ${this.message}`;
    }
}

/**
 * Utility Functions
 */
function getActualType(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return "array";
    return typeof value;
}

function isValidType(value, expectedType) {
    const actualType = getActualType(value);

    if (expectedType === "object" && actualType === "object" && value !== null) {
        return true;
    }

    return actualType === expectedType;
}

function isValidEnum(value, validValues) {
    return validValues.includes(value);
}

function isValidISO8601(timestamp) {
    if (typeof timestamp !== "string") return false;

    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(timestamp);
}

/**
 * Core Validation Functions
 */

/**
 * Validate Basic Card Structure
 */
function validateBasicStructure(card) {
    const errors = [];

    // Check if card is an object
    if (!isValidType(card, "object")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_TYPE,
                "root",
                "object",
                getActualType(card),
                "StandardizedCard must be an object",
            ),
        );
        return errors; // Cannot continue validation
    }

    // Validate required fields
    STANDARDIZED_CARD_SCHEMA.required.forEach((field) => {
        if (!(field in card)) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.MISSING_FIELD,
                    field,
                    "defined",
                    "undefined",
                    `Required field '${field}' is missing`,
                ),
            );
        }
    });

    return errors;
}

/**
 * Validate Card Type
 */
function validateCardType(card) {
    const errors = [];

    if (!card.type) {
        // Already caught in basic structure validation
        return errors;
    }

    const validTypes = Object.values(STANDARDIZED_CARD_SCHEMA.types);
    if (!isValidEnum(card.type, validTypes)) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_VALUE,
                "type",
                validTypes.join(" | "),
                card.type,
                `Card type must be one of: ${validTypes.join(", ")}`,
            ),
        );
    }

    return errors;
}

/**
 * Validate String Fields
 */
function validateStringFields(card) {
    const errors = [];
    const stringFields = ["id", "title", "subtitle"];

    stringFields.forEach((field) => {
        if (field in card) {
            if (!isValidType(card[field], "string")) {
                errors.push(
                    new ValidationError(
                        ERROR_TYPES.INVALID_TYPE,
                        field,
                        "string",
                        getActualType(card[field]),
                        `Field '${field}' must be a string`,
                    ),
                );
            } else if (card[field].trim().length === 0) {
                errors.push(
                    new ValidationError(
                        ERROR_TYPES.INVALID_VALUE,
                        field,
                        "non-empty string",
                        "empty string",
                        `Field '${field}' cannot be empty`,
                    ),
                );
            }
        }
    });

    return errors;
}

/**
 * Validate Price Object
 */
function validatePrice(card) {
    const errors = [];

    if (!("price" in card)) {
        return errors; // Price is optional
    }

    if (!isValidType(card.price, "object")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_TYPE,
                "price",
                "object",
                getActualType(card.price),
                "Price must be an object with amount and currency",
            ),
        );
        return errors;
    }

    // Validate required price fields
    PRICE_SCHEMA.required.forEach((field) => {
        if (!(field in card.price)) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.MISSING_NESTED_FIELD,
                    `price.${field}`,
                    "defined",
                    "undefined",
                    `Price object missing required field '${field}'`,
                ),
            );
        }
    });

    // Validate price field types
    if ("amount" in card.price && !isValidType(card.price.amount, "number")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_NESTED_TYPE,
                "price.amount",
                "number",
                getActualType(card.price.amount),
                "Price amount must be a number",
            ),
        );
    }

    if ("currency" in card.price && !isValidType(card.price.currency, "string")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_NESTED_TYPE,
                "price.currency",
                "string",
                getActualType(card.price.currency),
                "Price currency must be a string",
            ),
        );
    }

    return errors;
}

/**
 * Validate Duration
 */
function validateDuration(card) {
    const errors = [];

    if (!("duration" in card)) {
        return errors; // Duration is optional
    }

    if (!isValidType(card.duration, "number")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_TYPE,
                "duration",
                "number",
                getActualType(card.duration),
                "Duration must be a number (minutes)",
            ),
        );
    } else if (card.duration < 0) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_VALUE,
                "duration",
                "positive number",
                card.duration,
                "Duration must be a positive number",
            ),
        );
    }

    return errors;
}

/**
 * Validate Location Object
 */
function validateLocation(card) {
    const errors = [];

    if (!("location" in card)) {
        return errors; // Already caught in basic structure
    }

    if (!isValidType(card.location, "object")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_TYPE,
                "location",
                "object",
                getActualType(card.location),
                "Location must be an object",
            ),
        );
        return errors;
    }

    // For TODO.md compliance, location should have at least some valid structure
    const hasValidStructure =
        "from" in card.location ||
        "to" in card.location ||
        ("lat" in card.location && "lng" in card.location) ||
        "address" in card.location ||
        "name" in card.location;

    if (!hasValidStructure) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.SCHEMA_VIOLATION,
                "location",
                "from/to or lat/lng or address or name",
                "empty object",
                "Location must contain at least one valid location property",
            ),
        );
    }

    return errors;
}

/**
 * Validate ExternalLinks Object
 */
function validateExternalLinks(card) {
    const errors = [];

    if (!("externalLinks" in card)) {
        return errors; // Already caught in basic structure
    }

    if (!isValidType(card.externalLinks, "object")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_TYPE,
                "externalLinks",
                "object",
                getActualType(card.externalLinks),
                "ExternalLinks must be an object",
            ),
        );
        return errors;
    }

    // Validate URL fields
    Object.keys(EXTERNAL_LINKS_SCHEMA.properties).forEach((field) => {
        if (field in card.externalLinks) {
            if (!isValidType(card.externalLinks[field], "string")) {
                errors.push(
                    new ValidationError(
                        ERROR_TYPES.INVALID_NESTED_TYPE,
                        `externalLinks.${field}`,
                        "string",
                        getActualType(card.externalLinks[field]),
                        `ExternalLinks.${field} must be a string URL`,
                    ),
                );
            }
        }
    });

    return errors;
}

/**
 * Validate Metadata Object
 */
function validateMetadata(card) {
    const errors = [];

    if (!("metadata" in card)) {
        return errors; // Already caught in basic structure
    }

    if (!isValidType(card.metadata, "object")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_TYPE,
                "metadata",
                "object",
                getActualType(card.metadata),
                "Metadata must be an object",
            ),
        );
        return errors;
    }

    // Validate required metadata fields
    METADATA_SCHEMA.required.forEach((field) => {
        if (!(field in card.metadata)) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.MISSING_NESTED_FIELD,
                    `metadata.${field}`,
                    "defined",
                    "undefined",
                    `Metadata missing required field '${field}'`,
                ),
            );
        }
    });

    // Validate metadata field types
    if ("provider" in card.metadata && !isValidType(card.metadata.provider, "string")) {
        errors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_NESTED_TYPE,
                "metadata.provider",
                "string",
                getActualType(card.metadata.provider),
                "Metadata.provider must be a string",
            ),
        );
    }

    if ("timestamp" in card.metadata) {
        if (!isValidType(card.metadata.timestamp, "string")) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.INVALID_NESTED_TYPE,
                    "metadata.timestamp",
                    "string",
                    getActualType(card.metadata.timestamp),
                    "Metadata.timestamp must be a string",
                ),
            );
        } else if (!isValidISO8601(card.metadata.timestamp)) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.INVALID_VALUE,
                    "metadata.timestamp",
                    "ISO 8601 timestamp",
                    card.metadata.timestamp,
                    "Metadata.timestamp must be a valid ISO 8601 timestamp",
                ),
            );
        }
    }

    if ("confidence" in card.metadata) {
        if (!isValidType(card.metadata.confidence, "number")) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.INVALID_NESTED_TYPE,
                    "metadata.confidence",
                    "number",
                    getActualType(card.metadata.confidence),
                    "Metadata.confidence must be a number",
                ),
            );
        } else if (card.metadata.confidence < 0 || card.metadata.confidence > 1) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.INVALID_VALUE,
                    "metadata.confidence",
                    "number between 0 and 1",
                    card.metadata.confidence,
                    "Metadata.confidence must be between 0 and 1",
                ),
            );
        }
    }

    return errors;
}

/**
 * Validate Details and EssentialDetails Objects
 */
function validateDetailsObjects(card) {
    const errors = [];

    // Validate details object
    if ("details" in card) {
        if (!isValidType(card.details, "object")) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.INVALID_TYPE,
                    "details",
                    "object",
                    getActualType(card.details),
                    "Details must be an object",
                ),
            );
        }
    }

    // Validate essentialDetails object
    if ("essentialDetails" in card) {
        if (!isValidType(card.essentialDetails, "object")) {
            errors.push(
                new ValidationError(
                    ERROR_TYPES.INVALID_TYPE,
                    "essentialDetails",
                    "object",
                    getActualType(card.essentialDetails),
                    "EssentialDetails must be an object",
                ),
            );
        }
    }

    return errors;
}

/**
 * Main Validation Function
 */
export function validateStandardizedCard(card, expectedType = null) {
    let allErrors = [];

    // Step 1: Basic structure validation
    allErrors = allErrors.concat(validateBasicStructure(card));

    // If basic structure is invalid, stop here
    const hasCriticalErrors = allErrors.some((error) => error.severity === "critical");
    if (hasCriticalErrors) {
        return {
            isValid: false,
            errors: allErrors,
            summary: {
                total: allErrors.length,
                critical: allErrors.filter((e) => e.severity === "critical").length,
                warnings: allErrors.filter((e) => e.severity === "warning").length,
                info: allErrors.filter((e) => e.severity === "info").length,
            },
        };
    }

    // Step 2: Validate all other aspects
    allErrors = allErrors.concat(validateCardType(card));
    allErrors = allErrors.concat(validateStringFields(card));
    allErrors = allErrors.concat(validatePrice(card));
    allErrors = allErrors.concat(validateDuration(card));
    allErrors = allErrors.concat(validateLocation(card));
    allErrors = allErrors.concat(validateExternalLinks(card));
    allErrors = allErrors.concat(validateMetadata(card));
    allErrors = allErrors.concat(validateDetailsObjects(card));

    // Step 3: Validate expected type if provided
    if (expectedType && card.type && card.type !== expectedType) {
        allErrors.push(
            new ValidationError(
                ERROR_TYPES.INVALID_VALUE,
                "type",
                expectedType,
                card.type,
                `Expected card type '${expectedType}' but got '${card.type}'`,
            ),
        );
    }

    const summary = {
        total: allErrors.length,
        critical: allErrors.filter((e) => e.severity === "critical").length,
        warnings: allErrors.filter((e) => e.severity === "warning").length,
        info: allErrors.filter((e) => e.severity === "info").length,
    };

    return {
        isValid: summary.critical === 0,
        errors: allErrors,
        summary,
        schema: STANDARDIZED_CARD_SCHEMA,
        validationTimestamp: new Date().toISOString(),
    };
}

/**
 * Validate Array of Cards
 */
export function validateStandardizedCardArray(cards, expectedType = null) {
    if (!Array.isArray(cards)) {
        return {
            isValid: false,
            errors: ["Input is not an array"],
            cardResults: [],
            summary: {
                totalCards: 0,
                validCards: 0,
                invalidCards: 0,
                totalErrors: 1,
                criticalErrors: 1,
                warnings: 0,
            },
        };
    }

    const cardResults = cards.map((card, index) => {
        const validation = validateStandardizedCard(card, expectedType);
        return {
            index,
            card,
            ...validation,
        };
    });

    const summary = {
        totalCards: cards.length,
        validCards: cardResults.filter((r) => r.isValid).length,
        invalidCards: cardResults.filter((r) => !r.isValid).length,
        totalErrors: cardResults.reduce((sum, r) => sum + r.errors.length, 0),
        criticalErrors: cardResults.reduce((sum, r) => sum + (r.summary?.critical || 0), 0),
        warnings: cardResults.reduce((sum, r) => sum + (r.summary?.warnings || 0), 0),
    };

    return {
        isValid: summary.invalidCards === 0 && summary.criticalErrors === 0,
        cardResults,
        summary,
        validationTimestamp: new Date().toISOString(),
    };
}

/**
 * Get Validation Report
 */
export function getValidationReport(validationResult) {
    const { isValid, errors, summary } = validationResult;

    let report = `=== StandardizedCard Validation Report ===\n`;
    report += `Status: ${isValid ? "✅ VALID" : "❌ INVALID"}\n`;

    if (summary) {
        report += `Total Errors: ${summary.total}\n`;
        report += `Critical: ${summary.critical}, Warnings: ${summary.warnings}, Info: ${summary.info}\n`;
    }

    if (errors && errors.length > 0) {
        report += `\nErrors:\n`;
        errors.forEach((error, index) => {
            report += `${index + 1}. ${error.toString()}\n`;
        });
    }

    return report;
}

export default {
    validateStandardizedCard,
    validateStandardizedCardArray,
    getValidationReport,
    ValidationError,
    ERROR_TYPES,
    STANDARDIZED_CARD_SCHEMA,
};
