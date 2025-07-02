/**
 * Mock Data Generator for Travel API Testing
 * Provides sample responses for SerpAPI, Google Maps Places, and Google Maps Directions APIs
 */

// Sample SerpAPI Flight Response (Based on SerpAPIDocumentation.md)
export const mockSerpAPIFlightResponse = {
    search_metadata: {
        id: "674b2e1f2c5c123456789abc",
        status: "Success",
        json_endpoint: "https://serpapi.com/searches/674b2e1f2c5c123456789abc.json",
        google_flights_url:
            "https://www.google.com/travel/flights/search?tfs=CBwQAhoeag0IAhIJL20vMGZ2bnFyEgIQARgCIAEoATIBEColGgoIAhIGCgQYBCABGgwIAhIICAMSBAgBGAEyAjgBOAJAAUgBagA",
        total_time_taken: 2.84,
    },
    search_parameters: {
        engine: "google_flights",
        departure_id: "AUS",
        arrival_id: "SFO",
        outbound_date: "2024-12-15",
        return_date: "2024-12-20",
        currency: "USD",
    },
    best_flights: [
        {
            flights: [
                {
                    departure_airport: {
                        name: "Austin-Bergstrom International Airport",
                        id: "AUS",
                        time: "2024-12-15T08:30:00",
                    },
                    arrival_airport: {
                        name: "San Francisco International Airport",
                        id: "SFO",
                        time: "2024-12-15T10:45:00",
                    },
                    duration: 255,
                    airplane: "Boeing 737",
                    airline: "Southwest Airlines",
                    airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/WN.png",
                    travel_class: "Economy",
                    flight_number: "WN 1547",
                    legroom: "31 in",
                    extensions: ["Wi-Fi", "Power outlets"],
                    often_delayed_by_over_30_min: false,
                },
            ],
            layovers: [],
            total_duration: 255,
            carbon_emissions: {
                this_flight: 288000,
                typical_for_this_route: 295000,
                difference_percent: -2,
            },
            price: 298,
            type: "Round trip",
            airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/WN.png",
            departure_token:
                "WyJDalJJUVdkdVMyaDBka05uUzNWQlJsQXdSbWt3WkVSQk1rRTJSa3BGZFhsQmRHTkJRVUZCUjJkeFZqSklZVFJCIixbWyJBVVMiLCIyMDI0LTEyLTE1IixudWxsLG51bGwsbnVsbF0sWyJTRk8iLCIyMDI0LTEyLTIwIixudWxsLG51bGwsbnVsbF1dXQ==",
        },
        {
            flights: [
                {
                    departure_airport: {
                        name: "Austin-Bergstrom International Airport",
                        id: "AUS",
                        time: "2024-12-15T14:20:00",
                    },
                    arrival_airport: {
                        name: "Denver International Airport",
                        id: "DEN",
                        time: "2024-12-15T15:45:00",
                    },
                    duration: 145,
                    airplane: "Airbus A320",
                    airline: "United Airlines",
                    airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/UA.png",
                    travel_class: "Economy",
                    flight_number: "UA 1234",
                    legroom: "30 in",
                    extensions: ["Wi-Fi", "Entertainment"],
                },
                {
                    departure_airport: {
                        name: "Denver International Airport",
                        id: "DEN",
                        time: "2024-12-15T17:30:00",
                    },
                    arrival_airport: {
                        name: "San Francisco International Airport",
                        id: "SFO",
                        time: "2024-12-15T18:55:00",
                    },
                    duration: 145,
                    airplane: "Boeing 757",
                    airline: "United Airlines",
                    airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/UA.png",
                    travel_class: "Economy",
                    flight_number: "UA 5678",
                    legroom: "30 in",
                    extensions: ["Wi-Fi", "Entertainment"],
                },
            ],
            layovers: [
                {
                    duration: 105,
                    name: "Denver International Airport",
                    id: "DEN",
                    overnight: false,
                },
            ],
            total_duration: 395,
            carbon_emissions: {
                this_flight: 312000,
                typical_for_this_route: 295000,
                difference_percent: 6,
            },
            price: 342,
            type: "Round trip",
            airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/UA.png",
            departure_token:
                "WyJDalJJUVdkdVMyaDBka05uUzNWQlJsQXdSbWt3WkVSQk1rRTJSa3BGZFhsQmRHTkJRVUZCUjJkeFZqSklZVFJCIixbWyJBVVMiLCIyMDI0LTEyLTE1IixudWxsLG51bGwsbnVsbF0sWyJTRk8iLCIyMDI0LTEyLTIwIixudWxsLG51bGwsbnVsbF1dXQ==",
        },
    ],
    other_flights: [
        {
            flights: [
                {
                    departure_airport: {
                        name: "Austin-Bergstrom International Airport",
                        id: "AUS",
                        time: "2024-12-15T06:15:00",
                    },
                    arrival_airport: {
                        name: "San Francisco International Airport",
                        id: "SFO",
                        time: "2024-12-15T08:40:00",
                    },
                    duration: 265,
                    airplane: "Airbus A321",
                    airline: "American Airlines",
                    airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/AA.png",
                    travel_class: "Economy",
                    flight_number: "AA 1829",
                    legroom: "29 in",
                    extensions: ["Wi-Fi"],
                },
            ],
            layovers: [],
            total_duration: 265,
            carbon_emissions: {
                this_flight: 301000,
                typical_for_this_route: 295000,
                difference_percent: 2,
            },
            price: 389,
            type: "Round trip",
            airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/AA.png",
            departure_token:
                "WyJDalJJUVdkdVMyaDBka05uUzNWQlJsQXdSbWt3WkVSQk1rRTJSa3BGZFhsQmRHTkJRVUZCUjJkeFZqSklZVFJCIixbWyJBVVMiLCIyMDI0LTEyLTE1IixudWxsLG51bGwsbnVsbF0sWyJTRk8iLCIyMDI0LTEyLTIwIixudWxsLG51bGwsbnVsbF1dXQ==",
        },
    ],
    price_insights: {
        lowest_price: 298,
        price_level: "typical",
        typical_price_range: [280, 420],
        price_history: [
            ["2024-11-15", 315],
            ["2024-11-22", 298],
            ["2024-11-29", 342],
            ["2024-12-06", 298],
        ],
    },
    airports: [
        {
            departure: [
                {
                    airport: {
                        id: "AUS",
                        name: "Austin-Bergstrom International Airport",
                    },
                    city: "Austin",
                    country: "United States",
                    country_code: "US",
                    image: "https://lh5.googleusercontent.com/p/AF1QipNx1mF6B9c_PQQ1vY-y8Z1YzTlA6Y2v5Z3_PQT9=w1000-h600",
                    thumbnail:
                        "https://lh5.googleusercontent.com/p/AF1QipNx1mF6B9c_PQQ1vY-y8Z1YzTlA6Y2v5Z3_PQT9=w150-h100",
                },
            ],
            arrival: [
                {
                    airport: {
                        id: "SFO",
                        name: "San Francisco International Airport",
                    },
                    city: "San Francisco",
                    country: "United States",
                    country_code: "US",
                    image: "https://lh5.googleusercontent.com/p/AF1QipM8k2_gvw_z1YsZ2B3a9X1PZ7kA6Y2v5Z3_PQT9=w1000-h600",
                    thumbnail:
                        "https://lh5.googleusercontent.com/p/AF1QipM8k2_gvw_z1YsZ2B3a9X1PZ7kA6Y2v5Z3_PQT9=w150-h100",
                },
            ],
        },
    ],
};

