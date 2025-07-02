import { APIError } from "../types.js";

// Custom error class for travel API errors
export class TravelAPIError extends Error {
    public readonly type: APIError["type"];
    public readonly provider?: string;
    public readonly statusCode?: number;

    constructor(type: APIError["type"], message: string, provider?: string, statusCode?: number) {
        super(message);
        this.name = "TravelAPIError";
        this.type = type;
        this.provider = provider;
        this.statusCode = statusCode;
    }
}

// Rate limit error
export class RateLimitError extends TravelAPIError {
    constructor(provider: string, retryAfter?: number) {
        super(
            "RATE_LIMIT",
            `Rate limit exceeded for ${provider}. ${retryAfter ? `Try again in ${retryAfter} seconds.` : "Please try again later."}`,
            provider,
            429,
        );
    }
}

// API service down error
export class APIDownError extends TravelAPIError {
    constructor(provider: string) {
        super(
            "API_DOWN",
            `${provider} service is currently unavailable. Please try again later.`,
            provider,
            503,
        );
    }
}

// Invalid parameters error
export class InvalidParamsError extends TravelAPIError {
    constructor(message: string, provider?: string) {
        super("INVALID_PARAMS", message, provider, 400);
    }
}

// Network error
export class NetworkError extends TravelAPIError {
    constructor(provider: string, originalError?: Error) {
        super(
            "NETWORK_ERROR",
            `Network error connecting to ${provider}: ${originalError?.message || "Unknown network error"}`,
            provider,
        );
    }
}

// Error handler utility function
export function handleAPIError(error: any, provider: string): TravelAPIError {
    if (error instanceof TravelAPIError) {
        return error;
    }

    // Handle common HTTP status codes
    if (error.response?.status) {
        const status = error.response.status;
        switch (status) {
            case 429:
                return new RateLimitError(provider, error.response.headers?.["retry-after"]);
            case 503:
            case 502:
            case 504:
                return new APIDownError(provider);
            case 400:
            case 422:
                return new InvalidParamsError(
                    error.response.data?.message || "Invalid request parameters",
                    provider,
                );
            default:
                return new TravelAPIError(
                    "UNKNOWN",
                    `HTTP ${status}: ${error.response.data?.message || error.message}`,
                    provider,
                    status,
                );
        }
    }

    // Handle network errors
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
        return new NetworkError(provider, error);
    }

    // Default unknown error
    return new TravelAPIError("UNKNOWN", error.message || "Unknown error occurred", provider);
}

// User-friendly error messages for frontend
export function getUserFriendlyMessage(error: TravelAPIError): string {
    switch (error.type) {
        case "RATE_LIMIT":
            return "High demand detected. Please try again in a moment.";
        case "API_DOWN":
            return `${error.provider || "Service"} is temporarily unavailable. Please try again later.`;
        case "INVALID_PARAMS":
            return "Please check your search parameters and try again.";
        case "NETWORK_ERROR":
            return "Connection error. Please check your internet connection and try again.";
        default:
            return "An unexpected error occurred. Please try again.";
    }
}

// Retry logic utility
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000,
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            // Don't retry on certain error types
            if (error instanceof TravelAPIError) {
                if (
                    error.type === "INVALID_PARAMS" ||
                    error.statusCode === 401 ||
                    error.statusCode === 403
                ) {
                    throw error;
                }
            }

            if (attempt === maxRetries) {
                break;
            }

            // Exponential backoff
            const delay = backoffMs * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}
