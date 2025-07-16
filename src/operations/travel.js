import { HttpError } from "wasp/server";
import { travelAPI } from "../api/index.js";
import logger from "../utils/logger.js";

// Search for flights
export const searchFlights = async (params, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to search flights");
    }

    try {
        logger.info("Flight search request from user:", context.user.id, "with params:", params);

        // Validate required parameters
        if (!params.departure || !params.arrival || !params.outboundDate || !params.adults) {
            throw new HttpError(
                400,
                "Missing required parameters: departure, arrival, outboundDate, adults",
            );
        }

        const flightResults = await travelAPI.searchFlights({
            departure: params.departure,
            arrival: params.arrival,
            outboundDate: params.outboundDate,
            returnDate: params.returnDate,
            adults: params.adults,
            children: params.children || 0,
            travelClass: params.travelClass || "economy",
            currency: params.currency || "USD",
        });

        logger.info(`Found ${flightResults.length} flight options for user ${context.user.id}`);
        return flightResults;
    } catch (error) {
        logger.error("Flight search error:", error);

        if (error instanceof HttpError) {
            throw error;
        }

        // Convert API errors to user-friendly messages
        const message = travelAPI.getErrorMessage(error);
        throw new HttpError(500, message);
    }
};

// Search for places
export const searchPlaces = async (params, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to search places");
    }

    try {
        logger.info("Place search request from user:", context.user.id, "with params:", params);

        // Validate required parameters
        if (!params.query) {
            throw new HttpError(400, "Missing required parameter: query");
        }

        const placeResults = await travelAPI.searchPlaces({
            query: params.query,
            location: params.location,
            radius: params.radius,
            type: params.type,
        });

        logger.info(`Found ${placeResults.length} place options for user ${context.user.id}`);
        return placeResults;
    } catch (error) {
        logger.error("Place search error:", error);

        if (error instanceof HttpError) {
            throw error;
        }

        // Convert API errors to user-friendly messages
        const message = travelAPI.getErrorMessage(error);
        throw new HttpError(500, message);
    }
};

// Get transit information/directions
export const getTransitInfo = async (params, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in to get transit info");
    }

    try {
        logger.info("Transit info request from user:", context.user.id, "with params:", params);

        // Validate required parameters
        if (!params.origin || !params.destination) {
            throw new HttpError(400, "Missing required parameters: origin, destination");
        }

        const transitResults = await travelAPI.getTransitInfo({
            origin: params.origin,
            destination: params.destination,
            mode: params.mode || "driving",
            departureTime: params.departureTime,
        });

        logger.info(`Found ${transitResults.length} transit options for user ${context.user.id}`);
        return transitResults;
    } catch (error) {
        logger.error("Transit info error:", error);

        if (error instanceof HttpError) {
            throw error;
        }

        // Convert API errors to user-friendly messages
        const message = travelAPI.getErrorMessage(error);
        throw new HttpError(500, message);
    }
};

// Health check for API services
export const checkApiHealth = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        const health = await travelAPI.validateConfiguration();
        const services = travelAPI.getAvailableServices();

        return {
            timestamp: new Date().toISOString(),
            status: "healthy",
            services: services,
            apiHealth: health,
        };
    } catch (error) {
        logger.error("API health check error:", error);
        throw new HttpError(500, "Health check failed");
    }
};
