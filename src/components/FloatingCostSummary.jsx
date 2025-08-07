import React, { useState, useEffect } from "react";
import "./floating-cost-summary.css";

export function FloatingCostSummary({ cards = [] }) {
    const [isVisible, setIsVisible] = useState(false);
    const [costBreakdown, setCostBreakdown] = useState({
        flights: { count: 0, total: 0 },
        hotels: { count: 0, total: 0 },
        activities: { count: 0, total: 0 },
        rentalCars: { count: 0, total: 0 },
        total: 0,
        currency: "USD",
    });

    useEffect(() => {
        if (!cards.length) {
            setIsVisible(false);
            return;
        }

        // Categorize cards first
        const categories = {
            outboundFlights: [],
            returnFlights: [],
            hotels: [],
            activities: [],
            rentalCars: [],
        };

        cards.forEach((card) => {
            if (card.price?.amount) {
                const amount = parseFloat(card.price.amount);
                if (amount > 0) {
                    if (card.type === "flight") {
                        // Determine if it's outbound or return flight
                        const title = card.title || "";
                        const isReturn =
                            title.includes("→") &&
                            (title.includes("SFO → ORD") ||
                                title.includes("LAX → ORD") ||
                                title.includes("LIS → CDG") ||
                                title.includes("LIS → ORD") ||
                                title.match(
                                    /[A-Z]{3}\s*→\s*(ORD|JFK|LAX|CDG|LHR|BOS|SEA|DEN|ATL|MIA)/,
                                )); // Common home airports

                        if (isReturn) {
                            categories.returnFlights.push({ ...card, amount });
                        } else {
                            categories.outboundFlights.push({ ...card, amount });
                        }
                    } else if (
                        card.type === "hotel" ||
                        card.additionalInfo?.hotelId ||
                        card.details?.hotelId ||
                        (card.title &&
                            (card.title.toLowerCase().includes("hotel") ||
                                card.title.toLowerCase().includes("resort")))
                    ) {
                        categories.hotels.push({ ...card, amount });
                    } else if (
                        card.type === "activity" ||
                        (card.title &&
                            (card.title.toLowerCase().includes("activity") ||
                                card.title.toLowerCase().includes("tour") ||
                                card.title.toLowerCase().includes("attraction")))
                    ) {
                        categories.activities.push({ ...card, amount });
                    } else if (
                        card.type === "rental_car" ||
                        (card.title &&
                            (card.title.toLowerCase().includes("car rental") ||
                                card.title.toLowerCase().includes("vehicle")))
                    ) {
                        categories.rentalCars.push({ ...card, amount });
                    }
                }
            }
        });

        // Calculate realistic trip cost by picking cheapest from each category
        const breakdown = {
            flights: { count: 0, total: 0, cheapest: null },
            hotels: { count: 0, total: 0, cheapest: null },
            activities: { count: 0, total: 0, cheapest: null },
            rentalCars: { count: 0, total: 0, cheapest: null },
            total: 0,
            currency: "USD",
        };

        // Get cheapest outbound flight
        if (categories.outboundFlights.length > 0) {
            const cheapestOutbound = categories.outboundFlights.reduce((min, flight) =>
                flight.amount < min.amount ? flight : min,
            );
            breakdown.flights.total += cheapestOutbound.amount;
            breakdown.flights.count++;
            breakdown.flights.cheapest = cheapestOutbound;
            breakdown.currency = cheapestOutbound.price.currency || "USD";
        }

        // Get cheapest return flight
        if (categories.returnFlights.length > 0) {
            const cheapestReturn = categories.returnFlights.reduce((min, flight) =>
                flight.amount < min.amount ? flight : min,
            );
            breakdown.flights.total += cheapestReturn.amount;
            breakdown.flights.count++;
            breakdown.currency = cheapestReturn.price.currency || "USD";
        }

        // Get cheapest hotel
        if (categories.hotels.length > 0) {
            const cheapestHotel = categories.hotels.reduce((min, hotel) =>
                hotel.amount < min.amount ? hotel : min,
            );
            breakdown.hotels.total = cheapestHotel.amount;
            breakdown.hotels.count = 1;
            breakdown.hotels.cheapest = cheapestHotel;
            breakdown.currency = cheapestHotel.price.currency || "USD";
        }

        // Get cheapest activity (optional)
        if (categories.activities.length > 0) {
            const cheapestActivity = categories.activities.reduce((min, activity) =>
                activity.amount < min.amount ? activity : min,
            );
            breakdown.activities.total = cheapestActivity.amount;
            breakdown.activities.count = 1;
            breakdown.activities.cheapest = cheapestActivity;
            breakdown.currency = cheapestActivity.price.currency || "USD";
        }

        // Get cheapest car rental (optional)
        if (categories.rentalCars.length > 0) {
            const cheapestCar = categories.rentalCars.reduce((min, car) =>
                car.amount < min.amount ? car : min,
            );
            breakdown.rentalCars.total = cheapestCar.amount;
            breakdown.rentalCars.count = 1;
            breakdown.rentalCars.cheapest = cheapestCar;
            breakdown.currency = cheapestCar.price.currency || "USD";
        }

        // Calculate total realistic trip cost
        breakdown.total =
            breakdown.flights.total +
            breakdown.hotels.total +
            breakdown.activities.total +
            breakdown.rentalCars.total;

        console.log("FloatingCostSummary - Cards received:", cards.length);
        console.log("FloatingCostSummary - Breakdown calculated:", breakdown);

        setCostBreakdown(breakdown);
        // Show if we have any cards (even without prices) or if total > 0
        setIsVisible(cards.length > 0 || breakdown.total > 0);
    }, [cards]);

    const formatCurrency = (amount, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
        }).format(amount);
    };

    if (!isVisible) return null;

    return (
        <div className="floating-cost-summary">
            <div className="cost-summary-minimized">
                <div className="cost-summary-icon">$</div>
                <div className="cost-summary-total">
                    {costBreakdown.total > 0
                        ? formatCurrency(costBreakdown.total, costBreakdown.currency)
                        : "No pricing"}
                </div>
            </div>

            <div className="cost-summary-expanded">
                <div className="cost-summary-header">
                    <h3>Best Price Trip Estimate</h3>
                    <div className="cost-summary-total-large">
                        {costBreakdown.total > 0
                            ? formatCurrency(costBreakdown.total, costBreakdown.currency)
                            : "No pricing available"}
                    </div>
                </div>

                <div className="cost-breakdown">
                    {costBreakdown.flights.count > 0 && (
                        <div className="cost-item">
                            <div className="cost-item-label">
                                <span className="cost-item-icon">Flight</span>
                                <span>Flights (Best Price)</span>
                                <span className="cost-item-count">
                                    ({costBreakdown.flights.count})
                                </span>
                            </div>
                            <div className="cost-item-amount">
                                {formatCurrency(
                                    costBreakdown.flights.total,
                                    costBreakdown.currency,
                                )}
                            </div>
                        </div>
                    )}

                    {costBreakdown.hotels.count > 0 && (
                        <div className="cost-item">
                            <div className="cost-item-label">
                                <span className="cost-item-icon">Hotel</span>
                                <span>Hotels (Best Price)</span>
                                <span className="cost-item-count">
                                    ({costBreakdown.hotels.count})
                                </span>
                            </div>
                            <div className="cost-item-amount">
                                {formatCurrency(costBreakdown.hotels.total, costBreakdown.currency)}
                            </div>
                        </div>
                    )}

                    {costBreakdown.activities.count > 0 && (
                        <div className="cost-item">
                            <div className="cost-item-label">
                                <span className="cost-item-icon">Tour</span>
                                <span>Activities (Best Price)</span>
                                <span className="cost-item-count">
                                    ({costBreakdown.activities.count})
                                </span>
                            </div>
                            <div className="cost-item-amount">
                                {formatCurrency(
                                    costBreakdown.activities.total,
                                    costBreakdown.currency,
                                )}
                            </div>
                        </div>
                    )}

                    {costBreakdown.rentalCars.count > 0 && (
                        <div className="cost-item">
                            <div className="cost-item-label">
                                <span className="cost-item-icon">Car</span>
                                <span>Car Rentals (Best Price)</span>
                                <span className="cost-item-count">
                                    ({costBreakdown.rentalCars.count})
                                </span>
                            </div>
                            <div className="cost-item-amount">
                                {formatCurrency(
                                    costBreakdown.rentalCars.total,
                                    costBreakdown.currency,
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="cost-summary-footer">
                    <div className="cost-note">
                        * Estimated trip cost using cheapest options from each category
                    </div>
                </div>
            </div>
        </div>
    );
}
