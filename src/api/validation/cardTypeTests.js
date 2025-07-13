/**
 * Card Type Validation Tests
 * Tests all StandardizedCard types (flight, place, transit) against TODO.md specifications
 */

import {
    validateStandardizedCard,
    validateStandardizedCardArray,
    getValidationReport,
} from "./cardValidator.js";
import logger from "../../utils/logger.js";
import mockData from "../testing/mockData.js";

/**
 * Card Type Test Results
 */
class CardTypeTestResult {
    constructor(type, sourceAPI, testCards, validationResults) {
        this.type = type;
        this.sourceAPI = sourceAPI;
        this.testCards = testCards;
        this.validationResults = validationResults;
        this.summary = this.calculateSummary();
    }

    calculateSummary() {
        const arrayValidation = validateStandardizedCardArray(this.testCards, this.type);

        return {
            totalCards: this.testCards.length,
            validCards: arrayValidation.summary.validCards,
            invalidCards: arrayValidation.summary.invalidCards,
            complianceRate:
                this.testCards.length > 0
                    ? Math.round((arrayValidation.summary.validCards / this.testCards.length) * 100)
                    : 0,
            criticalErrors: arrayValidation.summary.criticalErrors,
            warnings: arrayValidation.summary.warnings,
            passed: arrayValidation.isValid,
        };
    }

    getReport() {
        const report = {
            cardType: this.type,
            sourceAPI: this.sourceAPI,
            testSummary: this.summary,
            individualResults: this.validationResults,
            recommendations: this.getRecommendations(),
        };

        return report;
    }

    getRecommendations() {
        const recommendations = [];

        if (this.summary.criticalErrors > 0) {
            recommendations.push("CRITICAL: Fix missing required fields or invalid data types");
        }

        if (this.summary.warnings > 0) {
            recommendations.push("WARNING: Address validation warnings for improved compliance");
        }

        if (this.summary.complianceRate < 100) {
            recommendations.push(
                `Compliance rate is ${this.summary.complianceRate}% - aim for 100%`,
            );
        }

        if (this.summary.complianceRate === 100) {
            recommendations.push("✅ All cards are fully compliant with TODO.md specifications");
        }

        return recommendations;
    }
}

/**
 * Mock Translation Functions
 * These simulate the translation process from API responses to StandardizedCards
 */

/**
 * Translate SerpAPI Flight Response to StandardizedCards
 */
function translateMockSerpAPIFlights(serpResponse) {
    const results = [];

    // Process best_flights
    if (serpResponse.best_flights) {
        serpResponse.best_flights.forEach((flight, index) => {
            const card = {
                id: `flight-${Date.now()}-${index}`,
                type: "flight",
                title: `${flight.flights[0].departure_airport.id} → ${
                    flight.flights[flight.flights.length - 1].arrival_airport.id
                }`,
                subtitle: flight.flights.map((f) => f.airline).join(", "),
                price: {
                    amount: flight.price,
                    currency: "USD",
                },
                duration: flight.total_duration,
                location: {
                    from: {
                        code: flight.flights[0].departure_airport.id,
                        name: flight.flights[0].departure_airport.name,
                    },
                    to: {
                        code: flight.flights[flight.flights.length - 1].arrival_airport.id,
                        name: flight.flights[flight.flights.length - 1].arrival_airport.name,
                    },
                },
                details: {
                    segments: flight.flights,
                    layovers: flight.layovers || [],
                    carbonEmissions: flight.carbon_emissions,
                    airlineLogo: flight.airline_logo,
                    bookingToken: flight.departure_token,
                    flightType: flight.type,
                },
                essentialDetails: {
                    airline: flight.flights[0].airline,
                    departureTime: flight.flights[0].departure_airport.time,
                    arrivalTime: flight.flights[flight.flights.length - 1].arrival_airport.time,
                    stops: flight.layovers ? flight.layovers.length : 0,
                    travelClass: flight.flights[0].travel_class,
                },
                externalLinks: {
                    booking: flight.departure_token
                        ? `https://www.google.com/flights/booking?token=${flight.departure_token}`
                        : `https://www.google.com/flights#search;f=${
                              flight.flights[0].departure_airport.id
                          };t=${flight.flights[flight.flights.length - 1].arrival_airport.id}`,
                },
                metadata: {
                    provider: "SerpAPI",
                    confidence: 0.95,
                    timestamp: new Date().toISOString(),
                    bookingToken: flight.departure_token,
                },
            };

            results.push(card);
        });
    }

    return results;
}

/**
 * Translate Google Places Response to StandardizedCards
 */
