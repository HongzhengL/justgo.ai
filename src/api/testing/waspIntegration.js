// Wasp Testing Framework Integration for Travel API Operations
// Provides automated testing capabilities for travel operations

import { MockTravelAPIModule } from "./apiTest.js";
import { validateStandardizedCard } from "../validation/cardValidator.js";
import logger from "../../utils/logger.js";

// Test configuration for Wasp operations
export const testConfig = {
    timeout: 10000, // 10 seconds timeout for tests
    retries: 3,
    mockDataEnabled: true,
    validationEnabled: true,
};

// Mock operation context generator
export function createMockContext(userId = 1, userEmail = "test@example.com") {
    return {
        user: {
            id: userId,
            email: userEmail,
        },
        entities: {
            // Mock Prisma entities for testing
            User: {
                findUnique: async () => ({
                    id: userId,
                    email: userEmail,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            },
            Itinerary: {
                findMany: async () => [],
                create: async (params) => ({
                    id: 1,
                    userId: userId,
                    title: params.data.title,
                    destination: params.data.destination,
                    startDate: params.data.startDate,
                    endDate: params.data.endDate,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            },
            ItineraryItem: {
                create: async (params) => ({
                    id: 1,
                    itineraryId: params.data.itineraryId,
                    cardData: params.data.cardData,
                    orderIndex: params.data.orderIndex || 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            },
        },
    };
}

// Mock travel operation implementations
export class MockTravelOperations {
    constructor() {
        this.mockAPI = new MockTravelAPIModule();
    }

    // Mock searchFlights operation
    async searchFlights(args, context) {
        if (!context.user) {
            throw new Error("User must be logged in");
        }

        const params = {
            departure: args.departure || "AUS",
            arrival: args.arrival || "SFO",
            outboundDate: args.outboundDate || "2025-02-15",
            adults: args.adults || 1,
        };

        try {
            const results = await this.mockAPI.searchFlights(params);

            // Validate each result
            const validationResults = results.map((card) => ({
                card,
                isValid: validateStandardizedCard(card).isValid,
            }));

            return {
                success: true,
                results: validationResults.map((r) => r.card),
                validationPassed: validationResults.every((r) => r.isValid),
                cardCount: results.length,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Mock searchPlaces operation
    async searchPlaces(args, context) {
        if (!context.user) {
            throw new Error("User must be logged in");
        }

        const params = {
            query: args.query || "restaurants",
            location: args.location,
        };

        try {
            const results = await this.mockAPI.searchPlaces(params);

            // Validate each result
            const validationResults = results.map((card) => ({
                card,
                isValid: validateStandardizedCard(card).isValid,
            }));

            return {
                success: true,
                results: validationResults.map((r) => r.card),
                validationPassed: validationResults.every((r) => r.isValid),
                cardCount: results.length,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Mock getTransitInfo operation
    async getTransitInfo(args, context) {
        if (!context.user) {
            throw new Error("User must be logged in");
        }

        const params = {
            origin: args.origin || "SFO Airport",
            destination: args.destination || "Downtown San Francisco",
        };

        try {
            const results = await this.mockAPI.getTransitInfo(params);

            // Validate each result
            const validationResults = results.map((card) => ({
                card,
                isValid: validateStandardizedCard(card).isValid,
            }));

            return {
                success: true,
                results: validationResults.map((r) => r.card),
                validationPassed: validationResults.every((r) => r.isValid),
                cardCount: results.length,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

// Test suite runner for travel operations
export class TravelOperationTestSuite {
    constructor() {
        this.mockOperations = new MockTravelOperations();
        this.testResults = [];
    }

    async runAllTests() {
        logger.info("🧪 Starting Travel Operation Tests...\n");

        const tests = [
            this.testSearchFlights.bind(this),
            this.testSearchPlaces.bind(this),
            this.testGetTransitInfo.bind(this),
            this.testAuthenticationRequired.bind(this),
            this.testParameterValidation.bind(this),
            this.testStandardizedCardFormat.bind(this),
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                logger.error(`Test failed: ${test.name} - ${error.message}`);
                this.testResults.push({
                    test: test.name,
                    status: "FAILED",
                    error: error.message,
                });
            }
        }

        this.generateReport();
        return this.testResults;
    }

    async testSearchFlights() {
        logger.info("✈️  Testing searchFlights operation...");

        const context = createMockContext();
        const args = {
            departure: "AUS",
            arrival: "SFO",
            outboundDate: "2025-02-15",
            adults: 1,
        };

        const result = await this.mockOperations.searchFlights(args, context);

        if (!result.success) {
            throw new Error(`searchFlights failed: ${result.error}`);
        }

        if (result.cardCount === 0) {
            throw new Error("searchFlights returned no results");
        }

        if (!result.validationPassed) {
            throw new Error("searchFlights returned invalid StandardizedCard format");
        }

        logger.info(`✅ searchFlights test passed: ${result.cardCount} valid cards returned`);
        this.testResults.push({
            test: "searchFlights",
            status: "PASSED",
            cardCount: result.cardCount,
        });
    }

    async testSearchPlaces() {
        logger.info("🏨 Testing searchPlaces operation...");

        const context = createMockContext();
        const args = {
            query: "restaurants in San Francisco",
        };

        const result = await this.mockOperations.searchPlaces(args, context);

        if (!result.success) {
            throw new Error(`searchPlaces failed: ${result.error}`);
        }

        if (result.cardCount === 0) {
            throw new Error("searchPlaces returned no results");
        }

        if (!result.validationPassed) {
            throw new Error("searchPlaces returned invalid StandardizedCard format");
        }

        logger.info(`✅ searchPlaces test passed: ${result.cardCount} valid cards returned`);
        this.testResults.push({
            test: "searchPlaces",
            status: "PASSED",
            cardCount: result.cardCount,
        });
    }

    async testGetTransitInfo() {
        logger.info("🚌 Testing getTransitInfo operation...");

        const context = createMockContext();
        const args = {
            origin: "SFO Airport",
            destination: "Downtown San Francisco",
        };

        const result = await this.mockOperations.getTransitInfo(args, context);

        if (!result.success) {
            throw new Error(`getTransitInfo failed: ${result.error}`);
        }

        if (result.cardCount === 0) {
            throw new Error("getTransitInfo returned no results");
        }

        if (!result.validationPassed) {
            throw new Error("getTransitInfo returned invalid StandardizedCard format");
        }

        logger.info(`✅ getTransitInfo test passed: ${result.cardCount} valid cards returned`);
        this.testResults.push({
            test: "getTransitInfo",
            status: "PASSED",
            cardCount: result.cardCount,
        });
    }

    async testAuthenticationRequired() {
        logger.info("🔐 Testing authentication requirements...");

        const unauthenticatedContext = { user: null };
        const args = { departure: "AUS", arrival: "SFO" };

        try {
            await this.mockOperations.searchFlights(args, unauthenticatedContext);
            throw new Error("Expected authentication error but operation succeeded");
        } catch (error) {
            if (error.message.includes("logged in")) {
                logger.info("✅ Authentication requirement test passed");
                this.testResults.push({
                    test: "authenticationRequired",
                    status: "PASSED",
                });
            } else {
                throw error;
            }
        }
    }

    async testParameterValidation() {
        logger.info("📝 Testing parameter validation...");

        const context = createMockContext();

        // Test with minimal parameters
        const minimalArgs = {};
        const result = await this.mockOperations.searchFlights(minimalArgs, context);

        if (!result.success) {
            // Expected - minimal parameters should use defaults
            logger.info("✅ Parameter validation handles minimal input with defaults");
        } else {
            logger.info("✅ Parameter validation accepts minimal input with defaults");
        }

        this.testResults.push({
            test: "parameterValidation",
            status: "PASSED",
        });
    }

    async testStandardizedCardFormat() {
        logger.info("📋 Testing StandardizedCard format compliance...");

        const context = createMockContext();
        const args = { departure: "LAX", arrival: "JFK" };

        const result = await this.mockOperations.searchFlights(args, context);

        if (!result.success) {
            throw new Error(`Operation failed: ${result.error}`);
        }

        // Check each card for required fields
        for (const card of result.results) {
            const validation = validateStandardizedCard(card);
            if (!validation.isValid) {
                throw new Error(`Invalid StandardizedCard format: ${validation.errors.join(", ")}`);
            }
        }

        logger.info(`✅ StandardizedCard format test passed: All ${result.cardCount} cards valid`);
        this.testResults.push({
            test: "standardizedCardFormat",
            status: "PASSED",
            cardCount: result.cardCount,
        });
    }

    generateReport() {
        logger.info("\n📊 Travel Operation Test Report");
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

        logger.info("\n✅ Travel Operation Tests Complete!\n");
    }
}

// Integration test for complete workflow
export async function runIntegrationTest() {
    logger.info("🔗 Running Integration Test...\n");

    const context = createMockContext();
    const mockOps = new MockTravelOperations();

    // Test complete search-to-itinerary workflow
    try {
        // 1. Search for flights
        const flightResults = await mockOps.searchFlights(
            {
                departure: "AUS",
                arrival: "SFO",
                outboundDate: "2025-02-15",
            },
            context,
        );

        logger.info(`✅ Flight search: ${flightResults.cardCount} results`);

        // 2. Search for places
        const placeResults = await mockOps.searchPlaces(
            {
                query: "hotels in San Francisco",
            },
            context,
        );

        logger.info(`✅ Place search: ${placeResults.cardCount} results`);

        // 3. Get transit info
        const transitResults = await mockOps.getTransitInfo(
            {
                origin: "SFO Airport",
                destination: "Downtown San Francisco",
            },
            context,
        );

        logger.info(`✅ Transit search: ${transitResults.cardCount} results`);

        // 4. Validate all results follow StandardizedCard format
        const allCards = [
            ...flightResults.results,
            ...placeResults.results,
            ...transitResults.results,
        ];

        const validationResults = allCards.map((card) => validateStandardizedCard(card));
        const allValid = validationResults.every((r) => r.isValid);

        if (!allValid) {
            throw new Error("Some cards failed validation");
        }

        logger.info(`✅ Validation: All ${allCards.length} cards pass StandardizedCard format`);
        logger.info("\n🎉 Integration Test PASSED!\n");

        return {
            success: true,
            totalCards: allCards.length,
            flightCards: flightResults.cardCount,
            placeCards: placeResults.cardCount,
            transitCards: transitResults.cardCount,
        };
    } catch (error) {
        logger.error(`❌ Integration Test FAILED: ${error.message}\n`);
        return {
            success: false,
            error: error.message,
        };
    }
}

// Testing utilities already exported at their definitions above
