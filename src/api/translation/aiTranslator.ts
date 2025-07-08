import OpenAI from "openai";
import {
    StandardizedCard,
    SerpFlightResponse,
    GooglePlacesResponse,
    GoogleDirectionsResponse,
} from "../types.js";
import {
    generateFlightId,
    extractAirlineNames,
    calculateFlightConfidence,
} from "../serpapi/client.js";
import {
    generatePlaceId,
    generateTransitId,
    calculatePlaceConfidence,
    calculateTransitConfidence,
    getPlacePhotoUrl,
} from "../googlemaps/client.js";
import { extractFlightTiming } from "../../utils/timeUtils.js";

export class AITranslator {
    private openai?: OpenAI;
    private useAI: boolean;

    constructor(openaiApiKey?: string) {
        this.useAI = !!openaiApiKey;
        if (openaiApiKey) {
            this.openai = new OpenAI({
                apiKey: openaiApiKey,
            });
        }
    }

    async translateSerpFlights(serpResponse: SerpFlightResponse): Promise<StandardizedCard[]> {
        try {
            // Combine best_flights and other_flights
            const allFlights = [
                ...(serpResponse.best_flights || []),
                ...(serpResponse.other_flights || []),
            ];

            // Force rule-based translation for flights to ensure airline logos are handled properly
            // The rule-based method has better handling of airline logos from SerpAPI data
            console.log("Using rule-based translation for flights to preserve airline logos");
            return this.translateFlightsWithRules(allFlights);
        } catch (error) {
            console.warn("Rule-based translation failed:", error);
            const allFlights = [
                ...(serpResponse.best_flights || []),
                ...(serpResponse.other_flights || []),
            ];
            return this.translateFlightsWithRules(allFlights);
        }
    }

    async translateGooglePlaces(
        placesResponse: GooglePlacesResponse,
        apiKey: string,
    ): Promise<StandardizedCard[]> {
        try {
            if (this.useAI && this.openai) {
                return await this.translatePlacesWithAI(placesResponse.results, apiKey);
            } else {
                return this.translatePlacesWithRules(placesResponse.results, apiKey);
            }
        } catch (error) {
            console.warn("AI translation failed, falling back to rule-based:", error);
            return this.translatePlacesWithRules(placesResponse.results, apiKey);
        }
    }

    async translateGoogleDirections(
        directionsResponse: GoogleDirectionsResponse,
    ): Promise<StandardizedCard[]> {
        try {
            if (this.useAI && this.openai) {
                return await this.translateDirectionsWithAI(directionsResponse.routes);
            } else {
                return this.translateDirectionsWithRules(directionsResponse.routes);
            }
        } catch (error) {
            console.warn("AI translation failed, falling back to rule-based:", error);
            return this.translateDirectionsWithRules(directionsResponse.routes);
        }
    }

    // AI-powered translation methods
    private async translateFlightsWithAI(flights: any[]): Promise<StandardizedCard[]> {
        if (!this.openai || flights.length === 0) return [];

        const prompt = `Convert these flight search results to standardized travel cards. Each card should have:
- id: unique identifier
- type: "flight"
- title: route (e.g., "AUS → SFO")
- subtitle: airline names
- price: {amount, currency}
- duration: total minutes
- location: {from: {code}, to: {code}}
- essentialDetails: key info for card display
- details: complete flight information INCLUDING airlineLogo field from airline_logo URL if available
- externalLinks: {booking: Google Flights URL}
- metadata: {provider: "SerpAPI", confidence: 0-1, timestamp}

IMPORTANT: Include airlineLogo in the details object using the airline_logo URL from the flight data.

Flight data: ${JSON.stringify(flights.slice(0, 5))}

Return only valid JSON array.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content in AI response");

        return JSON.parse(content);
    }

    private async translatePlacesWithAI(
        places: any[],
        apiKey: string,
    ): Promise<StandardizedCard[]> {
        if (!this.openai || places.length === 0) return [];

        const prompt = `Convert these Google Places results to standardized travel cards. Each card should have:
- id: unique identifier
- type: "place"
- title: place name
- subtitle: type/category
- location: {lat, lng, address}
- essentialDetails: rating, price level, opening status
- details: complete place information
- externalLinks: {maps: Google Maps URL, website: if available}
- metadata: {provider: "Google Places", confidence: 0-1, timestamp}

Places data: ${JSON.stringify(places.slice(0, 5))}

Return only valid JSON array.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content in AI response");

        return JSON.parse(content);
    }

