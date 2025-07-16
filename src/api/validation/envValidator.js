// Environment Variable Validation for AI Travel Planner
// Validates all required environment variables for the travel API module

import logger from "../../utils/logger.js";

// Required environment variables for different components
export const requiredEnvVars = {
    // Core API keys
    apis: {
        SERP_API_KEY: {
            required: false, // Optional - enables flight search
            description: "SerpAPI key for Google Flights integration",
            example: "your_serp_api_key_here",
            validation: /^[a-zA-Z0-9_-]{20,}$/,
            service: "SerpAPI",
            features: ["Flight search", "Flight booking integration"],
        },
        GOOGLE_MAPS_API_KEY: {
            required: false, // Optional - enables places and transit
            description: "Google Maps API key for Places and Directions",
            example: "AIza...",
            validation: /^AIza[a-zA-Z0-9_-]{35,}$/,
            service: "Google Maps",
            features: ["Place search", "Transit directions", "Geocoding"],
        },
        OPENAI_API_KEY: {
            required: false, // Optional - enables AI translation
            description: "OpenAI API key for intelligent data translation",
            example: "sk-...",
            validation: /^sk-[a-zA-Z0-9]{48,}$/,
            service: "OpenAI",
            features: ["AI-powered data translation", "Enhanced result formatting"],
        },
    },

    // Database configuration (handled by Wasp)
    database: {
        DATABASE_URL: {
            required: true,
            description: "PostgreSQL database connection string",
            example: "postgresql://user:password@localhost:5432/travel_planner",
            validation: /^postgresql:\/\/.+/,
            service: "PostgreSQL",
            features: ["User data", "Itinerary storage", "Session management"],
        },
    },

    // Authentication (handled by Wasp)
    auth: {
        JWT_SECRET: {
            required: true,
            description: "JWT signing secret for authentication",
            example: "your-super-secret-jwt-key",
            validation: /^.{32,}$/, // At least 32 characters
            service: "Wasp Auth",
            features: ["User authentication", "Session management"],
        },
    },
};

// Environment validation results structure
export class EnvValidationResult {
    constructor() {
        this.isValid = true;
        this.errors = [];
        this.warnings = [];
        this.summary = {
            total: 0,
            valid: 0,
            missing: 0,
            invalid: 0,
            optional: 0,
        };
        this.services = {};
        this.features = [];
    }

    addError(varName, message) {
        this.isValid = false;
        this.errors.push({ variable: varName, message });
        this.summary.invalid++;
    }

    addWarning(varName, message) {
        this.warnings.push({ variable: varName, message });
    }

    addMissing(varName, isRequired) {
        if (isRequired) {
            this.isValid = false;
            this.summary.missing++;
        } else {
            this.summary.optional++;
        }
    }

    addValid() {
        this.summary.valid++;
    }

    incrementTotal() {
        this.summary.total++;
    }
}

// Main environment validator
export class EnvironmentValidator {
    constructor() {
        this.result = new EnvValidationResult();
    }

    validateAll() {
        logger.info("🔍 Validating Environment Configuration...\n");

        // Validate each category
        this.validateCategory("APIs", requiredEnvVars.apis);
        this.validateCategory("Database", requiredEnvVars.database);
        this.validateCategory("Authentication", requiredEnvVars.auth);

        // Generate service availability summary
        this.generateServiceSummary();

        // Log results
        this.logResults();

        return this.result;
    }

    validateCategory(categoryName, variables) {
        logger.info(`📋 ${categoryName} Configuration:`);

        for (const [varName, config] of Object.entries(variables)) {
            this.result.incrementTotal();

            const value = process.env[varName];

            if (!value) {
                this.handleMissingVariable(varName, config);
            } else {
                this.validateVariable(varName, value, config);
            }
        }

        logger.info(""); // Empty line between categories
    }

    handleMissingVariable(varName, config) {
        if (config.required) {
            this.result.addError(varName, `Required environment variable is missing`);
            logger.info(`❌ ${varName}: MISSING (Required)`);
            logger.info(`   Description: ${config.description}`);
            logger.info(`   Example: ${config.example}`);
        } else {
            this.result.addMissing(varName, false);
            logger.info(`⚠️  ${varName}: Not set (Optional)`);
            logger.info(`   Service: ${config.service} will be unavailable`);
            logger.info(`   Features disabled: ${config.features.join(", ")}`);
        }

        this.result.services[config.service] = {
            available: false,
            reason: "API key not configured",
            features: config.features,
        };
    }

