// Standardized data interfaces for the AI Travel Planner
// Based on TODO.md specifications

import type { LayoverInfo } from "../utils/timeUtils.js";

export interface Location {
    lat?: number;
    lng?: number;
    code?: string; // IATA code for airports
    address?: string; // Full address for places
    name?: string; // Location name
}

export interface StandardizedCard {
    id: string;
    type: "flight" | "place" | "transit";
    title: string;
    subtitle: string;
    price?: {
        amount: number;
        currency: string;
    };
    duration?: number; // minutes
    // Flight timing fields
    departureTime?: string; // Formatted departure time (e.g., "8:30 AM")
    arrivalTime?: string; // Formatted arrival time (e.g., "10:45 AM")
    layoverInfo?: LayoverInfo[]; // Layover details for connecting flights
    location: {
        from?: Location;
        to?: Location;
    };
    details: {
        [key: string]: any; // Type-specific details for "More Info" modal
    };
    essentialDetails: {
        // Subset of details shown on card without "More Info"
        [key: string]: any;
    };
    externalLinks: {
        booking?: string; // For flights: booking URL or Google Flights search
        maps?: string; // For places: Google Maps URL
        directions?: string; // For transit: Google Maps directions
        website?: string; // For places: official website
    };
    metadata: {
        provider: string;
        confidence: number;
        timestamp: string;
        bookingToken?: string; // SerpAPI booking token for flights
    };
    // Index signature for SuperJSON compatibility
    [key: string]: any;
}

// Modal state management
export interface ModalState {
    searchResults: {
        isOpen: boolean;
        results: StandardizedCard[];
    };
    detailModal: {
        isOpen: boolean;
        selectedItem: StandardizedCard | null;
    };
}

// Itinerary state management
export interface ItineraryState {
    items: StandardizedCard[];
    totalCost: number;
    currency: string;
}

// API Request Parameters
export interface FlightSearchParams {
    departure: string; // IATA code
    arrival: string; // IATA code
    outboundDate: string; // YYYY-MM-DD
    returnDate?: string; // YYYY-MM-DD for round trip
    adults: number;
    children?: number;
    travelClass?: "economy" | "business" | "first";
    currency?: string;
    gl?: string; // Google country interface (required by SerpAPI)
    hl?: string; // Google language interface (required by SerpAPI)
}

export interface PlaceSearchParams {
    query: string;
    location?: {
        lat: number;
        lng: number;
    };
    radius?: number; // in meters
    type?: "tourist_attraction" | "restaurant" | "lodging" | "activity";
}

export interface TransitSearchParams {
    origin: string;
    destination: string;
    mode?: "driving" | "walking" | "bicycling" | "transit";
    departureTime?: string; // ISO datetime
}

// External API Response Types (for type safety)
export interface SerpFlightResponse {
    search_metadata: any;
    search_parameters: any;
    best_flights: any[];
    other_flights: any[];
    price_insights: any;
    airports: any[];
}

export interface GooglePlacesResponse {
    results: any[];
    status: string;
    next_page_token?: string;
}

export interface GoogleDirectionsResponse {
    routes: any[];
    status: string;
}

// Error types
export interface APIError {
    type: "RATE_LIMIT" | "API_DOWN" | "INVALID_PARAMS" | "NETWORK_ERROR" | "UNKNOWN";
    message: string;
    provider?: string;
    statusCode?: number;
}

// Travel API Module interface
export interface TravelAPIInterface {
    searchFlights(params: FlightSearchParams): Promise<StandardizedCard[]>;
    searchPlaces(params: PlaceSearchParams): Promise<StandardizedCard[]>;
    getTransitInfo(params: TransitSearchParams): Promise<StandardizedCard[]>;
}