// Sample Google Maps Places Response
export const mockGooglePlacesResponse = {
    results: [
        {
            place_id: "ChIJVVVVVVVVVVVVVVVVVVVVVV",
            name: "Golden Gate Bridge",
            rating: 4.7,
            user_ratings_total: 156789,
            price_level: undefined,
            types: ["tourist_attraction", "point_of_interest", "establishment"],
            vicinity: "Golden Gate Bridge, San Francisco, CA",
            geometry: {
                location: {
                    lat: 37.8199286,
                    lng: -122.4782551,
                },
            },
            photos: [
                {
                    photo_reference: "ATtYBwKAAAAAAAAAAAAAAABVVVVVVVVVVVVVVVVVVVVV",
                    height: 1200,
                    width: 1600,
                },
            ],
            opening_hours: {
                open_now: true,
            },
            formatted_address: "Golden Gate Bridge, San Francisco, CA 94129, USA",
        },
        {
            place_id: "ChIJXXXXXXXXXXXXXXXXXXXXXX",
            name: "Alcatraz Island",
            rating: 4.6,
            user_ratings_total: 89432,
            price_level: 3,
            types: ["tourist_attraction", "museum", "point_of_interest", "establishment"],
            vicinity: "Alcatraz Island, San Francisco, CA",
            geometry: {
                location: {
                    lat: 37.8269775,
                    lng: -122.4229555,
                },
            },
            photos: [
                {
                    photo_reference: "ATtYBwIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                    height: 1080,
                    width: 1920,
                },
            ],
            opening_hours: {
                open_now: true,
            },
            formatted_address: "Alcatraz Island, San Francisco, CA 94133, USA",
        },
        {
            place_id: "ChIJYYYYYYYYYYYYYYYYYYYYYY",
            name: "Fisherman's Wharf",
            rating: 4.2,
            user_ratings_total: 45672,
            price_level: 2,
            types: ["tourist_attraction", "point_of_interest", "establishment"],
            vicinity: "Fisherman's Wharf, San Francisco, CA",
            geometry: {
                location: {
                    lat: 37.8080555,
                    lng: -122.4177777,
                },
            },
            photos: [
                {
                    photo_reference: "ATtYBwJYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
                    height: 900,
                    width: 1600,
                },
            ],
            opening_hours: {
                open_now: true,
            },
            formatted_address: "Fisherman's Wharf, San Francisco, CA 94133, USA",
        },
    ],
    status: "OK",
};

