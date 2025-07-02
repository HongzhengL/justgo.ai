// Performance Testing System for Travel API Module
// Validates 3-second response time requirement from TODO.md

import { MockTravelAPIModule } from "./apiTest.js";

// Performance benchmarks from TODO.md
export const performanceBenchmarks = {
    // TODO.md requirement: "Average response time < 3 seconds for AI agent responses"
    maxResponseTime: 3000, // 3 seconds in milliseconds

    // Additional performance targets
    targets: {
        fast: 1000, // < 1 second (excellent)
        acceptable: 2000, // < 2 seconds (good)
        slow: 3000, // < 3 seconds (requirement)
        timeout: 10000, // 10 seconds (failure)
    },

    // Memory usage targets
    memory: {
        maxHeapUsage: 100 * 1024 * 1024, // 100MB
        maxResultSetSize: 50, // Max results per query
    },
};

// Performance monitoring utilities
export class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.startTimes = new Map();
        this.memoryBaseline = this.getMemoryUsage();
    }

    startTimer(operationId) {
        this.startTimes.set(operationId, {
            startTime: performance.now(),
            startMemory: this.getMemoryUsage(),
        });
    }

    endTimer(operationId, metadata = {}) {
        const start = this.startTimes.get(operationId);
        if (!start) {
            throw new Error(`No start time recorded for operation: ${operationId}`);
        }

        const endTime = performance.now();
        const endMemory = this.getMemoryUsage();

        const metric = {
            operationId,
            duration: endTime - start.startTime,
            memoryUsed: endMemory.used - start.startMemory.used,
            timestamp: new Date().toISOString(),
            ...metadata,
        };

        this.metrics.push(metric);
        this.startTimes.delete(operationId);

        return metric;
    }

    getMemoryUsage() {
        if (typeof process !== "undefined" && process.memoryUsage) {
            const usage = process.memoryUsage();
            return {
                used: usage.heapUsed,
                total: usage.heapTotal,
                external: usage.external,
            };
        }

        // Fallback for browser environment
        if (typeof performance !== "undefined" && performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                external: 0,
            };
        }

        return { used: 0, total: 0, external: 0 };
    }

    getAverageResponseTime() {
        if (this.metrics.length === 0) return 0;

        const totalTime = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
        return totalTime / this.metrics.length;
    }

    getPercentile(percentile) {
        if (this.metrics.length === 0) return 0;

        const sorted = this.metrics.map((m) => m.duration).sort((a, b) => a - b);

        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    getPerformanceGrade() {
        const avgTime = this.getAverageResponseTime();
        const p95 = this.getPercentile(95);

        if (
            avgTime < performanceBenchmarks.targets.fast &&
            p95 < performanceBenchmarks.targets.acceptable
        ) {
            return "EXCELLENT";
        } else if (
            avgTime < performanceBenchmarks.targets.acceptable &&
            p95 < performanceBenchmarks.targets.slow
        ) {
            return "GOOD";
        } else if (
            avgTime < performanceBenchmarks.targets.slow &&
            p95 < performanceBenchmarks.targets.timeout
        ) {
            return "ACCEPTABLE";
        } else {
            return "POOR";
        }
    }

    generateReport() {
        const avgTime = this.getAverageResponseTime();
        const p50 = this.getPercentile(50);
        const p95 = this.getPercentile(95);
        const p99 = this.getPercentile(99);
        const grade = this.getPerformanceGrade();

        return {
            totalOperations: this.metrics.length,
            averageResponseTime: Math.round(avgTime),
            medianResponseTime: Math.round(p50),
            p95ResponseTime: Math.round(p95),
            p99ResponseTime: Math.round(p99),
            performanceGrade: grade,
            meetsRequirement: avgTime < performanceBenchmarks.maxResponseTime,
            slowestOperation: Math.round(Math.max(...this.metrics.map((m) => m.duration))),
            fastestOperation: Math.round(Math.min(...this.metrics.map((m) => m.duration))),
            memoryMetrics: this.getMemoryMetrics(),
        };
    }

    getMemoryMetrics() {
        if (this.metrics.length === 0) return null;

        const memoryUsages = this.metrics.map((m) => m.memoryUsed);
        const totalMemoryUsed = memoryUsages.reduce((sum, usage) => sum + usage, 0);
        const maxMemoryUsed = Math.max(...memoryUsages);

        return {
            totalMemoryUsed: totalMemoryUsed,
            maxMemoryUsed: maxMemoryUsed,
            averageMemoryUsed: totalMemoryUsed / this.metrics.length,
        };
    }

    reset() {
        this.metrics = [];
        this.startTimes.clear();
        this.memoryBaseline = this.getMemoryUsage();
    }
}

// Load testing for concurrent operations
export class LoadTester {
    constructor(apiModule = null) {
        this.apiModule = apiModule || new MockTravelAPIModule();
        this.monitor = new PerformanceMonitor();
    }

