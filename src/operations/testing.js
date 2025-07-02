/**
 * Testing Operations for Travel API Module
 * Wasp operations that can be called from the dashboard for live API testing
 */

import { HttpError } from "wasp/server";
import { TravelAPIModule } from "../api/index.js";
import { MockTravelAPIModule } from "../api/testing/apiTest.js";
import { runAPITests, runQuickAPITest } from "../api/testing/apiTest.js";
import { ErrorHandlingTester } from "../api/testing/errorHandling.js";
import { PerformanceTester } from "../api/testing/performanceTests.js";
import { TravelOperationTestSuite, runIntegrationTest } from "../api/testing/waspIntegration.js";
import { getConfigurationHealth, validateEnvironment } from "../api/validation/envValidator.js";

/**
 * Comprehensive API Module Test Operation
 * Runs full test suite and returns detailed results
 */
export const testApiModule = async (args, context) => {
    // Authentication check
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to run API tests");
    }

    console.log(`[API-TEST-OPERATION] Test initiated by user: ${context.user.email}`);
    console.log(`[API-TEST-OPERATION] Starting comprehensive API module test suite...`);

    try {
        // Run the comprehensive test suite
        const testResults = await runAPITests();

        console.log(`[API-TEST-OPERATION] Test suite completed`);
        console.log(`[API-TEST-OPERATION] Results summary:`, {
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
        console.error(`[API-TEST-OPERATION] Test suite failed:`, error);

        throw new HttpError(500, `API testing failed: ${error.message}`);
    }
};

/**
 * Quick API Test Operation
 * Runs a simplified test for rapid verification
 */
export const quickApiTest = async (args, context) => {
    // Authentication check
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to run API tests");
    }

    console.log(`[QUICK-API-TEST] Quick test initiated by user: ${context.user.email}`);

    try {
        // Run the quick test
        const testResults = await runQuickAPITest();

        console.log(`[QUICK-API-TEST] Quick test completed successfully`);
        console.log(`[QUICK-API-TEST] Results:`, testResults.summary);

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
        console.error(`[QUICK-API-TEST] Quick test failed:`, error);

        throw new HttpError(500, `Quick API test failed: ${error.message}`);
    }
};

/**
 * Check API Health Operation
 * Verifies API module configuration and basic connectivity
 */
export const checkApiHealth = async (args, context) => {
    // Authentication check
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to check API health");
    }

    console.log(`[API-HEALTH-CHECK] Health check initiated by user: ${context.user.email}`);

    try {
        // Comprehensive environment validation
        const configHealth = getConfigurationHealth();

        // Check if TravelAPIModule can be imported
        let moduleImportCheck = false;
        try {
            // Use statically imported TravelAPIModule
            const apiModule = new TravelAPIModule();
            moduleImportCheck = true;
            console.log(`[API-HEALTH-CHECK] TravelAPIModule imported successfully`);
        } catch (importError) {
            console.error(`[API-HEALTH-CHECK] TravelAPIModule import failed:`, importError);
        }

        const healthStatus = {
            moduleImport: moduleImportCheck,
            environment: configHealth,
            overallHealth:
                moduleImportCheck &&
                configHealth.healthy &&
                configHealth.availableServices.length > 0,
            timestamp: new Date().toISOString(),
        };

        console.log(`[API-HEALTH-CHECK] Health check results:`, {
            moduleImport: healthStatus.moduleImport,
            configurationHealthy: configHealth.healthy,
            availableServices: configHealth.availableServices,
            enabledFeatures: configHealth.enabledFeatures,
        });

        return {
            success: healthStatus.overallHealth,
            status: healthStatus,
            message: healthStatus.overallHealth
                ? `API module health check passed. ${configHealth.availableServices.length} services available.`
                : "API module health check failed. Check environment configuration.",
            configuration: {
                healthy: configHealth.healthy,
                availableServices: configHealth.availableServices,
                unavailableServices: configHealth.unavailableServices,
                enabledFeatures: configHealth.enabledFeatures,
                errors: configHealth.errors,
                warnings: configHealth.warnings,
            },
            recommendations: healthStatus.overallHealth
                ? []
                : [
                      !moduleImportCheck ? "Check TravelAPIModule implementation" : null,
                      ...configHealth.errors.map(
                          (error) => `Fix ${error.variable}: ${error.message}`,
                      ),
                      configHealth.availableServices.length === 0
                          ? "Configure at least one API key (SerpAPI, Google Maps, or OpenAI)"
                          : null,
                  ].filter(Boolean),
        };
    } catch (error) {
        console.error(`[API-HEALTH-CHECK] Health check failed:`, error);

        return {
            success: false,
            error: error.message,
            message: "API health check encountered an error",
            timestamp: new Date().toISOString(),
        };
    }
};