// Sample Google Maps Directions Response
export const mockGoogleDirectionsResponse = {
    routes: [
        {
            legs: [
                {
                    distance: {
                        text: "2.1 mi",
                        value: 3379,
                    },
                    duration: {
                        text: "12 mins",
                        value: 720,
                    },
                    duration_in_traffic: {
                        text: "15 mins",
                        value: 900,
                    },
                    start_address: "Union Square, San Francisco, CA 94108, USA",
                    end_address: "Golden Gate Bridge, San Francisco, CA 94129, USA",
                    start_location: {
                        lat: 37.7879938,
                        lng: -122.4074344,
                    },
                    end_location: {
                        lat: 37.8199286,
                        lng: -122.4782551,
                    },
                    steps: [
                        {
                            distance: {
                                text: "0.3 mi",
                                value: 482,
                            },
                            duration: {
                                text: "2 mins",
                                value: 120,
                            },
                            html_instructions:
                                "Head <b>north</b> on <b>Stockton St</b> toward <b>Post St</b>",
                            travel_mode: "TRANSIT",
                            transit_details: {
                                arrival_stop: {
                                    name: "Stockton St & Post St",
                                    location: {
                                        lat: 37.7879938,
                                        lng: -122.4074344,
                                    },
                                },
                                departure_stop: {
                                    name: "Union Square",
                                    location: {
                                        lat: 37.7879938,
                                        lng: -122.4074344,
                                    },
                                },
                                line: {
                                    agencies: [
                                        {
                                            name: "San Francisco Municipal Transportation Agency",
                                            url: "http://www.sfmta.com/",
                                        },
                                    ],
                                    name: "30-Stockton",
                                    color: "#0072ce",
                                    vehicle: {
                                        name: "Bus",
                                        type: "BUS",
                                    },
                                },
                                num_stops: 3,
                            },
                        },
                    ],
                },
            ],
            overview_polyline: {
                points: "yCqqFbpbjVsBg@_DqBaCs@{Ag@gC_AaCo@_CW_Cg@aFqAgDq@_DOqEE{BPuBVgBf@_CbAuBv@gBp@iBl@aBh@}Af@cCl@uCr@}Bp@uCl@qCf@_Dd@{E`@_DX_DN}CPcE@_DBqBHsB",
            },
            summary: "30-Stockton",
            fare: {
                currency: "USD",
                value: 2.5,
                text: "$2.50",
            },
        },
    ],
    status: "OK",
};

// Error Response Samples
export const mockAPIErrors = {
    serpAPI: {
        invalidKey: {
            error: "Invalid API key. Please check your API key and try again.",
            status: 401,
        },
        rateLimited: {
            error: "Rate limit exceeded. Please try again later.",
            status: 429,
        },
        networkError: {
            error: "Network error occurred. Please check your connection.",
            status: 500,
        },
    },
    googleMaps: {
        invalidKey: {
            error_message: "The provided API key is invalid.",
            status: "REQUEST_DENIED",
        },
        rateLimited: {
            error_message: "You have exceeded your rate-limit for this API.",
            status: "OVER_DAILY_LIMIT",
        },
        notFound: {
            error_message: "No results found for the specified query.",
            status: "ZERO_RESULTS",
        },
    },
};

// Test Parameters for API Operations
export const mockTestParameters = {
    searchFlights: {
        departure: "AUS",
        arrival: "SFO",
        departureDate: "2024-12-15",
        returnDate: "2024-12-20",
        passengers: 1,
        class: "economy",
    },
    searchPlaces: {
        query: "restaurants in San Francisco",
        location: {
            lat: 37.7749,
            lng: -122.4194,
        },
        radius: 5000,
        type: "restaurant",
    },
    getTransitInfo: {
        origin: "Union Square, San Francisco, CA",
        destination: "Golden Gate Bridge, San Francisco, CA",
        mode: "transit",
        departureTime: "2024-12-15T09:00:00",
    },
};

/**
 * Generate mock responses for testing
 */
export const getMockResponse = (provider, operation, shouldError = false) => {
    if (shouldError) {
        switch (provider) {
            case "serpapi":
                return mockAPIErrors.serpAPI.invalidKey;
            case "googlemaps":
                return mockAPIErrors.googleMaps.invalidKey;
            default:
                return { error: "Unknown provider error" };
        }
    }

    switch (provider) {
        case "serpapi":
            if (operation === "searchFlights") {
                return mockSerpAPIFlightResponse;
            }
            break;
        case "googlemaps":
            if (operation === "searchPlaces") {
                return mockGooglePlacesResponse;
            }
            if (operation === "getTransitInfo") {
                return mockGoogleDirectionsResponse;
            }
            break;
        default:
            return { error: "Unknown provider or operation" };
    }

    return { error: "Operation not supported" };
};

export default {
    mockSerpAPIFlightResponse,
    mockGooglePlacesResponse,
    mockGoogleDirectionsResponse,
    mockAPIErrors,
    mockTestParameters,
    getMockResponse,
};