function translateMockGooglePlaces(placesResponse) {
    const results = [];

    if (placesResponse.results) {
        placesResponse.results.forEach((place, index) => {
            const card = {
                id: `place-${Date.now()}-${index}`,
                type: "place",
                title: place.name,
                subtitle: place.vicinity,
                price: place.price_level
                    ? {
                          amount: place.price_level * 25, // Rough estimate: 1-4 scale to dollar amounts
                          currency: "USD",
                      }
                    : undefined,
                location: {
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng,
                    address: place.formatted_address,
                    name: place.name,
                },
                details: {
                    placeId: place.place_id,
                    rating: place.rating,
                    userRatingsTotal: place.user_ratings_total,
                    priceLevel: place.price_level,
                    types: place.types,
                    photos: place.photos,
                    openingHours: place.opening_hours,
                },
                essentialDetails: {
                    rating: place.rating,
                    priceLevel: place.price_level,
                    openNow: place.opening_hours?.open_now,
                    categories: place.types?.slice(0, 3), // First 3 categories
                },
                externalLinks: {
                    maps: `https://www.google.com/maps/place/${encodeURIComponent(place.name)}/@${
                        place.geometry.location.lat
                    },${place.geometry.location.lng}`,
                    website: place.website,
                },
                metadata: {
                    provider: "Google Places",
                    confidence: 0.9,
                    timestamp: new Date().toISOString(),
                },
            };

            results.push(card);
        });
    }

    return results;
}

/**
 * Translate Google Directions Response to StandardizedCards
 */
function translateMockGoogleDirections(directionsResponse) {
    const results = [];

    if (directionsResponse.routes) {
        directionsResponse.routes.forEach((route, index) => {
            const leg = route.legs[0]; // Assuming single leg for simplicity

            const card = {
                id: `transit-${Date.now()}-${index}`,
                type: "transit",
                title: `${leg.start_address} → ${leg.end_address}`,
                subtitle: route.summary || "Transit Route",
                price: route.fare
                    ? {
                          amount: route.fare.value,
                          currency: route.fare.currency,
                      }
                    : undefined,
                duration: leg.duration.value / 60, // Convert seconds to minutes
                location: {
                    from: {
                        address: leg.start_address,
                        lat: leg.start_location.lat,
                        lng: leg.start_location.lng,
                    },
                    to: {
                        address: leg.end_address,
                        lat: leg.end_location.lat,
                        lng: leg.end_location.lng,
                    },
                },
                details: {
                    distance: leg.distance,
                    duration: leg.duration,
                    durationInTraffic: leg.duration_in_traffic,
                    steps: leg.steps,
                    fare: route.fare,
                    polyline: route.overview_polyline,
                },
                essentialDetails: {
                    distance: leg.distance.text,
                    duration: leg.duration.text,
                    trafficDuration: leg.duration_in_traffic?.text,
                    transitMode: leg.steps?.[0]?.travel_mode,
                    fare: route.fare?.text,
                },
                externalLinks: {
                    directions: `https://www.google.com/maps/dir/${encodeURIComponent(
                        leg.start_address,
                    )}/${encodeURIComponent(leg.end_address)}`,
                },
                metadata: {
                    provider: "Google Directions",
                    confidence: 0.88,
                    timestamp: new Date().toISOString(),
                },
            };

            results.push(card);
        });
    }

    return results;
}

/**
 * Test Flight Cards from SerpAPI Translation
 */
export function testFlightCards() {
    logger.info("\n🛫 Testing Flight Cards from SerpAPI Translation");

    const mockResponse = mockData.mockSerpAPIFlightResponse;
    const flightCards = translateMockSerpAPIFlights(mockResponse);

    logger.info(`Generated ${flightCards.length} flight cards for validation`);

    const validationResults = flightCards.map((card, index) => {
        const validation = validateStandardizedCard(card, "flight");

        logger.info(`Flight Card ${index + 1}:`, {
            id: card.id,
            title: card.title,
            isValid: validation.isValid,
            errors: validation.errors.length,
            criticalErrors: validation.summary.critical,
        });

        if (!validation.isValid) {
            logger.info(`  Validation Report:`, getValidationReport(validation));
        }

        return validation;
    });

    const testResult = new CardTypeTestResult("flight", "SerpAPI", flightCards, validationResults);

    logger.info("Flight Cards Test Summary:", testResult.summary);
    logger.info("Recommendations:", testResult.getRecommendations());

    return testResult;
}

/**
 * Test Place Cards from Google Maps Translation
 */
export function testPlaceCards() {
    logger.info("\n📍 Testing Place Cards from Google Maps Translation");

    const mockResponse = mockData.mockGooglePlacesResponse;
    const placeCards = translateMockGooglePlaces(mockResponse);

    logger.info(`Generated ${placeCards.length} place cards for validation`);

    const validationResults = placeCards.map((card, index) => {
        const validation = validateStandardizedCard(card, "place");

        logger.info(`Place Card ${index + 1}:`, {
            id: card.id,
            title: card.title,
            isValid: validation.isValid,
            errors: validation.errors.length,
            criticalErrors: validation.summary.critical,
        });

        if (!validation.isValid) {
            logger.info(`  Validation Report:`, getValidationReport(validation));
        }

        return validation;
    });

    const testResult = new CardTypeTestResult(
        "place",
        "Google Places",
        placeCards,
        validationResults,
    );

    logger.info("Place Cards Test Summary:", testResult.summary);
    logger.info("Recommendations:", testResult.getRecommendations());

    return testResult;
}