    validateVariable(varName, value, config) {
        // Check format validation
        if (config.validation && !config.validation.test(value)) {
            this.result.addError(varName, `Invalid format for ${config.service}`);
            logger.info(`❌ ${varName}: INVALID FORMAT`);
            logger.info(`   Expected pattern: ${config.validation.toString()}`);
            logger.info(`   Example: ${config.example}`);

            this.result.services[config.service] = {
                available: false,
                reason: "Invalid API key format",
                features: config.features,
            };
            return;
        }

        // Variable is valid
        this.result.addValid(varName);
        logger.info(`✅ ${varName}: Valid`);
        logger.info(`   Service: ${config.service} available`);

        this.result.services[config.service] = {
            available: true,
            features: config.features,
        };

        // Add features to available features list
        this.result.features.push(...config.features);
    }

    generateServiceSummary() {
        logger.info("📊 Service Availability Summary:");
        logger.info("================================");

        for (const [serviceName, serviceInfo] of Object.entries(this.result.services)) {
            const status = serviceInfo.available ? "✅ Available" : "❌ Unavailable";
            const reason = serviceInfo.reason ? ` (${serviceInfo.reason})` : "";

            logger.info(`${serviceName}: ${status}${reason}`);

            if (serviceInfo.available) {
                logger.info(`   Features: ${serviceInfo.features.join(", ")}`);
            }
        }

        logger.info("");
    }

    logResults() {
        logger.info("🎯 Validation Summary:");
        logger.info("======================");
        logger.info(`Total Variables: ${this.result.summary.total}`);
        logger.info(`Valid: ${this.result.summary.valid}`);
        logger.info(`Missing Required: ${this.result.summary.missing}`);
        logger.info(`Invalid Format: ${this.result.summary.invalid}`);
        logger.info(`Optional Not Set: ${this.result.summary.optional}`);

        const configurationHealth = this.result.isValid ? "HEALTHY" : "NEEDS ATTENTION";
        logger.info(`Configuration Health: ${configurationHealth}`);

        if (this.result.errors.length > 0) {
            logger.info("\n❌ Configuration Errors:");
            this.result.errors.forEach((error) => {
                logger.info(`   ${error.variable}: ${error.message}`);
            });
        }

        if (this.result.warnings.length > 0) {
            logger.info("\n⚠️  Configuration Warnings:");
            this.result.warnings.forEach((warning) => {
                logger.info(`   ${warning.variable}: ${warning.message}`);
            });
        }

        logger.info("\n✅ Environment Validation Complete!\n");
    }
}

// Quick validation function
export function validateEnvironment() {
    const validator = new EnvironmentValidator();
    return validator.validateAll();
}

// Generate example .env files
export function generateEnvExamples() {
    const serverEnvExample = `# .env.server - Server-side environment variables
# DO NOT commit this file to version control

# Database Configuration (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/travel_planner"

# Authentication (Required - generated by Wasp)
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"

# API Keys (Optional - enables specific features)

# SerpAPI - Enables flight search functionality
# Get your key at: https://serpapi.com/
SERP_API_KEY="your_serp_api_key_here"

# Google Maps API - Enables places and transit search
# Get your key at: https://console.cloud.google.com/
GOOGLE_MAPS_API_KEY="AIzaSyYourGoogleMapsAPIKeyHere"

# OpenAI API - Enables AI-powered data translation
# Get your key at: https://platform.openai.com/
OPENAI_API_KEY="sk-YourOpenAIAPIKeyHere"

# Email Configuration (Optional - for production email sending)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@yourdomain.com"
`;

    const clientEnvExample = `# .env.client - Client-side environment variables
# These variables are PUBLIC and will be visible in the browser

# Application Configuration
REACT_APP_NAME="AI Travel Planner"

# Google Maps API Key (for client-side maps - if needed)
# Note: Use a separate, restricted key for client-side usage
REACT_APP_GOOGLE_MAPS_API_KEY="AIzaSyYourClientSideGoogleMapsKey"
`;

    return {
        server: serverEnvExample,
        client: clientEnvExample,
    };
}

// Health check for startup validation
export function performStartupValidation() {
    logger.info("🚀 Performing Startup Environment Validation...\n");

    const result = validateEnvironment();

    if (!result.isValid) {
        logger.error("💥 STARTUP FAILED: Environment configuration errors detected!");
        logger.error(
            "Please fix the configuration errors above before starting the application.\n",
        );

        // In production, you might want to:
        // process.exit(1);

        return false;
    }

    logger.info("🎉 Startup validation passed! Application ready to start.\n");
    return true;
}

// Configuration health check for monitoring
export function getConfigurationHealth() {
    const result = validateEnvironment();

    return {
        healthy: result.isValid,
        availableServices: Object.keys(result.services).filter(
            (service) => result.services[service].available,
        ),
        unavailableServices: Object.keys(result.services).filter(
            (service) => !result.services[service].available,
        ),
        enabledFeatures: [...new Set(result.features)], // Remove duplicates
        errors: result.errors,
        warnings: result.warnings,
        summary: result.summary,
    };
}

// Main functions already exported at their definitions above