/**
 * Test specific API operation
 * Allows testing individual operations with custom parameters
 */
export const testSpecificOperation = async ({ operation, params }, context) => {
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

    console.log(`[SPECIFIC-API-TEST] Testing ${operation} operation with params:`, params);

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

        console.log(
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
        console.error(`[SPECIFIC-API-TEST] ${operation} test failed:`, error);

        throw new HttpError(500, `${operation} test failed: ${error.message}`);
    }
};

// Error handling test operation
export const testErrorHandling = async (args, context) => {
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "Must be logged in to run tests");
    }

    console.log("\n🔥 Starting Error Handling Tests...");
    console.log("User:", context.user.email);

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

        console.log("\n✅ Error Handling Tests Complete!");
        console.log(
            `📊 Summary: ${summary.passed}/${summary.totalTests} passed (${summary.successRate}%)`,
        );

        return {
            success: true,
            message: `Error handling tests completed: ${summary.passed}/${summary.totalTests} passed`,
            summary: summary,
            results: tester.testResults,
        };
    } catch (error) {
        console.error("❌ Error handling tests failed:", error);
        return {
            success: false,
            message: `Error handling tests failed: ${error.message}`,
            error: error.message,
        };
    }
};

// Performance test operation
export const testPerformance = async (args, context) => {
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "Must be logged in to run tests");
    }

    console.log("\n🏃‍♂️ Starting Performance Tests...");
    console.log("User:", context.user.email);

    try {
        const tester = new PerformanceTester();
        const results = await tester.runAllPerformanceTests();

        if (results.success) {
            console.log("\n✅ Performance Tests Complete!");
            console.log(`📊 Summary: ${results.summary.message}`);

            return {
                success: true,
                message: results.summary.message,
                summary: results.summary,
                results: results.results,
            };
        } else {
            console.error("❌ Performance tests failed:", results.error);
            return {
                success: false,
                message: `Performance tests failed: ${results.error}`,
                error: results.error,
            };
        }
    } catch (error) {
        console.error("❌ Performance tests failed:", error);
        return {
            success: false,
            message: `Performance tests failed: ${error.message}`,
            error: error.message,
        };
    }
};

// Wasp integration test operation
export const testWaspIntegration = async (args, context) => {
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "Must be logged in to run tests");
    }

    console.log("\n🔗 Starting Wasp Integration Tests...");
    console.log("User:", context.user.email);

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

        console.log("\n✅ Wasp Integration Tests Complete!");
        console.log(`📊 Summary: ${summary.passed}/${summary.totalTests} unit tests passed`);
        console.log(`🔗 Integration test: ${summary.integrationPassed ? "PASSED" : "FAILED"}`);

        return {
            success: overallSuccess,
            message: overallSuccess
                ? `Wasp integration tests completed successfully: ${summary.passed}/${summary.totalTests} passed, integration test passed`
                : `Wasp integration tests had failures: ${summary.failed} unit test failures, integration ${summary.integrationPassed ? "passed" : "failed"}`,
            summary: summary,
            testResults: testResults,
            integrationResult: integrationResult,
        };
    } catch (error) {
        console.error("❌ Wasp integration tests failed:", error);
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
    checkApiHealth,
    testSpecificOperation,
    testErrorHandling,
    testPerformance,
    testWaspIntegration,
};
