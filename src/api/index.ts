import {
    TravelAPIInterface,
    FlightSearchParams,
    PlaceSearchParams,
    TransitSearchParams,
    StandardizedCard,
} from "./types.js";
import { SerpAPIClient } from "./serpapi/client.js";
import { GoogleMapsClient } from "./googlemaps/client.js";
import { AITranslator } from "./translation/aiTranslator.js";
import { TravelAPIError, getUserFriendlyMessage } from "./utils/errors.js";
import logger from "../utils/logger.js";

export class TravelAPIModule implements TravelAPIInterface {
    private serpClient?: SerpAPIClient;
    private googleMapsClient?: GoogleMapsClient;
    private translator: AITranslator;

    constructor() {
        // Initialize API clients with environment variables
        const serpApiKey = process.env.SERP_API_KEY;
        const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (serpApiKey) {
            this.serpClient = new SerpAPIClient(serpApiKey);
        }

        if (googleMapsApiKey) {
            this.googleMapsClient = new GoogleMapsClient(googleMapsApiKey);
        }

        // Initialize AI translator (with fallback to rule-based translation)
        this.translator = new AITranslator(openaiApiKey);
    }

    async searchFlights(params: FlightSearchParams): Promise<StandardizedCard[]> {
        if (!this.serpClient) {
            throw new TravelAPIError(
                "INVALID_PARAMS",
                "SerpAPI key not configured. Flight search is unavailable.",
                "SerpAPI",
            );
        }

        try {
            logger.info("Searching flights with params:", params);

            const serpResponse = await this.serpClient.searchFlights(params);
            const standardizedCards = await this.translator.translateSerpFlights(serpResponse);

            logger.info(`Found ${standardizedCards.length} flight options`);
            return standardizedCards;
        } catch (error) {
            if (error instanceof TravelAPIError) {
                throw error;
            }
            throw new TravelAPIError(
                "UNKNOWN",
                `Flight search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                "SerpAPI",
            );
        }
    }

    async searchPlaces(params: PlaceSearchParams): Promise<StandardizedCard[]> {
        if (!this.googleMapsClient) {
            throw new TravelAPIError(
                "INVALID_PARAMS",
                "Google Maps API key not configured. Place search is unavailable.",
                "Google Places API",
            );
        }

        try {
            logger.info("Searching places with params:", params);

            const placesResponse = await this.googleMapsClient.searchPlaces(params);
            const standardizedCards = await this.translator.translateGooglePlaces(
                placesResponse,
                process.env.GOOGLE_MAPS_API_KEY!,
            );

            logger.info(`Found ${standardizedCards.length} place options`);
            return standardizedCards;
        } catch (error) {
            if (error instanceof TravelAPIError) {
                throw error;
            }
            throw new TravelAPIError(
                "UNKNOWN",
                `Place search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                "Google Places API",
            );
        }
    }

    async getTransitInfo(params: TransitSearchParams): Promise<StandardizedCard[]> {
        if (!this.googleMapsClient) {
            throw new TravelAPIError(
                "INVALID_PARAMS",
                "Google Maps API key not configured. Transit directions are unavailable.",
                "Google Directions API",
            );
        }

        try {
            logger.info("Getting transit directions with params:", params);

            const directionsResponse = await this.googleMapsClient.getDirections(params);
            const standardizedCards =
                await this.translator.translateGoogleDirections(directionsResponse);

            logger.info(`Found ${standardizedCards.length} transit options`);
            return standardizedCards;
        } catch (error) {
            if (error instanceof TravelAPIError) {
                throw error;
            }
            throw new TravelAPIError(
                "UNKNOWN",
                `Transit search failed: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
                "Google Directions API",
            );
        }
    }

    // Health check methods
    async validateConfiguration(): Promise<{
        serpAPI: boolean;
        googleMaps: boolean;
        openAI: boolean;
    }> {
        const results = {
            serpAPI: false,
            googleMaps: false,
            openAI: !!process.env.OPENAI_API_KEY,
        };

        try {
            if (this.serpClient) {
                results.serpAPI = await this.serpClient.validateApiKey();
            }
        } catch (error) {
            logger.warn("SerpAPI validation failed:", error);
        }

        try {
            if (this.googleMapsClient) {
                results.googleMaps = await this.googleMapsClient.validateApiKey();
            }
        } catch (error) {
            logger.warn("Google Maps API validation failed:", error);
        }

        return results;
    }

    // Get user-friendly error message
    getErrorMessage(error: unknown): string {
        if (error instanceof TravelAPIError) {
            return getUserFriendlyMessage(error);
        }
        return "An unexpected error occurred. Please try again.";
    }

    // Get available services
    getAvailableServices(): {
        flights: boolean;
        places: boolean;
        transit: boolean;
    } {
        return {
            flights: !!this.serpClient,
            places: !!this.googleMapsClient,
            transit: !!this.googleMapsClient,
        };
    }
}

// Create and export a singleton instance
export const travelAPI = new TravelAPIModule();

// Export types and error classes for use in operations
export type {
    TravelAPIInterface,
    FlightSearchParams,
    PlaceSearchParams,
    TransitSearchParams,
    StandardizedCard,
} from "./types.js";

export { TravelAPIError, getUserFriendlyMessage } from "./utils/errors.js";
