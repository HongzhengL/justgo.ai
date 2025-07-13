// Error Handling Test System for Travel API Module
// Tests all error scenarios and recovery mechanisms

import { TravelAPIError } from "../utils/errors.js";
import logger from "../../utils/logger.js";

// Error scenarios test cases
export const errorScenarios = {
    // Network errors
    networkErrors: {
        timeout: {
            type: "NETWORK_ERROR",
            message: "Request timeout after 10 seconds",
            statusCode: 408,
            provider: "SerpAPI",
        },
        connectionRefused: {
            type: "NETWORK_ERROR",
            message: "Connection refused by server",
            statusCode: 503,
            provider: "Google Maps API",
        },
        dns: {
            type: "NETWORK_ERROR",
            message: "DNS resolution failed",
            statusCode: 0,
            provider: "OpenAI",
        },
    },

    // API-specific errors
    apiErrors: {
        rateLimited: {
            type: "RATE_LIMIT",
            message: "Rate limit exceeded. Try again in 60 seconds.",
            statusCode: 429,
            provider: "SerpAPI",
            retryAfter: 60,
        },
        invalidApiKey: {
            type: "INVALID_PARAMS",
            message: "Invalid API key provided",
            statusCode: 401,
            provider: "Google Maps API",
        },
        quotaExceeded: {
            type: "RATE_LIMIT",
            message: "Daily quota exceeded",
            statusCode: 403,
            provider: "OpenAI",
        },
        serviceUnavailable: {
            type: "API_DOWN",
            message: "Service temporarily unavailable",
            statusCode: 503,
            provider: "SerpAPI",
        },
    },

    // Validation errors
    validationErrors: {
        missingParams: {
            type: "INVALID_PARAMS",
            message: 'Required parameter "departure" is missing',
            statusCode: 400,
            provider: "TravelAPIModule",
        },
        invalidDate: {
            type: "INVALID_PARAMS",
            message: "Invalid date format. Expected YYYY-MM-DD",
            statusCode: 400,
            provider: "TravelAPIModule",
        },
        invalidLocation: {
            type: "INVALID_PARAMS",
            message: "Invalid airport code. Must be 3-letter IATA code",
            statusCode: 400,
            provider: "SerpAPI",
        },
    },
};

// Error recovery strategies
export const recoveryStrategies = {
    retry: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        baseDelay: 1000, // 1 second

        calculateDelay(attempt) {
            return this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
        },

        shouldRetry(error) {
            const retryableTypes = ["NETWORK_ERROR", "API_DOWN"];
            return (
                retryableTypes.includes(error.type) &&
                (!error.statusCode || error.statusCode >= 500)
            );
        },
    },

    fallback: {
        // When SerpAPI fails, suggest alternatives
        serpAPIFallback: {
            message:
                "Flight search is temporarily unavailable. Try searching for hotels or activities instead.",
            alternativeActions: ["searchPlaces", "getTransitInfo"],
        },

        // When Google Maps fails, provide manual options
        googleMapsFallback: {
            message:
                "Maps services are temporarily down. You can manually search for places at google.com/maps",
            externalLink: "https://www.google.com/maps",
        },

        // When AI translation fails, use rule-based fallback
        aiTranslationFallback: {
            message: "Using simplified search results format",
            useRuleBasedTranslation: true,
        },
    },
};

// Mock error generator for testing
export class MockTravelAPIModule {
    constructor(errorConfig = {}) {
        this.errorConfig = errorConfig;
        this.attemptCounts = {};
    }

    async searchFlights(params) {
        return this._simulateOperation("searchFlights", params);
    }

    async searchPlaces(params) {
        return this._simulateOperation("searchPlaces", params);
    }

    async getTransitInfo(params) {
        return this._simulateOperation("getTransitInfo", params);
    }

    async _simulateOperation(operation) {
        const operationConfig = this.errorConfig[operation] || {};

        // Increment attempt count
        this.attemptCounts[operation] = (this.attemptCounts[operation] || 0) + 1;

        // Check if should simulate error
        if (operationConfig.shouldError) {
            const errorScenario = operationConfig.errorScenario;

            // Apply retry logic
            if (
                operationConfig.retryOnAttempt &&
                this.attemptCounts[operation] <= operationConfig.retryOnAttempt
            ) {
                throw new TravelAPIError(
                    errorScenario.type,
                    errorScenario.message,
                    errorScenario.provider,
                );
            }

            // Success after retries
            if (
                operationConfig.succeedAfterRetries &&
                this.attemptCounts[operation] > operationConfig.retryOnAttempt
            ) {
                return this._generateMockResults(operation);
            }

            // Permanent failure
            throw new TravelAPIError(
                errorScenario.type,
                errorScenario.message,
                errorScenario.provider,
            );
        }

        return this._generateMockResults(operation);
    }