    async runLoadTest(testConfig) {
        console.log(`🚀 Starting Load Test: ${testConfig.name}`);
        console.log(`   Operations: ${testConfig.operations.length}`);
        console.log(`   Concurrent Users: ${testConfig.concurrentUsers || 1}`);
        console.log(`   Iterations: ${testConfig.iterations || 1}\n`);

        const results = [];

        for (let iteration = 0; iteration < (testConfig.iterations || 1); iteration++) {
            console.log(`📊 Iteration ${iteration + 1}/${testConfig.iterations || 1}`);

            // Run operations concurrently
            const promises = [];

            for (let user = 0; user < (testConfig.concurrentUsers || 1); user++) {
                const userPromises = testConfig.operations.map(async (operation, opIndex) => {
                    const operationId = `${iteration}-${user}-${opIndex}-${operation.type}`;

                    this.monitor.startTimer(operationId);

                    try {
                        let result;
                        switch (operation.type) {
                            case "searchFlights":
                                result = await this.apiModule.searchFlights(operation.params);
                                break;
                            case "searchPlaces":
                                result = await this.apiModule.searchPlaces(operation.params);
                                break;
                            case "getTransitInfo":
                                result = await this.apiModule.getTransitInfo(operation.params);
                                break;
                            default:
                                throw new Error(`Unknown operation type: ${operation.type}`);
                        }

                        const metric = this.monitor.endTimer(operationId, {
                            operation: operation.type,
                            user: user,
                            iteration: iteration,
                            resultCount: result?.length || 0,
                            success: true,
                        });

                        results.push(metric);

                        // Log if operation is slow
                        if (metric.duration > performanceBenchmarks.targets.acceptable) {
                            console.log(
                                `⚠️  Slow operation: ${operation.type} took ${Math.round(metric.duration)}ms`,
                            );
                        }

                        return {
                            success: true,
                            duration: metric.duration,
                            resultCount: result?.length || 0,
                        };
                    } catch (error) {
                        const metric = this.monitor.endTimer(operationId, {
                            operation: operation.type,
                            user: user,
                            iteration: iteration,
                            success: false,
                            error: error.message,
                        });

                        results.push(metric);
                        console.log(`❌ Operation failed: ${operation.type} - ${error.message}`);

                        return { success: false, error: error.message };
                    }
                });

                promises.push(...userPromises);
            }

            // Wait for all operations in this iteration to complete
            await Promise.all(promises);

            // Brief pause between iterations
            if (iteration < (testConfig.iterations || 1) - 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        const report = this.monitor.generateReport();
        console.log(`\n✅ Load Test Complete: ${testConfig.name}\n`);

        return {
            testConfig,
            results,
            performanceReport: report,
        };
    }

    async runStandardLoadTests() {
        const tests = [
            {
                name: "Basic Operations Test",
                iterations: 5,
                concurrentUsers: 1,
                operations: [
                    {
                        type: "searchFlights",
                        params: {
                            departure: "AUS",
                            arrival: "SFO",
                            outboundDate: "2025-02-15",
                            adults: 1,
                        },
                    },
                    {
                        type: "searchPlaces",
                        params: { query: "restaurants in San Francisco" },
                    },
                    {
                        type: "getTransitInfo",
                        params: {
                            origin: "SFO Airport",
                            destination: "Downtown San Francisco",
                        },
                    },
                ],
            },
            {
                name: "Concurrent Users Test",
                iterations: 3,
                concurrentUsers: 5,
                operations: [
                    {
                        type: "searchFlights",
                        params: {
                            departure: "LAX",
                            arrival: "JFK",
                            outboundDate: "2025-03-01",
                            adults: 2,
                        },
                    },
                ],
            },
            {
                name: "High Frequency Test",
                iterations: 10,
                concurrentUsers: 2,
                operations: [
                    {
                        type: "searchPlaces",
                        params: { query: "coffee shops" },
                    },
                ],
            },
        ];

        const allResults = [];

        for (const test of tests) {
            this.monitor.reset();
            const result = await this.runLoadTest(test);
            allResults.push(result);

            // Brief pause between test suites
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        return allResults;
    }
}

// Performance test runner
export class PerformanceTester {
    constructor() {
        this.loadTester = new LoadTester();
        this.results = [];
    }

    async runAllPerformanceTests() {
        console.log("🏃‍♂️ Starting Performance Tests...\n");
        console.log(
            `⏱️  Target: Average response time < ${performanceBenchmarks.maxResponseTime}ms (TODO.md requirement)\n`,
        );

        try {
            // Run standard load tests
            const loadTestResults = await this.loadTester.runStandardLoadTests();
            this.results = loadTestResults;

            // Generate comprehensive report
            this.generateComprehensiveReport();

            return {
                success: true,
                results: this.results,
                summary: this.generateSummary(),
            };
        } catch (error) {
            console.error("Performance tests failed:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    generateComprehensiveReport() {
        console.log("\n📈 Performance Test Results");
        console.log("============================\n");

        let totalOperations = 0;
        let totalTime = 0;
        let allDurations = [];
        let failedOperations = 0;

        this.results.forEach((testResult, index) => {
            const { testConfig, performanceReport } = testResult;

            console.log(`📊 Test ${index + 1}: ${testConfig.name}`);
            console.log(`   Operations: ${performanceReport.totalOperations}`);
            console.log(`   Average Response Time: ${performanceReport.averageResponseTime}ms`);
            console.log(`   95th Percentile: ${performanceReport.p95ResponseTime}ms`);
            console.log(`   Performance Grade: ${performanceReport.performanceGrade}`);
            console.log(
                `   Meets Requirement: ${performanceReport.meetsRequirement ? "✅ YES" : "❌ NO"}`,
            );

            if (performanceReport.memoryMetrics) {
                console.log(
                    `   Memory Usage: ${Math.round(performanceReport.memoryMetrics.averageMemoryUsed / 1024)}KB avg`,
                );
            }

            console.log("");

            // Aggregate data
            totalOperations += performanceReport.totalOperations;
            totalTime += performanceReport.averageResponseTime * performanceReport.totalOperations;

            // Collect all durations for overall percentiles
            testResult.results.forEach((result) => {
                allDurations.push(result.duration);
                if (!result.success) failedOperations++;
            });
        });

        // Overall statistics
        const overallAverage = totalOperations > 0 ? totalTime / totalOperations : 0;
        const successRate =
            totalOperations > 0
                ? ((totalOperations - failedOperations) / totalOperations) * 100
                : 0;

        // Calculate overall percentiles
        allDurations.sort((a, b) => a - b);
        const overall95th = this.calculatePercentile(allDurations, 95);
        const overall99th = this.calculatePercentile(allDurations, 99);

        console.log("🎯 Overall Performance Summary");
        console.log("==============================");
        console.log(`Total Operations: ${totalOperations}`);
        console.log(`Overall Average Response Time: ${Math.round(overallAverage)}ms`);
        console.log(`Overall 95th Percentile: ${Math.round(overall95th)}ms`);
        console.log(`Overall 99th Percentile: ${Math.round(overall99th)}ms`);
        console.log(`Success Rate: ${successRate.toFixed(1)}%`);
        console.log(
            `Meets TODO.md Requirement: ${overallAverage < performanceBenchmarks.maxResponseTime ? "✅ YES" : "❌ NO"}`,
        );

        // Performance verdict
        if (overallAverage < performanceBenchmarks.targets.fast) {
            console.log("🚀 Performance Grade: EXCELLENT");
        } else if (overallAverage < performanceBenchmarks.targets.acceptable) {
            console.log("⚡ Performance Grade: GOOD");
        } else if (overallAverage < performanceBenchmarks.targets.slow) {
            console.log("✅ Performance Grade: ACCEPTABLE");
        } else {
            console.log("⚠️  Performance Grade: NEEDS IMPROVEMENT");
        }

        console.log("\n✅ Performance Tests Complete!\n");
    }

    calculatePercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)];
    }

    generateSummary() {
        if (this.results.length === 0) {
            return {
                meetsRequirement: false,
                message: "No test results available",
            };
        }

        let totalOperations = 0;
        let totalTime = 0;
        let allDurations = [];

        this.results.forEach((testResult) => {
            const { performanceReport } = testResult;
            totalOperations += performanceReport.totalOperations;
            totalTime += performanceReport.averageResponseTime * performanceReport.totalOperations;

            testResult.results.forEach((result) => {
                allDurations.push(result.duration);
            });
        });

        const overallAverage = totalOperations > 0 ? totalTime / totalOperations : 0;
        const meetsRequirement = overallAverage < performanceBenchmarks.maxResponseTime;

        return {
            totalOperations,
            averageResponseTime: Math.round(overallAverage),
            meetsRequirement,
            performanceGrade: this.getOverallGrade(overallAverage),
            message: meetsRequirement
                ? `✅ Performance meets TODO.md requirement (${Math.round(overallAverage)}ms < ${performanceBenchmarks.maxResponseTime}ms)`
                : `❌ Performance does not meet requirement (${Math.round(overallAverage)}ms >= ${performanceBenchmarks.maxResponseTime}ms)`,
        };
    }

    getOverallGrade(avgTime) {
        if (avgTime < performanceBenchmarks.targets.fast) return "EXCELLENT";
        if (avgTime < performanceBenchmarks.targets.acceptable) return "GOOD";
        if (avgTime < performanceBenchmarks.targets.slow) return "ACCEPTABLE";
        return "POOR";
    }
}

// Export main classes and benchmarks
