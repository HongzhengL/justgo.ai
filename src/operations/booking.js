import { HttpError } from "wasp/server";
import { travelAPI } from "../api/index.js";
import { getCachedBookingOptions, setCachedBookingOptions } from "../api/cache/bookingCache.js";
import logger from "../utils/logger.js";

export const fetchFlightBookingOptions = async (args, context) => {
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to fetch booking options");
    }

    logger.info("=== BOOKING OPTIONS REQUEST DEBUG ===");
    logger.info("Booking token exists:", !!args.bookingToken);
    logger.info("Booking token length:", args.bookingToken ? args.bookingToken.length : 0);
    logger.info("Search context:", JSON.stringify(args.searchContext, null, 2));
    logger.info("Is return flight:", args.searchContext?.isReturnFlight);

    // Handle missing or invalid booking tokens by returning fallback immediately
    if (!args.bookingToken || args.bookingToken === "INVALID_TOKEN_FALLBACK") {
        logger.info("Invalid or missing booking token, returning fallback URL");

        // Create a fallback URL with flight details from search context
        const searchParams = new URLSearchParams();
        if (args.searchContext.departure) searchParams.append("f", args.searchContext.departure);
        if (args.searchContext.arrival) searchParams.append("t", args.searchContext.arrival);
        if (args.searchContext.outboundDate)
            searchParams.append("d", args.searchContext.outboundDate);
        if (args.searchContext.returnDate) searchParams.append("r", args.searchContext.returnDate);

        const fallbackUrl = `https://www.google.com/flights#search;${searchParams.toString()}`;

        return {
            bookingOptions: [],
            selectedFlights: [],
            baggagePrices: {},
            success: false,
            fallbackUrl: fallbackUrl,
            error: "No booking options available - this flight search result doesn't have a valid booking token from the airline search provider.",
            debugInfo: {
                tokenLength: args.bookingToken ? args.bookingToken.length : 0,
                tokenPreview: args.bookingToken || "null",
                reason: "Missing or invalid booking token",
            },
        };
    }

    // Validate searchContext exists
    if (!args.searchContext) {
        throw new HttpError(400, "Search context is required");
    }

    logger.info(`Fetching booking options for token: ${args.bookingToken.slice(-8)}`);
    logger.info(`Full booking token (first 100 chars): ${args.bookingToken.substring(0, 100)}...`);
    logger.info(`Token length: ${args.bookingToken.length}`);

    // Check cache first
    const cached = getCachedBookingOptions(args.bookingToken);
    if (cached) {
        logger.info("Returning cached booking options");
        return cached;
    }

    try {
        // Fetch booking options using the new TravelAPIModule method
        const bookingCards = await travelAPI.getBookingOptions(
            args.bookingToken,
            args.searchContext,
        );

        // Process response to match expected format
        const processedData = {
            bookingOptions: bookingCards,
            success: true,
        };

        // Cache the processed data
        setCachedBookingOptions(args.bookingToken, processedData);

        logger.info(`Successfully fetched ${bookingCards.length} booking options`);
        return processedData;
    } catch (error) {
        logger.error("Error fetching booking options:", error);

        // Enhanced error logging to diagnose the issue
        if (error.response) {
            logger.error("SerpAPI Response Status:", error.response.status);
            logger.error("SerpAPI Response Data:", JSON.stringify(error.response.data, null, 2));
        }

        // Create a more informative fallback URL with flight details from search context
        const searchParams = new URLSearchParams();
        if (args.searchContext.departure) searchParams.append("f", args.searchContext.departure);
        if (args.searchContext.arrival) searchParams.append("t", args.searchContext.arrival);
        if (args.searchContext.outboundDate)
            searchParams.append("d", args.searchContext.outboundDate);
        if (args.searchContext.returnDate) searchParams.append("r", args.searchContext.returnDate);

        const fallbackUrl = `https://www.google.com/flights#search;${searchParams.toString()}`;

        return {
            bookingOptions: [],
            selectedFlights: [],
            baggagePrices: {},
            success: false,
            fallbackUrl: fallbackUrl,
            error: error.message || "Failed to fetch booking options",
            debugInfo: {
                tokenLength: args.bookingToken ? args.bookingToken.length : 0,
                tokenPreview: args.bookingToken
                    ? args.bookingToken.substring(0, 50) + "..."
                    : "null",
            },
        };
    }
};

export const bookFlight = async (args, context) => {
    // Check if user is authenticated
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to book flights");
    }

    logger.info("Processing flight booking request:", {
        bookingToken: args.bookingToken ? `${args.bookingToken.slice(0, 20)}...` : "none",
        method: args.bookingMethod || "unknown",
    });

    try {
        // For now, we just return success and let the frontend handle the redirect
        // In a real implementation, this would process the actual booking

        return {
            success: true,
            message: "Booking initiated successfully",
            bookingToken: args.bookingToken,
            method: args.bookingMethod,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        logger.error("Error processing flight booking:", error);
        throw new HttpError(500, "Failed to process flight booking: " + error.message);
    }
};
