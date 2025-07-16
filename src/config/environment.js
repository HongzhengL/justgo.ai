/**
 * Environment Configuration Module
 * Provides environment detection and feature flags for conditional compilation
 */

/**
 * Get current environment
 * @returns {string} Current environment (development, production, test)
 */
export function getEnvironment() {
    try {
        return process.env.NODE_ENV || "production";
    } catch (error) {
        // Fallback without logging to avoid circular dependency
        return "production";
    }
}

/**
 * Check if running in development mode
 * @returns {boolean} True if in development environment
 */
export function isDevelopment() {
    return getEnvironment() === "development";
}

/**
 * Check if running in production mode
 * @returns {boolean} True if in production environment
 */
export function isProduction() {
    return getEnvironment() === "production";
}

/**
 * Check if testing operations should be included
 * @returns {boolean} True if testing operations should be available
 */
export function shouldIncludeTestingOperations() {
    const env = getEnvironment();

    // Include testing operations in development and test environments
    if (env === "development" || env === "test") {
        return true;
    }

    // Allow override via environment variable
    if (process.env.INCLUDE_TESTING_OPS === "true") {
        return true;
    }

    // Default to false for production
    return false;
}

/**
 * Get feature flags based on environment
 * @returns {object} Object containing feature flags
 */
export function getFeatureFlags() {
    return {
        testingOperations: shouldIncludeTestingOperations(),
        extendedLogging: isDevelopment(),
        performanceMonitoring: isProduction(),
        errorReporting: isProduction(),
    };
}

/**
 * Get environment configuration summary
 * @returns {object} Environment configuration details
 */
export function getEnvironmentConfig() {
    const env = getEnvironment();
    const flags = getFeatureFlags();

    return {
        environment: env,
        isDevelopment: isDevelopment(),
        isProduction: isProduction(),
        featureFlags: flags,
        timestamp: new Date().toISOString(),
    };
}
