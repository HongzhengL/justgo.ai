import { FlightSearchParams, PlaceSearchParams } from "../api/types.js";
import { TravelAPIError } from "../api/utils/errors.js";

// API mapping configurations for different travel APIs
const API_MAPPINGS = {
    serpAPI: {
        flight_search: {
            parameterMap: {
                destination: "arrival", // KEY MAPPING: AI uses 'destination', SerpAPI needs 'arrival'
                departure: "departure", // Direct mapping
                outboundDate: "outboundDate", // Direct mapping
                returnDate: "returnDate", // Direct mapping
                adults: "adults", // Direct mapping
                children: "children", // Direct mapping
                travelClass: "travelClass", // Direct mapping
                currency: "currency", // Direct mapping
            },
            defaults: {
                adults: 1,
                children: 0,
                travelClass: "economy",
                currency: "USD",
                gl: "us", // Google country interface (required by SerpAPI)
                hl: "en", // Google language interface (required by SerpAPI)
            },
            required: ["departure", "arrival", "outboundDate", "adults", "gl", "hl"],
        },
        place_search: {
            parameterMap: {
                destination: "location",
                query: "query",
                radius: "radius",
                type: "type",
            },
            defaults: {
                radius: 5000,
                type: "tourist_attraction",
            },
            required: ["query"],
        },
    },
};

/**
 * Parameter Mapping Service
 * Handles mapping between AI-extracted parameters and API-specific parameter formats
 * Designed to be extensible for multiple travel APIs
 */
export default class ParameterMappingService {
    constructor() {
        this.apiMappings = API_MAPPINGS;
    }

    /**
     * Maps AI-extracted parameters to SerpAPI format for flight search
     * @param {Object} aiParameters - Parameters extracted by AI agent
     * @returns {FlightSearchParams} - SerpAPI-compatible parameters
     */
    mapToSerpAPI(aiParameters) {
        if (!aiParameters || !aiParameters.intent) {
            throw new TravelAPIError(
                "INVALID_PARAMS",
                "AI parameters missing or invalid - no intent specified",
                "ParameterMapping",
            );
        }

        const intent = aiParameters.intent;
        const mapping = this.apiMappings.serpAPI[intent];

        if (!mapping) {
            throw new TravelAPIError(
                "INVALID_PARAMS",
                `No SerpAPI mapping available for intent: ${intent}`,
                "ParameterMapping",
            );
        }

        // Apply parameter mappings
        const mappedParams = {};

        // Map each parameter according to the configuration
        Object.entries(mapping.parameterMap).forEach(([aiParam, apiParam]) => {
            if (aiParameters[aiParam] !== undefined) {
                let value = aiParameters[aiParam];

                // Special handling for airport codes - convert city names to IATA codes if needed
                if ((apiParam === "departure" || apiParam === "arrival") && value) {
                    value = this.normalizeAirportCode(value);
                }

                mappedParams[apiParam] = value;
            }
        });

        // Apply default values for missing optional parameters
        Object.entries(mapping.defaults).forEach(([param, defaultValue]) => {
            if (mappedParams[param] === undefined) {
                mappedParams[param] = defaultValue;
            }
        });

        // Additional validation for SerpAPI-specific requirements
        if (intent === "flight_search") {
            // Ensure airport codes are uppercase and 3 letters
            if (mappedParams.departure && typeof mappedParams.departure === "string") {
                mappedParams.departure = mappedParams.departure.toUpperCase().trim();
            }
            if (mappedParams.arrival && typeof mappedParams.arrival === "string") {
                mappedParams.arrival = mappedParams.arrival.toUpperCase().trim();
            }

            // Validate date formats
            if (
                mappedParams.outboundDate &&
                !/^\d{4}-\d{2}-\d{2}$/.test(mappedParams.outboundDate)
            ) {
                throw new TravelAPIError(
                    "INVALID_PARAMS",
                    `Invalid outbound date format: ${mappedParams.outboundDate}. Must be YYYY-MM-DD`,
                    "ParameterMapping",
                );
            }

            // Ensure adults is a number
            if (mappedParams.adults && typeof mappedParams.adults !== "number") {
                mappedParams.adults = parseInt(mappedParams.adults) || 1;
            }
        }

        return mappedParams;
    }

