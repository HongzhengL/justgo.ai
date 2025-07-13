import axios from "axios";
import {
    FlightSearchParams,
    SerpFlightResponse,
    SerpFlightData,
    SerpFlightSegment,
} from "../types.js";
import { handleAPIError, withRetry } from "../utils/errors.js";
import logger from "../../utils/logger.js";

export class SerpAPIClient {
    private readonly apiKey: string;
    private readonly baseURL = "https://serpapi.com/search";
    private readonly timeout = 10000; // 10 seconds

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async searchFlights(params: FlightSearchParams): Promise<SerpFlightResponse> {
        const serpParams = this.buildSerpParams(params);

        logger.info("SerpAPI Client - Input params:", JSON.stringify(params, null, 2));
        logger.info("SerpAPI Client - Built serp params:", JSON.stringify(serpParams, null, 2));
        logger.info(
            "SerpAPI Client - Full URL would be:",
            `${this.baseURL}?${new URLSearchParams(serpParams).toString()}`,
        );

        try {
            return await withRetry(async () => {
                const response = await axios.get(this.baseURL, {
                    params: serpParams,
                    timeout: this.timeout,
                });

                logger.info("SerpAPI Response status:", response.status);
                logger.info("SerpAPI Response data:", JSON.stringify(response.data, null, 2));

                if (response.data.error) {
                    logger.error("SerpAPI returned error:", response.data.error);
                    throw new Error(response.data.error);
                }

                return response.data as SerpFlightResponse;
            });
        } catch (error: unknown) {
            const errorDetails = {
                message: error instanceof Error ? error.message : String(error),
                status: undefined as number | undefined,
                statusText: undefined as string | undefined,
                data: undefined as unknown,
            };

            if (error && typeof error === "object" && "response" in error) {
                const axiosError = error as {
                    response?: { status?: number; statusText?: string; data?: unknown };
                };
                errorDetails.status = axiosError.response?.status;
                errorDetails.statusText = axiosError.response?.statusText;
                errorDetails.data = axiosError.response?.data;
            }

            logger.error("SerpAPI Client error details:", errorDetails);
            throw handleAPIError(error, "SerpAPI");
        }
    }

    private buildSerpParams(params: FlightSearchParams): Record<string, string> {
        const serpParams: Record<string, string> = {
            api_key: this.apiKey,
            engine: "google_flights",
            departure_id: params.departure,
            arrival_id: params.arrival,
            outbound_date: params.outboundDate,
            currency: params.currency || "USD",
            adults: params.adults.toString(),
            gl: params.gl || "us", // Google country interface (required)
            hl: params.hl || "en", // Google language interface (required)
        };

        // Set trip type and add return date if provided
        if (params.returnDate) {
            serpParams.type = "1"; // Round trip
            serpParams.return_date = params.returnDate;
        } else {
            serpParams.type = "2"; // One-way trip
        }

        if (params.children && params.children > 0) {
            serpParams.children = params.children.toString();
        }

        if (params.travelClass) {
            // Convert travel class to SerpAPI integer format
            const travelClassMap = {
                economy: "1",
                premium: "2",
                business: "3",
                first: "4",
            };
            serpParams.travel_class = travelClassMap[params.travelClass] || "1";
        }

        return serpParams;
    }

    // Validate API key by making a test request
    async validateApiKey(): Promise<boolean> {
        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    api_key: this.apiKey,
                    engine: "google_flights",
                    departure_id: "LAX",
                    arrival_id: "JFK",
                    outbound_date: "2024-12-25",
                },
                timeout: 5000,
            });

            return !response.data.error;
        } catch (error) {
            return false;
        }
    }
}

// Helper function to generate unique ID for flights
let flightIdCounter = 0;
export function generateFlightId(flight: SerpFlightData): string {
    const segments = flight.flights || [];
    const firstFlight = segments[0] || {};
    const lastFlight = segments[segments.length - 1] || {};

    const departure = firstFlight.departure_airport?.id || "unknown";
    const arrival = lastFlight.arrival_airport?.id || "unknown";
    const price = flight.price || 0;
    const duration = flight.total_duration || 0;

    // Include booking token and counter for better uniqueness
    const bookingTokenHash = flight.departure_token ? flight.departure_token.slice(-8) : "none";
    const counter = ++flightIdCounter;

    return `flight-${departure}-${arrival}-${price}-${duration}-${bookingTokenHash}-${counter}-${Date.now()}`;
}

// Helper function to extract airline names from flight segments
export function extractAirlineNames(flights: SerpFlightSegment[]): string {
    const airlines = new Set<string>();

    flights.forEach((flight) => {
        if (flight.airline) {
            airlines.add(flight.airline);
        }
    });

    return Array.from(airlines).join(", ");
}

// Helper function to calculate confidence score
export function calculateFlightConfidence(flight: SerpFlightData): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for flights with more data
    if (flight.price) confidence += 0.2;
    if (flight.total_duration) confidence += 0.1;
    if (flight.carbon_emissions) confidence += 0.1;
    if (flight.departure_token) confidence += 0.1; // Has booking token

    return Math.min(confidence, 1.0);
}
