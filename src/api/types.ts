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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any; // Type-specific details for "More Info" modal - SuperJSON compatibility required
    };
    essentialDetails: {
        // Subset of details shown on card without "More Info"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any; // SuperJSON compatibility required
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export interface FlightSearchContext {
    departure: string;
    arrival: string;
    outboundDate: string;
    returnDate?: string;
    currency?: string;
    adults: number;
    children?: number;
    travelClass?: string;
    gl?: string;
    hl?: string;
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

// SerpAPI Flight Data Structures
export interface SerpFlightSegment {
    departure_airport?: { id?: string; time?: string };
    arrival_airport?: { id?: string; time?: string };
    airline?: string;
    airline_logo?: string;
    flight_number?: string;
    [key: string]: unknown;
}

export interface SerpFlightData {
    flights?: SerpFlightSegment[];
    layovers?: unknown[];
    price?: number;
    total_duration?: number;
    departure_token?: string;
    booking_token?: string;
    airline_logo?: string;
    type?: string;
    carbon_emissions?: unknown;
    [key: string]: unknown;
}

export interface SerpFlightResponse {
    search_metadata: unknown;
    search_parameters: unknown;
    best_flights: SerpFlightData[];
    other_flights: SerpFlightData[];
    price_insights: unknown;
    airports: unknown[];
}

// SerpAPI Booking Options Data Structures
export interface BookingOption {
    book_with: string;
    airline_logos: string[];
    marketed_as: string[];
    price: number;
    local_prices?: Array<{
        currency: string;
        price: number;
    }>;
    option_title?: string;
    extensions?: string[];
    baggage_prices?: string[];
    booking_request: {
        url: string;
        post_data: string;
    };
    booking_phone?: string;
    estimated_phone_service_fee?: number;
}

export interface SerpBookingResponse {
    selected_flights: SerpFlightData[];
    baggage_prices?: {
        together?: string[];
        departing?: string[];
        returning?: string[];
    };
    booking_options: Array<{
        separate_tickets?: boolean;
        together?: BookingOption;
        departing?: BookingOption;
        returning?: BookingOption;
    }>;
    price_insights?: unknown;
    error?: string;
}

// Google Places Data Structures
export interface GooglePlaceData {
    name?: string;
    place_id?: string;
    formatted_address?: string;
    geometry?: {
        location?: { lat?: number; lng?: number };
    };
    rating?: number;
    price_level?: number;
    types?: string[];
    photos?: Array<{ photo_reference?: string }>;
    opening_hours?: { open_now?: boolean };
    reviews?: unknown[];
    website?: string;
    [key: string]: unknown;
}

export interface GooglePlacesResponse {
    results: GooglePlaceData[];
    status: string;
    next_page_token?: string;
}

// Google Directions Data Structures
export interface GoogleDirectionsLeg {
    start_address?: string;
    end_address?: string;
    distance?: { value?: number };
    duration?: { value?: number };
    duration_in_traffic?: unknown;
    steps?: Array<{ travel_mode?: string; [key: string]: unknown }>;
    [key: string]: unknown;
}

export interface GoogleDirectionsRoute {
    legs?: GoogleDirectionsLeg[];
    summary?: string;
    warnings?: unknown[];
    waypoint_order?: unknown;
    bounds?: unknown;
    fare?: unknown;
    [key: string]: unknown;
}

export interface GoogleDirectionsResponse {
    routes: GoogleDirectionsRoute[];
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