    private async translateDirectionsWithAI(routes: any[]): Promise<StandardizedCard[]> {
        if (!this.openai || routes.length === 0) return [];

        const prompt = `Convert these Google Directions routes to standardized travel cards. Each card should have:
- id: unique identifier
- type: "transit"
- title: route summary
- subtitle: travel mode and duration
- duration: total minutes
- location: {from: {address}, to: {address}}
- essentialDetails: distance, duration, steps summary
- details: complete route information
- externalLinks: {directions: Google Maps directions URL}
- metadata: {provider: "Google Directions", confidence: 0-1, timestamp}

Routes data: ${JSON.stringify(routes.slice(0, 3))}

Return only valid JSON array.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content in AI response");

        return JSON.parse(content);
    }

    /**
     * Extract comprehensive airline logo information from flight data
     * Supports both single-carrier and multi-carrier flights with future multi-logo UI support
     */
    private extractAirlineLogos(
        flight: any,
        segments: any[],
    ): {
        primaryLogo: string | null;
        allLogos: Array<{
            airline: string;
            logo: string | null;
            flightNumber: string;
            segmentIndex: number;
        }>;
        isMultiCarrier: boolean;
        primaryAirline: string;
    } {
        // Extract all airline logos from segments
        const allLogos = segments.map((segment, index) => ({
            airline: segment.airline || "Unknown Airline",
            logo: segment.airline_logo || null,
            flightNumber: segment.flight_number || "",
            segmentIndex: index,
        }));

        // Determine if this is a multi-carrier flight
        const uniqueAirlines = new Set(segments.map((s) => s.airline).filter(Boolean));
        const isMultiCarrier = uniqueAirlines.size > 1;

        // Select primary logo based on flight composition
        let primaryLogo: string | null = null;
        if (isMultiCarrier) {
            // For multi-carrier flights, prefer flight-level mixed airline logo
            primaryLogo = flight.airline_logo || segments[0]?.airline_logo || null;
        } else {
            // For single-carrier flights, prefer segment-level logo for accuracy
            primaryLogo = segments[0]?.airline_logo || flight.airline_logo || null;
        }

        const primaryAirline = segments[0]?.airline || "Unknown Airline";

        console.log("Airline logo extraction:", {
            isMultiCarrier,
            primaryAirline,
            primaryLogo,
            segmentCount: segments.length,
            flightLevelLogo: flight.airline_logo,
            allLogos: allLogos.map((l) => ({ airline: l.airline, hasLogo: !!l.logo })),
        });

        return {
            primaryLogo,
            allLogos,
            isMultiCarrier,
            primaryAirline,
        };
    }

    // Rule-based translation methods (fallback)
    private translateFlightsWithRules(flights: any[]): StandardizedCard[] {
        return flights.map((flight) => {
            console.log("Rule-based flight translation - flight object:", flight);
            console.log("Rule-based flight translation - airline_logo:", flight.airline_logo);

            const segments = flight.flights || [];
            const firstSegment = segments[0] || {};
            const lastSegment = segments[segments.length - 1] || {};

            // Extract comprehensive airline logo information
            const logoData = this.extractAirlineLogos(flight, segments);

            // Extract timing information from flight segments
            const timingData = extractFlightTiming(flight);

            const departureCode = firstSegment.departure_airport?.id || "Unknown";
            const arrivalCode = lastSegment.arrival_airport?.id || "Unknown";

            return {
                id: generateFlightId(flight),
                type: "flight" as const,
                title: `${departureCode} → ${arrivalCode}`,
                subtitle: extractAirlineNames(segments),
                price: flight.price
                    ? {
                          amount: flight.price,
                          currency: "USD",
                      }
                    : undefined,
                duration: flight.total_duration,
                // Add timing fields to StandardizedCard
                departureTime: timingData.departureTime,
                arrivalTime: timingData.arrivalTime,
                layoverInfo: timingData.layoverInfo,
                location: {
                    from: { code: departureCode },
                    to: { code: arrivalCode },
                },
                details: {
                    segments: segments,
                    layovers: flight.layovers || [],
                    carbonEmissions: flight.carbon_emissions,
                    // Enhanced airline logo support with backward compatibility
                    airlineLogo: logoData.primaryLogo, // Current single logo (backward compatible)
                    airlineLogos: logoData.allLogos, // Future multi-logo support - array of {airline, logo, flightNumber, segmentIndex}
                    isMultiCarrier: logoData.isMultiCarrier, // Multi-carrier detection for future UI enhancements
                    primaryAirline: logoData.primaryAirline, // Primary airline name for consistency
                    bookingToken: flight.departure_token,
                    type: flight.type || "Round trip",
                    // Add detailed timing information to details section
                    timingDetails: {
                        departureTime: timingData.departureTime,
                        arrivalTime: timingData.arrivalTime,
                        totalDuration: timingData.totalDuration,
                        layoverInfo: timingData.layoverInfo,
                    },
                },
                essentialDetails: {
                    airline: extractAirlineNames(segments),
                    duration: `${Math.floor((flight.total_duration || 0) / 60)}h ${(flight.total_duration || 0) % 60}m`,
                    // Add timing to essential details for card display
                    departure: timingData.departureTime,
                    arrival: timingData.arrivalTime,
                    price: flight.price ? `$${flight.price}` : "Price not available",
                    stops: flight.layovers ? flight.layovers.length : 0,
                },
                externalLinks: {
                    booking: flight.departure_token
                        ? `https://www.google.com/flights/booking?token=${flight.departure_token}`
                        : `https://www.google.com/flights#search;f=${departureCode};t=${arrivalCode}`,
                },
                metadata: {
                    provider: "SerpAPI",
                    confidence: calculateFlightConfidence(flight),
                    timestamp: new Date().toISOString(),
                    bookingToken: flight.departure_token,
                },
            };
        });
    }

    private translatePlacesWithRules(places: any[], apiKey: string): StandardizedCard[] {
        return places.map((place) => {
            const photoUrl = place.photos?.[0]?.photo_reference
                ? getPlacePhotoUrl(place.photos[0].photo_reference, apiKey)
                : undefined;

            return {
                id: generatePlaceId(place),
                type: "place" as const,
                title: place.name || "Unknown Place",
                subtitle: place.types?.[0]?.replace(/_/g, " ") || "Place",
                location: {
                    to: {
                        lat: place.geometry?.location?.lat,
                        lng: place.geometry?.location?.lng,
                        address: place.formatted_address,
                    },
                },
                details: {
                    rating: place.rating,
                    priceLevel: place.price_level,
                    photos: place.photos,
                    types: place.types,
                    openingHours: place.opening_hours,
                    reviews: place.reviews,
                    website: place.website,
                    placeId: place.place_id,
                    photoUrl: photoUrl,
                },
                essentialDetails: {
                    rating: place.rating ? `⭐ ${place.rating}` : "No rating",
                    priceLevel: place.price_level ? "$".repeat(place.price_level) : "Price unknown",
                    address: place.formatted_address || "Address not available",
                    status: place.opening_hours?.open_now ? "Open" : "Closed",
                },
                externalLinks: {
                    maps: `https://www.google.com/maps/place/${encodeURIComponent(place.name || "")}/@${place.geometry?.location?.lat || 0},${place.geometry?.location?.lng || 0}`,
                    website: place.website,
                },
                metadata: {
                    provider: "Google Places",
                    confidence: calculatePlaceConfidence(place),
                    timestamp: new Date().toISOString(),
                },
            };
        });
    }

    private translateDirectionsWithRules(routes: any[]): StandardizedCard[] {
        return routes.map((route) => {
            const legs = route.legs || [];
            const totalDistance = legs.reduce(
                (sum: number, leg: any) => sum + (leg.distance?.value || 0),
                0,
            );
            const totalDuration = legs.reduce(
                (sum: number, leg: any) => sum + (leg.duration?.value || 0),
                0,
            );

            const startAddress = legs[0]?.start_address || "Unknown start";
            const endAddress = legs[legs.length - 1]?.end_address || "Unknown end";

            return {
                id: generateTransitId(route),
                type: "transit" as const,
                title: `${startAddress} to ${endAddress}`,
                subtitle: `${Math.round(totalDistance / 1000)} km • ${Math.floor(totalDuration / 60)} min`,
                duration: Math.floor(totalDuration / 60), // Convert seconds to minutes
                location: {
                    from: { address: startAddress },
                    to: { address: endAddress },
                },
                details: {
                    legs: legs,
                    distance: totalDistance,
                    duration: totalDuration,
                    summary: route.summary,
                    warnings: route.warnings,
                    waypoints: route.waypoint_order,
                    bounds: route.bounds,
                    fare: route.fare,
                },
                essentialDetails: {
                    distance: `${Math.round(totalDistance / 1000)} km`,
                    duration: `${Math.floor(totalDuration / 60)} minutes`,
                    mode: legs[0]?.steps?.[0]?.travel_mode || "driving",
                    traffic: route.legs?.[0]?.duration_in_traffic
                        ? "Heavy traffic"
                        : "Normal traffic",
                },
                externalLinks: {
                    directions: `https://www.google.com/maps/dir/${encodeURIComponent(startAddress)}/${encodeURIComponent(endAddress)}`,
                },
                metadata: {
                    provider: "Google Directions",
                    confidence: calculateTransitConfidence(route),
                    timestamp: new Date().toISOString(),
                },
            };
        });
    }
}