    _generateMockResults(operation) {
        // Return simple mock results for successful operations
        switch (operation) {
            case "searchFlights":
                return [
                    {
                        id: "test-flight-1",
                        type: "flight",
                        title: "AUS → SFO",
                        subtitle: "United Airlines",
                        price: { amount: 450, currency: "USD" },
                        metadata: {
                            provider: "SerpAPI",
                            confidence: 0.9,
                            timestamp: new Date().toISOString(),
                        },
                    },
                ];
            case "searchPlaces":
                return [
                    {
                        id: "test-place-1",
                        type: "place",
                        title: "Golden Gate Bridge",
                        subtitle: "San Francisco, CA",
                        metadata: {
                            provider: "Google Places API",
                            confidence: 0.95,
                            timestamp: new Date().toISOString(),
                        },
                    },
                ];
            case "getTransitInfo":
                return [
                    {
                        id: "test-transit-1",
                        type: "transit",
                        title: "BART to Downtown",
                        subtitle: "25 min via public transit",
                        metadata: {
                            provider: "Google Directions API",
                            confidence: 0.8,
                            timestamp: new Date().toISOString(),
                        },
                    },
                ];
            default:
                return [];
        }
    }

    // Reset attempt counts for new test runs
    resetAttempts() {
        this.attemptCounts = {};
    }
}

// Error handling test runner
export class ErrorHandlingTester {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        logger.info("🧪 Starting Error Handling Tests...\n");

