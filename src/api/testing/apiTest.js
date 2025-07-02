/**
 * API Testing Module with Console Logging
 * Tests TravelAPIModule functionality with mock data and logs results
 */

import { TravelAPIModule } from "../index.js";
import mockData from "./mockData.js";

/**
 * Test Configuration
 */
const TEST_CONFIG = {
    enableConsoleLogs: true,
    enableTimingLogs: true,
    enableDetailedOutput: true,
    testTimeout: 10000, // 10 seconds
};

/**
 * Console Logger Utility
 */
class TestLogger {
    static log(message, data = null) {
        if (!TEST_CONFIG.enableConsoleLogs) return;

        const timestamp = new Date().toISOString();
        console.log(`[API-TEST ${timestamp}] ${message}`);

        if (data && TEST_CONFIG.enableDetailedOutput) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    static error(message, error = null) {
        const timestamp = new Date().toISOString();
        console.error(`[API-TEST-ERROR ${timestamp}] ${message}`);

        if (error) {
            console.error(error);
        }
    }

    static timing(operation, startTime, endTime) {
        if (!TEST_CONFIG.enableTimingLogs) return;

        const duration = endTime - startTime;
        console.log(`[API-TIMING] ${operation}: ${duration}ms`);

        // Check against TODO.md performance requirements
        if (duration > 3000) {
            console.warn(`⚠️  ${operation} exceeded 3-second target: ${duration}ms`);
        }

        return duration;
    }

    static section(title) {
        if (!TEST_CONFIG.enableConsoleLogs) return;

        const line = "=".repeat(50);
        console.log(`\n${line}`);
        console.log(`  ${title}`);
        console.log(`${line}\n`);
    }

    static subsection(title) {
        if (!TEST_CONFIG.enableConsoleLogs) return;

        console.log(`\n--- ${title} ---`);
    }
}

/**
 * StandardizedCard Validator
 */
class CardValidator {
    static validateCard(card, expectedType) {
        const errors = [];

        // Required fields per TODO.md
        const requiredFields = [
            "id",
            "type",
            "title",
            "subtitle",
            "location",
            "details",
            "essentialDetails",
            "externalLinks",
            "metadata",
        ];

        requiredFields.forEach((field) => {
            if (!card[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // Type validation
        if (card.type !== expectedType) {
            errors.push(`Expected type '${expectedType}', got '${card.type}'`);
        }

        // Location structure validation
        if (card.location && typeof card.location !== "object") {
            errors.push("Location must be an object");
        }

        // ExternalLinks structure validation
        if (card.externalLinks && typeof card.externalLinks !== "object") {
            errors.push("ExternalLinks must be an object");
        }

        // Metadata structure validation
        if (card.metadata) {
            if (!card.metadata.provider) {
                errors.push("Metadata missing provider field");
            }
            if (!card.metadata.timestamp) {
                errors.push("Metadata missing timestamp field");
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    static validateCardArray(cards, expectedType) {
        if (!Array.isArray(cards)) {
            return {
                isValid: false,
                errors: ["Result is not an array"],
                cardResults: [],
            };
        }

        const cardResults = cards.map((card, index) => {
            const validation = this.validateCard(card, expectedType);
            return {
                index,
                card,
                ...validation,
            };
        });

        const allValid = cardResults.every((result) => result.isValid);
        const totalErrors = cardResults.reduce((sum, result) => sum + result.errors.length, 0);

        return {
            isValid: allValid,
            totalCards: cards.length,
            validCards: cardResults.filter((r) => r.isValid).length,
            totalErrors,
            cardResults,
        };
    }
}

/**
 * Mock API Module for Testing
 * Overrides actual API calls with mock data
 */
class MockTravelAPIModule extends TravelAPIModule {
    constructor() {
        super();
        this.mockMode = true;
    }

    async searchFlights(params) {
        TestLogger.log("🛫 MockTravelAPIModule.searchFlights called", params);

        const startTime = Date.now();

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            // Use mock SerpAPI response
            const mockResponse = mockData.getMockResponse("serpapi", "searchFlights");

            // Process through existing translation logic
            const result = await super.translateSerpAPIFlights(mockResponse);

            const endTime = Date.now();
            TestLogger.timing("searchFlights (mock)", startTime, endTime);

            TestLogger.log("✅ searchFlights completed", {
                inputParams: params,
                resultCount: result.length,
                firstResult: result[0] || null,
            });

            return result;
        } catch (error) {
            const endTime = Date.now();
            TestLogger.timing("searchFlights (mock-error)", startTime, endTime);
            TestLogger.error("❌ searchFlights failed", error);
            throw error;
        }
    }

    async searchPlaces(params) {
        TestLogger.log("📍 MockTravelAPIModule.searchPlaces called", params);

        const startTime = Date.now();

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 150));

        try {
            // Use mock Google Places response
            const mockResponse = mockData.getMockResponse("googlemaps", "searchPlaces");

            // Process through existing translation logic
            const result = await super.translateGooglePlaces(mockResponse);

            const endTime = Date.now();
            TestLogger.timing("searchPlaces (mock)", startTime, endTime);

            TestLogger.log("✅ searchPlaces completed", {
                inputParams: params,
                resultCount: result.length,
                firstResult: result[0] || null,
            });

            return result;
        } catch (error) {
            const endTime = Date.now();
            TestLogger.timing("searchPlaces (mock-error)", startTime, endTime);
            TestLogger.error("❌ searchPlaces failed", error);
            throw error;
        }
    }

    async getTransitInfo(params) {
        TestLogger.log("🚌 MockTravelAPIModule.getTransitInfo called", params);

        const startTime = Date.now();

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 200));

        try {
            // Use mock Google Directions response
            const mockResponse = mockData.getMockResponse("googlemaps", "getTransitInfo");

            // Process through existing translation logic
            const result = await super.translateGoogleDirections(mockResponse);

            const endTime = Date.now();
            TestLogger.timing("getTransitInfo (mock)", startTime, endTime);

            TestLogger.log("✅ getTransitInfo completed", {
                inputParams: params,
                resultCount: result.length,
                firstResult: result[0] || null,
            });

            return result;
        } catch (error) {
            const endTime = Date.now();
            TestLogger.timing("getTransitInfo (mock-error)", startTime, endTime);
            TestLogger.error("❌ getTransitInfo failed", error);
            throw error;
        }
    }
}

/**
 * Test Runner Functions
 */
async function testFlightSearch() {
    TestLogger.subsection("Flight Search Test");

    const mockAPI = new MockTravelAPIModule();
    const testParams = mockData.mockTestParameters.searchFlights;

    TestLogger.log("Testing flight search with parameters", testParams);

    try {
        const results = await mockAPI.searchFlights(testParams);

        // Validate StandardizedCard format
        const validation = CardValidator.validateCardArray(results, "flight");

        TestLogger.log("Flight search validation results", {
            totalCards: validation.totalCards,
            validCards: validation.validCards,
            totalErrors: validation.totalErrors,
            isValid: validation.isValid,
        });

        if (!validation.isValid) {
            TestLogger.error("❌ Flight cards failed validation");
            validation.cardResults.forEach((result, index) => {
                if (!result.isValid) {
                    TestLogger.error(`Card ${index} errors:`, result.errors);
                }
            });
        } else {
            TestLogger.log("✅ All flight cards passed validation");
        }

        return {
            success: true,
            results,
            validation,
        };
    } catch (error) {
        TestLogger.error("Flight search test failed", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

async function testPlaceSearch() {
    TestLogger.subsection("Place Search Test");

    const mockAPI = new MockTravelAPIModule();
    const testParams = mockData.mockTestParameters.searchPlaces;

    TestLogger.log("Testing place search with parameters", testParams);

    try {
        const results = await mockAPI.searchPlaces(testParams);

        // Validate StandardizedCard format
        const validation = CardValidator.validateCardArray(results, "place");

        TestLogger.log("Place search validation results", {
            totalCards: validation.totalCards,
            validCards: validation.validCards,
            totalErrors: validation.totalErrors,
            isValid: validation.isValid,
        });

        if (!validation.isValid) {
            TestLogger.error("❌ Place cards failed validation");
            validation.cardResults.forEach((result, index) => {
                if (!result.isValid) {
                    TestLogger.error(`Card ${index} errors:`, result.errors);
                }
            });
        } else {
            TestLogger.log("✅ All place cards passed validation");
        }

        return {
            success: true,
            results,
            validation,
        };
    } catch (error) {
        TestLogger.error("Place search test failed", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

async function testTransitInfo() {
    TestLogger.subsection("Transit Info Test");

    const mockAPI = new MockTravelAPIModule();
    const testParams = mockData.mockTestParameters.getTransitInfo;

    TestLogger.log("Testing transit info with parameters", testParams);

    try {
        const results = await mockAPI.getTransitInfo(testParams);

        // Validate StandardizedCard format
        const validation = CardValidator.validateCardArray(results, "transit");

        TestLogger.log("Transit info validation results", {
            totalCards: validation.totalCards,
            validCards: validation.validCards,
            totalErrors: validation.totalErrors,
            isValid: validation.isValid,
        });

        if (!validation.isValid) {
            TestLogger.error("❌ Transit cards failed validation");
            validation.cardResults.forEach((result, index) => {
                if (!result.isValid) {
                    TestLogger.error(`Card ${index} errors:`, result.errors);
                }
            });
        } else {
            TestLogger.log("✅ All transit cards passed validation");
        }

        return {
            success: true,
            results,
            validation,
        };
    } catch (error) {
        TestLogger.error("Transit info test failed", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Comprehensive Test Suite
 */
export async function runAPITests() {
    TestLogger.section("🧪 API MODULE TESTING SUITE");

    TestLogger.log("Starting comprehensive API module tests...");
    TestLogger.log("Configuration", TEST_CONFIG);

    const testResults = {
        startTime: Date.now(),
        tests: {
            flightSearch: null,
            placeSearch: null,
            transitInfo: null,
        },
        summary: {
            totalTests: 3,
            passedTests: 0,
            failedTests: 0,
            totalCards: 0,
            validCards: 0,
            totalErrors: 0,
        },
    };

    try {
        // Test 1: Flight Search
        testResults.tests.flightSearch = await testFlightSearch();

        // Test 2: Place Search
        testResults.tests.placeSearch = await testPlaceSearch();

        // Test 3: Transit Info
        testResults.tests.transitInfo = await testTransitInfo();

        // Calculate summary
        Object.values(testResults.tests).forEach((test) => {
            if (test.success) {
                testResults.summary.passedTests++;
                if (test.validation) {
                    testResults.summary.totalCards += test.validation.totalCards;
                    testResults.summary.validCards += test.validation.validCards;
                    testResults.summary.totalErrors += test.validation.totalErrors;
                }
            } else {
                testResults.summary.failedTests++;
            }
        });

        testResults.endTime = Date.now();
        testResults.totalDuration = testResults.endTime - testResults.startTime;

        // Final Results
        TestLogger.section("📊 TEST RESULTS SUMMARY");

        TestLogger.log("Test Completion Summary", {
            totalTests: testResults.summary.totalTests,
            passedTests: testResults.summary.passedTests,
            failedTests: testResults.summary.failedTests,
            successRate: `${Math.round((testResults.summary.passedTests / testResults.summary.totalTests) * 100)}%`,
            totalDuration: `${testResults.totalDuration}ms`,
            totalCards: testResults.summary.totalCards,
            validCards: testResults.summary.validCards,
            cardValidationRate:
                testResults.summary.totalCards > 0
                    ? `${Math.round((testResults.summary.validCards / testResults.summary.totalCards) * 100)}%`
                    : "N/A",
            totalValidationErrors: testResults.summary.totalErrors,
        });

        if (testResults.summary.failedTests === 0 && testResults.summary.totalErrors === 0) {
            TestLogger.log("🎉 ALL TESTS PASSED - API MODULE WORKING CORRECTLY");
        } else {
            TestLogger.error("⚠️  Some tests failed or validation errors detected");
        }

        return testResults;
    } catch (error) {
        testResults.endTime = Date.now();
        TestLogger.error("Test suite execution failed", error);
        return {
            ...testResults,
            error: error.message,
            success: false,
        };
    }
}

/**
 * Quick Test Function for Dashboard Usage
 */
export async function runQuickAPITest() {
    TestLogger.section("⚡ QUICK API TEST");

    try {
        const mockAPI = new MockTravelAPIModule();

        // Test one operation of each type
        const flightResult = await mockAPI.searchFlights(mockData.mockTestParameters.searchFlights);
        const placeResult = await mockAPI.searchPlaces(mockData.mockTestParameters.searchPlaces);
        const transitResult = await mockAPI.getTransitInfo(
            mockData.mockTestParameters.getTransitInfo,
        );

        const summary = {
            flights: {
                count: flightResult.length,
                firstCard: flightResult[0]?.type || "none",
            },
            places: {
                count: placeResult.length,
                firstCard: placeResult[0]?.type || "none",
            },
            transit: {
                count: transitResult.length,
                firstCard: transitResult[0]?.type || "none",
            },
            timestamp: new Date().toISOString(),
        };

        TestLogger.log("🎯 Quick test completed successfully", summary);

        return {
            success: true,
            summary,
            results: {
                flights: flightResult,
                places: placeResult,
                transit: transitResult,
            },
        };
    } catch (error) {
        TestLogger.error("Quick test failed", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

export { MockTravelAPIModule, TestLogger, CardValidator };

export default {
    runAPITests,
    runQuickAPITest,
    TestLogger,
    CardValidator,
    MockTravelAPIModule,
};
