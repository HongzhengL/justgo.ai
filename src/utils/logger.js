/**
 * Logger Configuration Module
 * Environment-aware Pino logger setup with development and production configurations
 */

import pino from "pino";
import { isDevelopment, isProduction } from "../config/environment.js";

/**
 * Get logger configuration based on environment
 * @param {string} env - Environment name (development, production, test)
 * @returns {Object} Pino configuration object
 */
function getLoggerConfig(env) {
    if (env === "development") {
        return {
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: "SYS:standard",
                    ignore: "pid,hostname",
                },
            },
            level: "debug",
        };
    }

    if (env === "production") {
        return {
            level: "info",
            timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
            formatters: {
                level: (label) => {
                    return { level: label };
                },
            },
        };
    }

    // Default/test configuration
    return {
        level: "info",
    };
}

/**
 * Create and configure Pino logger instance
 * @returns {Object} Configured Pino logger instance
 */
function createLogger() {
    try {
        const env = isDevelopment() ? "development" : isProduction() ? "production" : "default";
        const config = getLoggerConfig(env);
        return pino(config);
    } catch (error) {
        // Fallback to console if Pino initialization fails
        console.warn("Logger initialization failed, falling back to console");
        return {
            debug: console.debug.bind(console),
            info: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
        };
    }
}

// Create and export singleton logger instance
const logger = createLogger();

export default logger;
