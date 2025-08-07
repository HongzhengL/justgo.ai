import { useState } from "react";
import { Card } from "./Card.jsx";
import { InfoModal } from "./InfoModal.jsx";
import logger from "../utils/logger.js";
import "./cardlist.css";
import "./organized-cardlist.css";

export function OrganizedCardList({
    cards = [],
    onGoToWebsite,
    onMoreInfo,
    onAddToItinerary,
    onBookFlight,
    onBookHotel,
    addToItineraryText,
    addToItineraryIcon,
}) {
    const [modalState, setModalState] = useState({
        isOpen: false,
        cardData: null,
    });

    const [collapsedSections, setCollapsedSections] = useState({
        outbound: false,
        return: false,
        hotels: false,
        activities: false,
        rentalCars: false,
    });

    if (!cards.length) {
        return null;
    }

    // Organize cards by type and flight direction
    const organizedCards = {
        outboundFlights: [],
        returnFlights: [],
        hotels: [],
        activities: [],
        rentalCars: [],
        other: [],
    };

    // Collect all flights and analyze them
    const flights = cards.filter((card) => card.type === "flight");

    if (flights.length > 0) {
        console.log(
            "Analyzing flights:",
            flights.map((f) => f.title),
        );

        // Extract flight routes
        const routes = flights
            .map((flight) => {
                const title = flight.title || "";
                if (title.includes("→")) {
                    const [origin, destination] = title.split("→").map((s) => s.trim());
                    return { flight, origin, destination, title };
                }
                return { flight, origin: "", destination: "", title };
            })
            .filter((r) => r.origin && r.destination);

        if (routes.length >= 2) {
            // For multi-city trips, use smart detection
            // Group by origin airport - the most common origin is likely the home base
            const originGroups = {};
            routes.forEach((route) => {
                if (!originGroups[route.origin]) {
                    originGroups[route.origin] = [];
                }
                originGroups[route.origin].push(route);
            });

            // Find the airport that appears most as an origin OR destination
            const airportCounts = {};
            routes.forEach((route) => {
                airportCounts[route.origin] = (airportCounts[route.origin] || 0) + 1;
                airportCounts[route.destination] = (airportCounts[route.destination] || 0) + 1;
            });

            const homeBase = Object.keys(airportCounts).reduce((a, b) =>
                airportCounts[a] > airportCounts[b] ? a : b,
            );

            console.log("Smart flight analysis:", {
                routes: routes.map((r) => r.title),
                airportCounts,
                homeBase,
            });

            // Categorize flights
            routes.forEach((route) => {
                // A flight is a return flight if it goes TO the home base
                const isReturn = route.destination === homeBase && route.origin !== homeBase;

                console.log(`Flight ${route.title}: homeBase=${homeBase}, isReturn=${isReturn}`);

                if (isReturn) {
                    organizedCards.returnFlights.push(route.flight);
                } else {
                    organizedCards.outboundFlights.push(route.flight);
                }
            });

            // Add any flights without arrows to outbound
            flights.forEach((flight) => {
                if (!flight.title || !flight.title.includes("→")) {
                    organizedCards.outboundFlights.push(flight);
                }
            });
        } else {
            // If we have fewer than 2 flights with routes, just put them in outbound
            flights.forEach((flight) => {
                organizedCards.outboundFlights.push(flight);
            });
        }
    }

    cards.forEach((card) => {
        // Debug logging
        console.log("Card type:", card.type, "Title:", card.title);

        // Skip flights as they're already processed above
        if (card.type === "flight") {
            return;
        } else if (
            card.type === "hotel" ||
            card.additionalInfo?.hotelId ||
            card.details?.hotelId ||
            (card.title &&
                (card.title.toLowerCase().includes("hotel") ||
                    card.title.toLowerCase().includes("resort") ||
                    card.title.toLowerCase().includes("inn") ||
                    card.title.toLowerCase().includes("suites")))
        ) {
            organizedCards.hotels.push(card);
        } else if (
            card.type === "activity" ||
            (card.title &&
                (card.title.toLowerCase().includes("activity") ||
                    card.title.toLowerCase().includes("tour") ||
                    card.title.toLowerCase().includes("attraction")))
        ) {
            organizedCards.activities.push(card);
        } else if (
            card.type === "rental_car" ||
            (card.title &&
                (card.title.toLowerCase().includes("car rental") ||
                    card.title.toLowerCase().includes("vehicle") ||
                    card.title.toLowerCase().includes("car hire")))
        ) {
            organizedCards.rentalCars.push(card);
        } else {
            organizedCards.other.push(card);
        }
    });

    const handleGoToWebsite = (url) => {
        if (onGoToWebsite) {
            onGoToWebsite(url);
        } else {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const handleMoreInfo = (cardData) => {
        if (onMoreInfo) {
            onMoreInfo(cardData);
        } else {
            setModalState({ isOpen: true, cardData });
        }
    };

    const handleCloseModal = () => {
        setModalState({ isOpen: false, cardData: null });
    };

    const handleAddToItinerary = (cardData) => {
        if (onAddToItinerary) {
            onAddToItinerary(cardData);
        } else {
            logger.info("Add to itinerary:", cardData);
        }
    };

    const toggleSection = (section) => {
        setCollapsedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const renderSection = (title, cards, sectionKey, color = "#007bff") => {
        if (cards.length === 0) return null;

        const isCollapsed = collapsedSections[sectionKey];

        return (
            <div className="organized-section">
                <div
                    className="section-header"
                    onClick={() => toggleSection(sectionKey)}
                    style={{ borderLeftColor: color }}
                >
                    <div className="section-title">
                        <span className="section-name">{title}</span>
                        <span className="section-count">
                            {cards.length} option{cards.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <button className="collapse-button">{isCollapsed ? "Show" : "Hide"}</button>
                </div>

                {!isCollapsed && (
                    <div className="section-content">
                        {cards.map((card, index) => {
                            let stableKey;
                            if (card.id) {
                                stableKey = `${sectionKey}-${card.id}`;
                            } else {
                                const cardFingerprint = card.title
                                    ? `${card.title}-${card.subtitle || ""}-${card.price?.amount || ""}`
                                    : "untitled";
                                stableKey = `${sectionKey}-${index}-${cardFingerprint
                                    .replace(/[^a-zA-Z0-9]/g, "")
                                    .substring(0, 20)}`;
                            }

                            return (
                                <Card
                                    key={stableKey}
                                    cardData={card}
                                    onGoToWebsite={handleGoToWebsite}
                                    onMoreInfo={handleMoreInfo}
                                    onAddToItinerary={handleAddToItinerary}
                                    onBookFlight={onBookFlight}
                                    onBookHotel={onBookHotel}
                                    addToItineraryText={addToItineraryText}
                                    addToItineraryIcon={addToItineraryIcon}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Get flight route info for better headers
    const getFlightRouteTitle = (flights) => {
        if (flights.length === 0) return "";
        const firstFlight = flights[0];
        if (firstFlight.title && firstFlight.title.includes("→")) {
            return firstFlight.title
                .split("→")
                .map((part) => part.trim())
                .join(" → ");
        }
        return "";
    };

    const outboundRoute = getFlightRouteTitle(organizedCards.outboundFlights);
    const returnRoute = getFlightRouteTitle(organizedCards.returnFlights);

    return (
        <>
            <div className="organized-card-list">
                <div className="organized-header">
                    <h2 className="results-title">
                        Travel Options
                        <span className="total-count">{cards.length} total results</span>
                    </h2>
                </div>

                {/* Outbound Flights */}
                {renderSection(
                    outboundRoute || "Outbound Flights",
                    organizedCards.outboundFlights,
                    "outbound",
                    "#3b82f6",
                )}

                {/* Return Flights */}
                {renderSection(
                    returnRoute || "Return Flights",
                    organizedCards.returnFlights,
                    "return",
                    "#8b5cf6",
                )}

                {/* Hotels */}
                {renderSection("Hotels", organizedCards.hotels, "hotels", "#f59e0b")}

                {/* Activities */}
                {renderSection("Activities", organizedCards.activities, "activities", "#10b981")}

                {/* Rental Cars */}
                {renderSection("Car Rentals", organizedCards.rentalCars, "rentalCars", "#f97316")}

                {/* Other Results */}
                {renderSection("Other", organizedCards.other, "other", "#6b7280")}
            </div>

            <InfoModal
                isOpen={modalState.isOpen}
                onClose={handleCloseModal}
                cardData={modalState.cardData}
                onBookFlight={onBookFlight}
                onBookHotel={onBookHotel}
            />
        </>
    );
}
