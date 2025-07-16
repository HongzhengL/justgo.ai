import axios from "axios";
import {
    PlaceSearchParams,
    TransitSearchParams,
    GooglePlacesResponse,
    GoogleDirectionsResponse,
    GooglePlaceData,
    GoogleDirectionsRoute,
    GoogleDirectionsLeg,
} from "../types.js";
import { handleAPIError, withRetry } from "../utils/errors.js";

export class GoogleMapsClient {
    private readonly apiKey: string;
    private readonly placesBaseURL = "https://maps.googleapis.com/maps/api/place";
    private readonly directionsBaseURL = "https://maps.googleapis.com/maps/api/directions";
    private readonly timeout = 10000; // 10 seconds

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async searchPlaces(params: PlaceSearchParams): Promise<GooglePlacesResponse> {
        const searchParams = this.buildPlacesParams(params);

        try {
            return await withRetry(async () => {
                const response = await axios.get(`${this.placesBaseURL}/textsearch/json`, {
                    params: searchParams,
                    timeout: this.timeout,
                });

                if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
                    throw new Error(
                        `Google Places API error: ${response.data.status} - ${
                            response.data.error_message || "Unknown error"
                        }`,
                    );
                }

                return response.data as GooglePlacesResponse;
            });
        } catch (error) {
            throw handleAPIError(error, "Google Places API");
        }
    }

    async getDirections(params: TransitSearchParams): Promise<GoogleDirectionsResponse> {
        const directionsParams = this.buildDirectionsParams(params);

        try {
            return await withRetry(async () => {
                const response = await axios.get(`${this.directionsBaseURL}/json`, {
                    params: directionsParams,
                    timeout: this.timeout,
                });

                if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
                    throw new Error(
                        `Google Directions API error: ${response.data.status} - ${
                            response.data.error_message || "Unknown error"
                        }`,
                    );
                }

                return response.data as GoogleDirectionsResponse;
            });
        } catch (error) {
            throw handleAPIError(error, "Google Directions API");
        }
    }

    async getPlaceDetails(placeId: string): Promise<GooglePlaceData> {
        try {
            const response = await axios.get(`${this.placesBaseURL}/details/json`, {
                params: {
                    place_id: placeId,
                    key: this.apiKey,
                    fields: "name,formatted_address,geometry,photos,rating,reviews,website,opening_hours,price_level",
                },
                timeout: this.timeout,
            });

            if (response.data.status !== "OK") {
                throw new Error(`Google Place Details API error: ${response.data.status}`);
            }

            return response.data.result;
        } catch (error) {
            throw handleAPIError(error, "Google Place Details API");
        }
    }

    private buildPlacesParams(params: PlaceSearchParams): Record<string, string> {
        const placesParams: Record<string, string> = {
            query: params.query,
            key: this.apiKey,
        };

        // Add location bias if provided
        if (params.location) {
            placesParams.location = `${params.location.lat},${params.location.lng}`;
            placesParams.radius = (params.radius || 50000).toString(); // Default 50km
        }

        // Add type filter if provided
        if (params.type) {
            placesParams.type = params.type;
        }

        return placesParams;
    }

    private buildDirectionsParams(params: TransitSearchParams): Record<string, string> {
        const directionsParams: Record<string, string> = {
            origin: params.origin,
            destination: params.destination,
            key: this.apiKey,
            mode: params.mode || "driving",
        };

        // Add departure time if provided
        if (params.departureTime) {
            const departureTimestamp = Math.floor(new Date(params.departureTime).getTime() / 1000);
            directionsParams.departure_time = departureTimestamp.toString();
        }

        // Add traffic model for driving
        if (params.mode === "driving" || !params.mode) {
            directionsParams.traffic_model = "best_guess";
        }

        // Add transit options for public transport
        if (params.mode === "transit") {
            directionsParams.transit_mode = "bus|subway|train|tram";
        }

        return directionsParams;
    }

    // Validate API key by making a test request
    async validateApiKey(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.placesBaseURL}/textsearch/json`, {
                params: {
                    query: "restaurant",
                    key: this.apiKey,
                },
                timeout: 5000,
            });

            return response.data.status === "OK" || response.data.status === "ZERO_RESULTS";
        } catch (error) {
            return false;
        }
    }
}

// Helper function to generate unique ID for places
export function generatePlaceId(place: GooglePlaceData): string {
    const name = place.name?.replace(/[^a-zA-Z0-9]/g, "-") || "unknown";
    const placeId = place.place_id || "";
    const rating = place.rating || 0;

    return `place-${name}-${placeId.slice(-8)}-${rating}-${Date.now()}`;
}

// Helper function to generate unique ID for transit routes
export function generateTransitId(route: GoogleDirectionsRoute): string {
    const legs = route.legs || [];
    const firstLeg = legs[0] || {};
    const lastLeg = legs[legs.length - 1] || {};

    const startAddress = firstLeg.start_address?.replace(/[^a-zA-Z0-9]/g, "-") || "unknown";
    const endAddress = lastLeg.end_address?.replace(/[^a-zA-Z0-9]/g, "-") || "unknown";
    const duration =
        route.legs?.reduce(
            (total: number, leg: GoogleDirectionsLeg) => total + (leg.duration?.value || 0),
            0,
        ) || 0;

    return `transit-${startAddress.slice(0, 10)}-${endAddress.slice(
        0,
        10,
    )}-${duration}-${Date.now()}`;
}

// Helper function to extract photo URL from Google Places photo reference
export function getPlacePhotoUrl(
    photoReference: string,
    apiKey: string,
    maxWidth: number = 400,
): string {
    return `https://maps.googleapis.com/maps/api/place/photo?photoreference=${photoReference}&key=${apiKey}&maxwidth=${maxWidth}`;
}

// Helper function to calculate confidence score for places
export function calculatePlaceConfidence(place: GooglePlaceData): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for places with more data
    if (place.rating) confidence += 0.2;
    if (place.photos && place.photos.length > 0) confidence += 0.1;
    if (place.price_level !== undefined) confidence += 0.1;
    if (place.website) confidence += 0.1;

    return Math.min(confidence, 1.0);
}

// Helper function to calculate confidence score for transit
export function calculateTransitConfidence(route: GoogleDirectionsRoute): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for routes with more data
    if (route.duration) confidence += 0.2;
    if (route.distance) confidence += 0.1;
    if (route.legs && route.legs.length > 0) confidence += 0.1;
    if (route.fare) confidence += 0.1;

    return Math.min(confidence, 1.0);
}
