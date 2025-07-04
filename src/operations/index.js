/**
 * Conditional Operation Export System
 * Exports operations based on environment configuration
 */

import { shouldIncludeTestingOperations, getEnvironment } from "../config/environment.js";

// Core operations - always available
import * as travelOps from "./travel.js";
import * as conversationOps from "./conversation.js";
import * as itineraryOps from "./itinerary.js";

// Testing operations - conditionally available
let testingOps = {};

try {
    if (shouldIncludeTestingOperations()) {
        // Dynamically import testing operations only in development
        const testingModule = await import("./testing.js");
        testingOps = testingModule;
        console.log(`[OPERATIONS] Testing operations loaded for ${getEnvironment()} environment`);
    } else {
        console.log(`[OPERATIONS] Testing operations excluded for ${getEnvironment()} environment`);
    }
} catch (error) {
    console.warn("[OPERATIONS] Failed to load testing operations:", error.message);
    // Continue without testing operations
}

/**
 * Get all available operations for current environment
 * @returns {object} Object containing available operations
 */
export function getAvailableOperations() {
    const operations = {
        // Core operations (always available)
        ...travelOps,
        ...conversationOps,
        ...itineraryOps,
    };

    // Add testing operations if available
    if (shouldIncludeTestingOperations() && Object.keys(testingOps).length > 0) {
        Object.assign(operations, testingOps);
    }

    return operations;
}

/**
 * Get operation metadata
 * @returns {object} Metadata about available operations
 */
export function getOperationMetadata() {
    const coreOperationCount = Object.keys({
        ...travelOps,
        ...conversationOps,
        ...itineraryOps,
    }).length;

    const testingOperationCount = shouldIncludeTestingOperations()
        ? Object.keys(testingOps).length
        : 0;

    return {
        environment: getEnvironment(),
        coreOperations: coreOperationCount,
        testingOperations: testingOperationCount,
        totalOperations: coreOperationCount + testingOperationCount,
        testingEnabled: shouldIncludeTestingOperations(),
    };
}

// Export core operations directly for compatibility
export * from "./travel.js";
export * from "./conversation.js";
export * from "./itinerary.js";

// Note: Testing operations are conditionally available via runtime checks in testing.js
// They are still exported but will throw 403 errors in production environment