/**
 * Test Transit Cards from Google Directions Translation
 */
export function testTransitCards() {
    logger.info("\n🚌 Testing Transit Cards from Google Directions Translation");

    const mockResponse = mockData.mockGoogleDirectionsResponse;
    const transitCards = translateMockGoogleDirections(mockResponse);

    logger.info(`Generated ${transitCards.length} transit cards for validation`);

    const validationResults = transitCards.map((card, index) => {
        const validation = validateStandardizedCard(card, "transit");

        logger.info(`Transit Card ${index + 1}:`, {
            id: card.id,
            title: card.title,
            isValid: validation.isValid,
            errors: validation.errors.length,
            criticalErrors: validation.summary.critical,
        });

        if (!validation.isValid) {
            logger.info(`  Validation Report:`, getValidationReport(validation));
        }

        return validation;
    });

    const testResult = new CardTypeTestResult(
        "transit",
        "Google Directions",
        transitCards,
        validationResults,
    );

    logger.info("Transit Cards Test Summary:", testResult.summary);
    logger.info("Recommendations:", testResult.getRecommendations());

    return testResult;
}

/**
 * Run All Card Type Tests
 */
export function runAllCardTypeTests() {
    logger.info("\n🧪 RUNNING ALL CARD TYPE VALIDATION TESTS");
    logger.info("================================================");

    const results = {
        flight: testFlightCards(),
        place: testPlaceCards(),
        transit: testTransitCards(),
    };

    // Overall Summary
    logger.info("\n📊 OVERALL CARD TYPE TEST RESULTS");
    logger.info("===================================");

    const overallSummary = {
        totalCardTypes: 3,
        passedCardTypes: 0,
        totalCards: 0,
        validCards: 0,
        totalCriticalErrors: 0,
        totalWarnings: 0,
    };

    Object.values(results).forEach((result) => {
        if (result.summary.passed) overallSummary.passedCardTypes++;
        overallSummary.totalCards += result.summary.totalCards;
        overallSummary.validCards += result.summary.validCards;
        overallSummary.totalCriticalErrors += result.summary.criticalErrors;
        overallSummary.totalWarnings += result.summary.warnings;
    });

    logger.info("Overall Summary:", {
        cardTypesPassed: `${overallSummary.passedCardTypes}/${overallSummary.totalCardTypes}`,
        overallComplianceRate:
            overallSummary.totalCards > 0
                ? `${Math.round((overallSummary.validCards / overallSummary.totalCards) * 100)}%`
                : "0%",
        totalCards: overallSummary.totalCards,
        validCards: overallSummary.validCards,
        criticalErrors: overallSummary.totalCriticalErrors,
        warnings: overallSummary.totalWarnings,
    });

    const allPassed =
        overallSummary.passedCardTypes === overallSummary.totalCardTypes &&
        overallSummary.totalCriticalErrors === 0;

    if (allPassed) {
        logger.info("🎉 ALL CARD TYPES PASSED VALIDATION! Schema compliance verified.");
    } else {
        logger.info("⚠️  Some card types failed validation. Review individual results above.");
    }

    return {
        success: allPassed,
        results,
        overallSummary,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Quick Card Type Compliance Check
 */
export function quickCardTypeCheck() {
    logger.info("\n⚡ QUICK CARD TYPE COMPLIANCE CHECK");

    const flightCard = translateMockSerpAPIFlights(mockData.mockSerpAPIFlightResponse)[0];
    const placeCard = translateMockGooglePlaces(mockData.mockGooglePlacesResponse)[0];
    const transitCard = translateMockGoogleDirections(mockData.mockGoogleDirectionsResponse)[0];

    const checks = {
        flight: validateStandardizedCard(flightCard, "flight"),
        place: validateStandardizedCard(placeCard, "place"),
        transit: validateStandardizedCard(transitCard, "transit"),
    };

    const summary = {
        flight: checks.flight.isValid,
        place: checks.place.isValid,
        transit: checks.transit.isValid,
        allValid: Object.values(checks).every((check) => check.isValid),
    };

    logger.info("Quick Check Results:", summary);

    return {
        success: summary.allValid,
        summary,
        detailedResults: checks,
    };
}

export default {
    testFlightCards,
    testPlaceCards,
    testTransitCards,
    runAllCardTypeTests,
    quickCardTypeCheck,
    CardTypeTestResult,
};
