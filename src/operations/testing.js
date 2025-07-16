/**
 * Testing Operations for Travel API Module
 * Wasp operations that can be called from the dashboard for live API testing
 * NOTE: These operations are only available in development environment
 */

import logger from "../utils/logger.js";

import { HttpError } from "wasp/server";
import { shouldIncludeTestingOperations, getEnvironment } from "../config/environment.js";
import { MockTravelAPIModule } from "../api/testing/apiTest.js";
import { runAPITests, runQuickAPITest } from "../api/testing/apiTest.js";
import { ErrorHandlingTester } from "../api/testing/errorHandling.js";
import { PerformanceTester } from "../api/testing/performanceTests.js";
import { TravelOperationTestSuite, runIntegrationTest } from "../api/testing/waspIntegration.js";

/**
 * Helper function to check if testing operations are allowed
 */
function checkTestingOperationsAllowed() {
    if (!shouldIncludeTestingOperations()) {
        throw new HttpError(
            403,
            `Testing operations are not available in ${getEnvironment()} environment`,
        );
    }
}

/**
 * Comprehensive API Module Test Operation
 * Runs full test suite and returns detailed results
 */
export const testApiModule = async (args, context) => {
    checkTestingOperationsAllowed();
    // Authentication check
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to run API tests");
    }

    logger.info(`[API-TEST-OPERATION] Test initiated by user: ${context.user.email}`);
    logger.info(`[API-TEST-OPERATION] Starting comprehensive API module test suite...`);

    try {
        // Run the comprehensive test suite
        const testResults = await runAPITests();

        logger.info(`[API-TEST-OPERATION] Test suite completed`);
        logger.info(`[API-TEST-OPERATION] Results summary:`, {
            totalTests: testResults.summary?.totalTests || 0,
            passedTests: testResults.summary?.passedTests || 0,
            failedTests: testResults.summary?.failedTests || 0,
            totalCards: testResults.summary?.totalCards || 0,
            validCards: testResults.summary?.validCards || 0,
            totalErrors: testResults.summary?.totalErrors || 0,
            duration: testResults.totalDuration || 0,
        });

        // Return sanitized results for frontend display
        return {
            success:
                testResults.summary?.failedTests === 0 && testResults.summary?.totalErrors === 0,
            summary: testResults.summary || {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                totalCards: 0,
                validCards: 0,
                totalErrors: 0,
            },
            duration: testResults.totalDuration || 0,
            timestamp: new Date().toISOString(),
            message:
                testResults.summary?.failedTests === 0 && testResults.summary?.totalErrors === 0
                    ? "All API tests passed successfully! Check console for detailed logs."
                    : "Some tests failed or validation errors detected. Check console for details.",
            testDetails: {
                flightSearch: {
                    success: testResults.tests?.flightSearch?.success || false,
                    cardCount: testResults.tests?.flightSearch?.results?.length || 0,
                    validationPassed: testResults.tests?.flightSearch?.validation?.isValid || false,
                },
                placeSearch: {
                    success: testResults.tests?.placeSearch?.success || false,
                    cardCount: testResults.tests?.placeSearch?.results?.length || 0,
                    validationPassed: testResults.tests?.placeSearch?.validation?.isValid || false,
                },
                transitInfo: {
                    success: testResults.tests?.transitInfo?.success || false,
                    cardCount: testResults.tests?.transitInfo?.results?.length || 0,
                    validationPassed: testResults.tests?.transitInfo?.validation?.isValid || false,
                },
            },
        };
    } catch (error) {
        logger.error(`[API-TEST-OPERATION] Test suite failed:`, error);

        throw new HttpError(500, `API testing failed: ${error.message}`);
    }
};

/**
 * Quick API Test Operation
 * Runs a simplified test for rapid verification
 */
export const quickApiTest = async (args, context) => {
    checkTestingOperationsAllowed();
    // Authentication check
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to run API tests");
    }

    logger.info(`[QUICK-API-TEST] Quick test initiated by user: ${context.user.email}`);

    try {
        // Run the quick test
        const testResults = await runQuickAPITest();

        logger.info(`[QUICK-API-TEST] Quick test completed successfully`);
        logger.info(`[QUICK-API-TEST] Results:`, testResults.summary);

        return {
            success: testResults.success,
            summary: testResults.summary || {},
            message: testResults.success
                ? "Quick API test passed! All operations returned valid StandardizedCard arrays."
                : `Quick API test failed: ${testResults.error}`,
            timestamp: new Date().toISOString(),
            cardCounts: {
                flights: testResults.summary?.flights?.count || 0,
                places: testResults.summary?.places?.count || 0,
                transit: testResults.summary?.transit?.count || 0,
            },
        };
    } catch (error) {
        logger.error(`[QUICK-API-TEST] Quick test failed:`, error);

        throw new HttpError(500, `Quick API test failed: ${error.message}`);
    }
};

/**
 * Test specific API operation
 * Allows testing individual operations with custom parameters
 */
