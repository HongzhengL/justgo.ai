import {
    TravelAPIInterface,
    FlightSearchParams,
    FlightSearchContext,
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
    private _serpClient?: SerpAPIClient;
    private googleMapsClient?: GoogleMapsClient;
    private translator: AITranslator;

    constructor() {
        // Initialize API clients with environment variables
        const serpApiKey = process.env.SERP_API_KEY;
        const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (serpApiKey) {
            this._serpClient = new SerpAPIClient(serpApiKey);
        }

        if (googleMapsApiKey) {
            this.googleMapsClient = new GoogleMapsClient(googleMapsApiKey);
        }

        // Initialize AI translator (with fallback to rule-based translation)
        this.translator = new AITranslator(openaiApiKey);
    }

    // Getter for serpClient to allow external access for booking operations
    get serpClient() {
        return this._serpClient;
    }

    async searchFlights(params: FlightSearchParams): Promise<StandardizedCard[]> {
        if (!this._serpClient) {
            throw new TravelAPIError(
                "INVALID_PARAMS",
                "SerpAPI key not configured. Flight search is unavailable.",
                "SerpAPI",
            );
        }

        try {
            logger.info("Searching flights with params:", params);

            const serpResponse = await this._serpClient.searchFlights(params);
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

    async getBookingOptions(
        bookingToken: string,
        context: FlightSearchContext,
    ): Promise<StandardizedCard[]> {
        if (!this._serpClient) {
            throw new TravelAPIError(
                "INVALID_PARAMS",
                "SerpAPI key not configured. Booking options are unavailable.",
                "SerpAPI",
            );
        }

        try {
            logger.info("Getting booking options with token:", bookingToken);
            logger.info("Using search context:", context);

            const bookingResponse = await this._serpClient.getBookingOptions(bookingToken, context);

            // Convert booking options to StandardizedCard format
            const bookingCards: StandardizedCard[] = [];

            if (bookingResponse.booking_options) {
                bookingResponse.booking_options.forEach((option, index) => {
                    if (option.together) {
                        const bookingOption = option.together;
                        bookingCards.push({
                            id: `booking-${index}-together`,
                            type: "flight",
                            title: `Book with ${bookingOption.book_with}`,
                            subtitle: bookingOption.option_title || "Flight Booking",
                            price: {
                                amount: bookingOption.price,
                                currency: "USD",
                            },
                            location: {
                                from: { code: context.departure },
                                to: { code: context.arrival },
                            },
                            details: {
                                bookingRequest: bookingOption.booking_request,
                                airlines: bookingOption.airline_logos,
                                extensions: bookingOption.extensions || [],
                                baggagePrices: bookingOption.baggage_prices || [],
                                phone: bookingOption.booking_phone,
                                estimatedFee: bookingOption.estimated_phone_service_fee,
                            },
                            essentialDetails: {
                                price: `$${bookingOption.price}`,
                                airline: bookingOption.book_with,
                                flightNumbers: bookingOption.marketed_as?.join(", ") || "",
                            },
                            externalLinks: {
                                booking: bookingOption.booking_request.url,
                            },
                            metadata: {
                                provider: "SerpAPI",
                                confidence: 0.9,
                                timestamp: new Date().toISOString(),
                                bookingToken,
                            },
                        });
                    }

                    // Handle separate tickets if needed
                    if (option.separate_tickets && option.departing) {
                        const departingOption = option.departing;
                        bookingCards.push({
                            id: `booking-${index}-departing`,
                            type: "flight",
                            title: `Departing with ${departingOption.book_with}`,
                            subtitle: "Departing Flight Booking",
                            price: {
                                amount: departingOption.price,
                                currency: "USD",
                            },
                            location: {
                                from: { code: context.departure },
                                to: { code: context.arrival },
                            },
                            details: {
                                bookingRequest: departingOption.booking_request,
                                airlines: departingOption.airline_logos,
                                extensions: departingOption.extensions || [],
                                baggagePrices: departingOption.baggage_prices || [],
                            },
                            essentialDetails: {
                                price: `$${departingOption.price}`,
                                airline: departingOption.book_with,
                                flightNumbers: departingOption.marketed_as?.join(", ") || "",
                            },
                            externalLinks: {
                                booking: departingOption.booking_request.url,
                            },
                            metadata: {
                                provider: "SerpAPI",
                                confidence: 0.9,
                                timestamp: new Date().toISOString(),
                                bookingToken,
                            },
                        });
                    }

                    if (option.separate_tickets && option.returning) {
                        const returningOption = option.returning;
                        bookingCards.push({
                            id: `booking-${index}-returning`,
                            type: "flight",
                            title: `Returning with ${returningOption.book_with}`,
                            subtitle: "Returning Flight Booking",
                            price: {
                                amount: returningOption.price,
                                currency: "USD",
                            },
                            location: {
                                from: { code: context.arrival },
                                to: { code: context.departure },
                            },
                            details: {
                                bookingRequest: returningOption.booking_request,
                                airlines: returningOption.airline_logos,
                                extensions: returningOption.extensions || [],
                                baggagePrices: returningOption.baggage_prices || [],
                            },
                            essentialDetails: {
                                price: `$${returningOption.price}`,
                                airline: returningOption.book_with,
                                flightNumbers: returningOption.marketed_as?.join(", ") || "",
                            },
                            externalLinks: {
                                booking: returningOption.booking_request.url,
                            },
                            metadata: {
                                provider: "SerpAPI",
                                confidence: 0.9,
                                timestamp: new Date().toISOString(),
                                bookingToken,
                            },
                        });
                    }
                });
            }

            logger.info(`Found ${bookingCards.length} booking options`);
            return bookingCards;
        } catch (error) {
            if (error instanceof TravelAPIError) {
                throw error;
            }
            throw new TravelAPIError(
                "UNKNOWN",
                `Booking options failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                "SerpAPI",
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
            if (this._serpClient) {
                results.serpAPI = await this._serpClient.validateApiKey();
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
            flights: !!this._serpClient,
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