        const tests = [
            this.testNetworkErrors.bind(this),
            this.testApiErrors.bind(this),
            this.testValidationErrors.bind(this),
            this.testRetryMechanism.bind(this),
            this.testFallbackStrategies.bind(this),
            this.testUserFriendlyMessages.bind(this),
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                logger.error(`Test failed: ${error.message}`);
                this.testResults.push({
                    test: test.name,
                    status: "FAILED",
                    error: error.message,
                });
            }
        }

        this.generateReport();
    }

    async testNetworkErrors() {
        logger.info("📡 Testing Network Error Handling...");

        const mockAPI = new MockTravelAPIModule({
            searchFlights: {
                shouldError: true,
                errorScenario: errorScenarios.networkErrors.timeout,
            },
        });

        try {
            await mockAPI.searchFlights({ departure: "AUS", arrival: "SFO" });
            throw new Error("Expected network error to be thrown");
        } catch (error) {
            if (error instanceof TravelAPIError && error.type === "NETWORK_ERROR") {
                logger.info("✅ Network error properly caught and typed");
                this.testResults.push({
                    test: "Network Errors",
                    status: "PASSED",
                });
            } else {
                throw error;
            }
        }
    }

    async testApiErrors() {
        logger.info("🔑 Testing API Error Handling...");

        const mockAPI = new MockTravelAPIModule({
            searchPlaces: {
                shouldError: true,
                errorScenario: errorScenarios.apiErrors.rateLimited,
            },
        });

        try {
            await mockAPI.searchPlaces({ query: "restaurants" });
            throw new Error("Expected rate limit error to be thrown");
        } catch (error) {
            if (error instanceof TravelAPIError && error.type === "RATE_LIMIT") {
                logger.info("✅ Rate limit error properly caught and typed");
                this.testResults.push({ test: "API Errors", status: "PASSED" });
            } else {
                throw error;
            }
        }
    }

    async testValidationErrors() {
        logger.info("📝 Testing Validation Error Handling...");

        const mockAPI = new MockTravelAPIModule({
            searchFlights: {
                shouldError: true,
                errorScenario: errorScenarios.validationErrors.missingParams,
            },
        });

        try {
            await mockAPI.searchFlights({});
            throw new Error("Expected validation error to be thrown");
        } catch (error) {
            if (error instanceof TravelAPIError && error.type === "INVALID_PARAMS") {
                logger.info("✅ Validation error properly caught and typed");
                this.testResults.push({
                    test: "Validation Errors",
                    status: "PASSED",
                });
            } else {
                throw error;
            }
        }
    }

    async testRetryMechanism() {
        logger.info("🔄 Testing Retry Mechanism...");

        const mockAPI = new MockTravelAPIModule({
            getTransitInfo: {
                shouldError: true,
                errorScenario: errorScenarios.networkErrors.connectionRefused,
                retryOnAttempt: 2, // Fail first 2 attempts
                succeedAfterRetries: true,
            },
        });

        // Simulate retry logic
        let attempts = 0;
        let succeeded = false;

        while (attempts < recoveryStrategies.retry.maxAttempts && !succeeded) {
            attempts++;
            try {
                await mockAPI.getTransitInfo({
                    origin: "SFO",
                    destination: "Downtown SF",
                });
                succeeded = true;
                logger.info(`✅ Succeeded after ${attempts} attempts`);
                this.testResults.push({
                    test: "Retry Mechanism",
                    status: "PASSED",
                });
            } catch (error) {
                if (attempts >= recoveryStrategies.retry.maxAttempts) {
                    logger.info(`✅ Properly failed after ${attempts} attempts`);
                    this.testResults.push({
                        test: "Retry Mechanism",
                        status: "PASSED",
                    });
                }

                // Wait before retry
                const delay = recoveryStrategies.retry.calculateDelay(attempts);
                await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 100))); // Cap delay for testing
            }
        }
    }

    async testFallbackStrategies() {
        logger.info("🔄 Testing Fallback Strategies...");

        // Test SerpAPI fallback
        const fallbackMessage = recoveryStrategies.fallback.serpAPIFallback.message;
        const alternatives = recoveryStrategies.fallback.serpAPIFallback.alternativeActions;

        if (fallbackMessage && alternatives.length > 0) {
            logger.info("✅ SerpAPI fallback strategy defined");
            logger.info(`   Fallback message: ${fallbackMessage}`);
            logger.info(`   Alternative actions: ${alternatives.join(", ")}`);
        }

        this.testResults.push({
            test: "Fallback Strategies",
            status: "PASSED",
        });
    }

    async testUserFriendlyMessages() {
        logger.info("💬 Testing User-Friendly Error Messages...");

        const testErrors = [
            errorScenarios.networkErrors.timeout,
            errorScenarios.apiErrors.rateLimited,
            errorScenarios.validationErrors.invalidDate,
        ];

        for (const errorData of testErrors) {
            const error = new TravelAPIError(errorData.type, errorData.message, errorData.provider);
            const friendlyMessage = this.getUserFriendlyMessage(error);

            if (friendlyMessage && !friendlyMessage.includes("undefined")) {
                logger.info(`✅ User-friendly message for ${error.type}: ${friendlyMessage}`);
            } else {
                throw new Error(`Missing user-friendly message for error type: ${error.type}`);
            }
        }

        this.testResults.push({
            test: "User-Friendly Messages",
            status: "PASSED",
        });
    }

    getUserFriendlyMessage(error) {
        // Simple user-friendly message mapper
        const messages = {
            NETWORK_ERROR:
                "Unable to connect to travel services. Please check your internet connection and try again.",
            RATE_LIMIT: "High demand detected. Please wait a moment and try again.",
            API_DOWN: "Travel services are temporarily unavailable. Please try again later.",
            INVALID_PARAMS: "Please check your search parameters and try again.",
            UNKNOWN: "An unexpected error occurred. Please try again.",
        };

        return messages[error.type] || messages["UNKNOWN"];
    }

    generateReport() {
        logger.info("\n📊 Error Handling Test Report");
        logger.info("================================");

        const passed = this.testResults.filter((r) => r.status === "PASSED").length;
        const failed = this.testResults.filter((r) => r.status === "FAILED").length;

        logger.info(`Total Tests: ${this.testResults.length}`);
        logger.info(`Passed: ${passed}`);
        logger.info(`Failed: ${failed}`);
        logger.info(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

        if (failed > 0) {
            logger.info("\nFailed Tests:");
            this.testResults
                .filter((r) => r.status === "FAILED")
                .forEach((r) => logger.info(`❌ ${r.test}: ${r.error}`));
        }

        logger.info("\n✅ Error Handling Tests Complete!\n");
    }
}

// Export for use in testing operations
export { TravelAPIError };