export const testSpecificOperation = async ({ operation, params }, context) => {
    checkTestingOperationsAllowed();
    // Authentication check
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to test specific operations");
    }

    // Validate operation parameter
    const validOperations = ["searchFlights", "searchPlaces", "getTransitInfo"];
    if (!validOperations.includes(operation)) {
        throw new HttpError(
            400,
            `Invalid operation. Must be one of: ${validOperations.join(", ")}`,
        );
    }

    logger.info(`[SPECIFIC-API-TEST] Testing ${operation} operation with params:`, params);

    try {
        // Use statically imported MockTravelAPIModule
        const mockAPI = new MockTravelAPIModule();

        let results;
        const startTime = Date.now();

        switch (operation) {
            case "searchFlights":
                results = await mockAPI.searchFlights(params);
                break;
            case "searchPlaces":
                results = await mockAPI.searchPlaces(params);
                break;
            case "getTransitInfo":
                results = await mockAPI.getTransitInfo(params);
                break;
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        logger.info(
            `[SPECIFIC-API-TEST] ${operation} completed in ${duration}ms, returned ${results.length} cards`,
        );

        return {
            success: true,
            operation,
            params,
            results: results.map((card) => ({
                id: card.id,
                type: card.type,
                title: card.title,
                subtitle: card.subtitle,
                hasPrice: !!card.price,
                hasLocation: !!card.location,
                provider: card.metadata?.provider,
            })), // Return simplified card info
            cardCount: results.length,
            duration,
            message: `${operation} test completed successfully. Generated ${results.length} StandardizedCard objects.`,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        logger.error(`[SPECIFIC-API-TEST] ${operation} test failed:`, error);

        throw new HttpError(500, `${operation} test failed: ${error.message}`);
    }
};

// Error handling test operation
export const testErrorHandling = async (args, context) => {
    checkTestingOperationsAllowed();
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "Must be logged in to run tests");
    }

    logger.info("\n🔥 Starting Error Handling Tests...");
    logger.info("User:", context.user.email);

    try {
        const tester = new ErrorHandlingTester();
        await tester.runAllTests();

        const summary = {
            totalTests: tester.testResults.length,
            passed: tester.testResults.filter((r) => r.status === "PASSED").length,
            failed: tester.testResults.filter((r) => r.status === "FAILED").length,
            successRate:
                tester.testResults.length > 0
                    ? (
                          (tester.testResults.filter((r) => r.status === "PASSED").length /
                              tester.testResults.length) *
                          100
                      ).toFixed(1)
                    : 0,
        };

        logger.info("\n✅ Error Handling Tests Complete!");
        logger.info(
            `📊 Summary: ${summary.passed}/${summary.totalTests} passed (${summary.successRate}%)`,
        );

        return {
            success: true,
            message: `Error handling tests completed: ${summary.passed}/${summary.totalTests} passed`,
            summary: summary,
            results: tester.testResults,
        };
    } catch (error) {
        logger.error("❌ Error handling tests failed:", error);
        return {
            success: false,
            message: `Error handling tests failed: ${error.message}`,
            error: error.message,
        };
    }
};

// Performance test operation
export const testPerformance = async (args, context) => {
    checkTestingOperationsAllowed();
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "Must be logged in to run tests");
    }

    logger.info("\n🏃‍♂️ Starting Performance Tests...");
    logger.info("User:", context.user.email);

    try {
        const tester = new PerformanceTester();
        const results = await tester.runAllPerformanceTests();

        if (results.success) {
            logger.info("\n✅ Performance Tests Complete!");
            logger.info(`📊 Summary: ${results.summary.message}`);

            return {
                success: true,
                message: results.summary.message,
                summary: results.summary,
                results: results.results,
            };
        } else {
            logger.error("❌ Performance tests failed:", results.error);
            return {
                success: false,
                message: `Performance tests failed: ${results.error}`,
                error: results.error,
            };
        }
    } catch (error) {
        logger.error("❌ Performance tests failed:", error);
        return {
            success: false,
            message: `Performance tests failed: ${error.message}`,
            error: error.message,
        };
    }
};

// Wasp integration test operation
export const testWaspIntegration = async (args, context) => {
    checkTestingOperationsAllowed();
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "Must be logged in to run tests");
    }

    logger.info("\n🔗 Starting Wasp Integration Tests...");
    logger.info("User:", context.user.email);

    try {
        // Run the travel operations test suite
        const testSuite = new TravelOperationTestSuite();
        const testResults = await testSuite.runAllTests();

        // Run integration test
        const integrationResult = await runIntegrationTest();

        const summary = {
            totalTests: testResults.length,
            passed: testResults.filter((r) => r.status === "PASSED").length,
            failed: testResults.filter((r) => r.status === "FAILED").length,
            integrationPassed: integrationResult.success,
            totalCards: integrationResult.totalCards || 0,
        };

        const overallSuccess = summary.failed === 0 && summary.integrationPassed;

        logger.info("\n✅ Wasp Integration Tests Complete!");
        logger.info(`📊 Summary: ${summary.passed}/${summary.totalTests} unit tests passed`);
        logger.info(`🔗 Integration test: ${summary.integrationPassed ? "PASSED" : "FAILED"}`);

        return {
            success: overallSuccess,
            message: overallSuccess
                ? `Wasp integration tests completed successfully: ${summary.passed}/${summary.totalTests} passed, integration test passed`
                : `Wasp integration tests had failures: ${
                      summary.failed
                  } unit test failures, integration ${
                      summary.integrationPassed ? "passed" : "failed"
                  }`,
            summary: summary,
            testResults: testResults,
            integrationResult: integrationResult,
        };
    } catch (error) {
        logger.error("❌ Wasp integration tests failed:", error);
        return {
            success: false,
            message: `Wasp integration tests failed: ${error.message}`,
            error: error.message,
        };
    }
};

export default {
    testApiModule,
    quickApiTest,
    testSpecificOperation,
    testErrorHandling,
    testPerformance,
    testWaspIntegration,
};