    /**
     * Validates that mapped parameters meet API requirements
     * @param {Object} mappedParams - API-specific parameters after mapping
     * @param {string} apiType - Type of API (e.g., 'serpAPI')
     * @returns {Object} - Validation result with isValid flag and errors
     */
    validateMappingResult(mappedParams, apiType) {
        const errors = [];
        const warnings = [];

        if (apiType === "serpAPI" && mappedParams.intent) {
            const mapping = this.apiMappings.serpAPI[mappedParams.intent || "flight_search"];

            if (mapping) {
                // Check required parameters
                mapping.required.forEach((param) => {
                    if (!mappedParams[param]) {
                        errors.push(`Missing required parameter: ${param}`);
                    }
                });

                // Validate parameter formats (SerpAPI specific)
                if (
                    mappedParams.outboundDate &&
                    !/^\d{4}-\d{2}-\d{2}$/.test(mappedParams.outboundDate)
                ) {
                    errors.push("outboundDate must be in YYYY-MM-DD format");
                }

                if (
                    mappedParams.returnDate &&
                    !/^\d{4}-\d{2}-\d{2}$/.test(mappedParams.returnDate)
                ) {
                    errors.push("returnDate must be in YYYY-MM-DD format");
                }

                if (mappedParams.adults && (mappedParams.adults < 1 || mappedParams.adults > 9)) {
                    errors.push("adults must be between 1 and 9");
                }

                if (
                    mappedParams.children &&
                    (mappedParams.children < 0 || mappedParams.children > 8)
                ) {
                    errors.push("children must be between 0 and 8");
                }

                if (
                    mappedParams.travelClass &&
                    !["economy", "business", "first"].includes(mappedParams.travelClass)
                ) {
                    warnings.push(
                        "travelClass should be economy, business, or first - defaulting to economy",
                    );
                    mappedParams.travelClass = "economy";
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions:
                errors.length > 0
                    ? [
                          "Please check that all required flight information is provided",
                          "Dates should be in YYYY-MM-DD format",
                          "Passenger counts should be reasonable numbers",
                      ]
                    : [],
        };
    }

    /**
     * Gets list of supported APIs for this mapping service
     * @returns {string[]} - Array of supported API names
     */
    getSupportedAPIs() {
        return Object.keys(this.apiMappings);
    }

    /**
     * Gets supported intents for a specific API
     * @param {string} apiName - Name of the API
     * @returns {string[]} - Array of supported intent names
     */
    getSupportedIntents(apiName) {
        const api = this.apiMappings[apiName];
        return api ? Object.keys(api) : [];
    }

    /**
     * Normalizes airport codes - converts common city names to IATA codes
     * @param {string} location - Location string (city name or IATA code)
     * @returns {string} - IATA code or original string if not found
     */
    normalizeAirportCode(location) {
        if (!location || typeof location !== "string") {
            return location;
        }

        // If already looks like IATA code (3 uppercase letters), return as-is
        if (/^[A-Z]{3}$/.test(location.trim())) {
            return location.trim();
        }

        // Common city name to IATA code mappings
        const cityToIATA = {
            // Major US cities
            "new york": "JFK",
            nyc: "JFK",
            "new york city": "JFK",
            "los angeles": "LAX",
            la: "LAX",
            "san francisco": "SFO",
            sf: "SFO",
            chicago: "ORD",
            miami: "MIA",
            boston: "BOS",
            washington: "DCA",
            dc: "DCA",
            "washington dc": "DCA",
            seattle: "SEA",
            denver: "DEN",
            atlanta: "ATL",
            dallas: "DFW",
            houston: "IAH",
            phoenix: "PHX",
            "las vegas": "LAS",
            vegas: "LAS",
            austin: "AUS",

            // Major international cities
            london: "LHR",
            paris: "CDG",
            tokyo: "NRT",
            beijing: "PEK",
            shanghai: "PVG",
            "hong kong": "HKG",
            singapore: "SIN",
            dubai: "DXB",
            amsterdam: "AMS",
            frankfurt: "FRA",
            rome: "FCO",
            madrid: "MAD",
            barcelona: "BCN",
            milan: "MXP",
            istanbul: "IST",
            moscow: "SVO",
            sydney: "SYD",
            melbourne: "MEL",
            toronto: "YYZ",
            vancouver: "YVR",
            montreal: "YUL",
        };

        const normalizedInput = location.toLowerCase().trim();
        const iataCode = cityToIATA[normalizedInput];

        if (iataCode) {
            console.log(`Normalized airport: "${location}" -> ${iataCode}`);
            return iataCode;
        }

        // If no mapping found, return original (might be an airport name or less common city)
        console.warn(`Unknown airport/city: "${location}" - using as-is`);
        return location.trim();
    }
}
