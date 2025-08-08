import React, { useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import { getItineraries, removeFromItinerary } from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import { OrganizedCardList } from "../components/OrganizedCardList.jsx";
import { InfoModal } from "../components/InfoModal.jsx";
import { BookingOptionsModal } from "../components/BookingOptionsModal.jsx";
import { HotelBookingModal } from "../components/HotelBookingModal.jsx";
import { ConfirmationModal } from "../components/ConfirmationModal.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import useInfoModal from "../hooks/useInfoModal.js";
import logger from "../utils/logger.js";
import { FloatingCostSummary } from "../components/FloatingCostSummary.jsx";

export function MyItineraryPage() {
    const { data: user } = useAuth();
    const { data: itineraries, isLoading, error } = useQuery(getItineraries);
    const removeFromItineraryFn = useAction(removeFromItinerary);

    // Hook for modal management
    const { openModal, modalProps } = useInfoModal();

    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [itemToRemove, setItemToRemove] = useState(null);

    // Booking modal states
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedBookingToken, setSelectedBookingToken] = useState(null);
    const [selectedSearchContext, setSelectedSearchContext] = useState(null);
    const [selectedFlightInfo, setSelectedFlightInfo] = useState(null);

    // Hotel booking modal states
    const [isHotelBookingModalOpen, setIsHotelBookingModalOpen] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [selectedHotelOffer, setSelectedHotelOffer] = useState(null);
    // Convert itinerary items to card format
    const allCards =
        itineraries?.flatMap(
            (itinerary) =>
                itinerary.items
                    ?.map((item) => {
                        try {
                            const cardData = JSON.parse(item.cardData);
                            return {
                                ...cardData,
                                itineraryItemId: item.id,
                                itineraryId: itinerary.id,
                                itineraryTitle: itinerary.title,
                            };
                        } catch (e) {
                            logger.error("Error parsing card data:", e);
                            return null;
                        }
                    })
                    .filter(Boolean) || [],
        ) || [];

    const handleGoToWebsite = (url) => {
        if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const handleMoreInfo = openModal;

    const handleRemoveFromItinerary = (cardData) => {
        setItemToRemove(cardData);
        setShowRemoveConfirm(true);
    };

    const confirmRemove = async () => {
        if (itemToRemove?.itineraryItemId) {
            try {
                await removeFromItineraryFn({
                    itemId: itemToRemove.itineraryItemId,
                });
                setShowRemoveConfirm(false);
                setItemToRemove(null);
            } catch (error) {
                logger.error("Error removing item:", error);
                alert("Failed to remove item from itinerary");
            }
        }
    };

    const cancelRemove = () => {
        setShowRemoveConfirm(false);
        setItemToRemove(null);
    };

    const handleBookFlight = (bookingToken, searchContext, flightInfo) => {
        setSelectedBookingToken(bookingToken);
        setSelectedSearchContext(searchContext);
        setSelectedFlightInfo(flightInfo);
        setIsBookingModalOpen(true);
    };

    const handleBookHotel = (hotel, offer) => {
        logger.info("Hotel booking initiated:", { hotel: hotel.title, offer });
        setSelectedHotel(hotel);
        setSelectedHotelOffer(offer);
        setIsHotelBookingModalOpen(true);
    };
    if (!user) {
        return (
            <AppLayout>
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    <div>Please log in to view your itinerary.</div>
                    <Link to="/login">Go to Login</Link>
                </div>
            </AppLayout>
        );
    }

    if (isLoading) {
        return (
            <AppLayout>
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    <div>Loading your itinerary...</div>
                </div>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout>
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    <div>Error loading itinerary: {error.message}</div>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div
                style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                <div style={{ padding: "2rem 2rem 0 2rem", marginBottom: "2rem" }}>
                    <h1
                        style={{
                            fontSize: "2rem",
                            fontWeight: "bold",
                            color: "#2c3e50",
                            marginBottom: "0.5rem",
                        }}
                    >
                        My Itinerary
                    </h1>
                    <p
                        style={{
                            color: "#666",
                            fontSize: "1rem",
                            margin: 0,
                        }}
                    >
                        {allCards.length} saved items
                    </p>
                </div>

                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        minHeight: 1,
                        padding: "0 2rem 2rem 2rem",
                    }}
                >
                    {allCards.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem 2rem",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "8px",
                                border: "1px solid #e9ecef",
                            }}
                        >
                            <div
                                style={{ fontSize: "3rem", marginBottom: "1rem", color: "#6c757d" }}
                            >
                                📋
                            </div>
                            <h2
                                style={{
                                    fontSize: "1.5rem",
                                    color: "#495057",
                                    marginBottom: "1rem",
                                }}
                            >
                                Your itinerary is empty
                            </h2>
                            <p
                                style={{
                                    color: "#6c757d",
                                    marginBottom: "2rem",
                                    fontSize: "1rem",
                                }}
                            >
                                Start planning your trip by searching for flights, places, and
                                activities in the chat.
                            </p>
                            <Link
                                to="/dashboard"
                                style={{
                                    display: "inline-block",
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    textDecoration: "none",
                                    borderRadius: "6px",
                                    fontWeight: "500",
                                    transition: "background-color 0.2s ease",
                                }}
                            >
                                Go to Chat
                            </Link>
                        </div>
                    ) : (
                        <>
                            <OrganizedCardList
                                cards={allCards}
                                onGoToWebsite={handleGoToWebsite}
                                onMoreInfo={handleMoreInfo}
                                onAddToItinerary={handleRemoveFromItinerary}
                                onBookFlight={handleBookFlight}
                                onBookHotel={handleBookHotel}
                                addToItineraryText="Remove from Itinerary"
                                addToItineraryIcon="Remove"
                            />

                            {/* Total Cost Summary */}
                            <div
                                style={{
                                    marginTop: "2rem",
                                    padding: "1.5rem",
                                    backgroundColor: "#e8f4f8",
                                    borderRadius: "8px",
                                    border: "1px solid #bee5eb",
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: "1.25rem",
                                        color: "#0c5460",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    Trip Summary
                                </h3>
                                <p
                                    style={{
                                        color: "#0c5460",
                                        margin: 0,
                                        fontSize: "1rem",
                                    }}
                                >
                                    Total estimated cost:{" "}
                                    {(() => {
                                        // Use same logic as FloatingCostSummary for consistency
                                        const categories = {
                                            outboundFlights: [],
                                            returnFlights: [],
                                            hotels: [],
                                            activities: [],
                                            rentalCars: [],
                                        };

                                        allCards.forEach((card) => {
                                            if (card.price?.amount) {
                                                const amount = parseFloat(card.price.amount);
                                                if (amount > 0) {
                                                    if (card.type === "flight") {
                                                        const title = card.title || "";
                                                        const isReturn =
                                                            title.includes("→") &&
                                                            (title.includes("SFO → ORD") ||
                                                                title.includes("LAX → ORD") ||
                                                                title.includes("LIS → CDG") ||
                                                                title.includes("LIS → ORD") ||
                                                                title.match(
                                                                    /[A-Z]{3}\s*→\s*(ORD|JFK|LAX|CDG|LHR|BOS|SEA|DEN|ATL|MIA)/,
                                                                ));

                                                        if (isReturn) {
                                                            categories.returnFlights.push({
                                                                ...card,
                                                                amount,
                                                            });
                                                        } else {
                                                            categories.outboundFlights.push({
                                                                ...card,
                                                                amount,
                                                            });
                                                        }
                                                    } else if (
                                                        card.type === "hotel" ||
                                                        card.additionalInfo?.hotelId ||
                                                        card.details?.hotelId ||
                                                        (card.title &&
                                                            (card.title
                                                                .toLowerCase()
                                                                .includes("hotel") ||
                                                                card.title
                                                                    .toLowerCase()
                                                                    .includes("resort")))
                                                    ) {
                                                        categories.hotels.push({ ...card, amount });
                                                    } else if (
                                                        card.type === "activity" ||
                                                        (card.title &&
                                                            (card.title
                                                                .toLowerCase()
                                                                .includes("activity") ||
                                                                card.title
                                                                    .toLowerCase()
                                                                    .includes("tour") ||
                                                                card.title
                                                                    .toLowerCase()
                                                                    .includes("attraction")))
                                                    ) {
                                                        categories.activities.push({
                                                            ...card,
                                                            amount,
                                                        });
                                                    } else if (
                                                        card.type === "rental_car" ||
                                                        (card.title &&
                                                            (card.title
                                                                .toLowerCase()
                                                                .includes("car rental") ||
                                                                card.title
                                                                    .toLowerCase()
                                                                    .includes("vehicle")))
                                                    ) {
                                                        categories.rentalCars.push({
                                                            ...card,
                                                            amount,
                                                        });
                                                    }
                                                }
                                            }
                                        });

                                        let total = 0;

                                        // Get cheapest outbound flight
                                        if (categories.outboundFlights.length > 0) {
                                            const cheapest = categories.outboundFlights.reduce(
                                                (min, flight) =>
                                                    flight.amount < min.amount ? flight : min,
                                            );
                                            total += cheapest.amount;
                                        }

                                        // Get cheapest return flight
                                        if (categories.returnFlights.length > 0) {
                                            const cheapest = categories.returnFlights.reduce(
                                                (min, flight) =>
                                                    flight.amount < min.amount ? flight : min,
                                            );
                                            total += cheapest.amount;
                                        }

                                        // Get cheapest hotel
                                        if (categories.hotels.length > 0) {
                                            const cheapest = categories.hotels.reduce(
                                                (min, hotel) =>
                                                    hotel.amount < min.amount ? hotel : min,
                                            );
                                            total += cheapest.amount;
                                        }

                                        // Get cheapest activity
                                        if (categories.activities.length > 0) {
                                            const cheapest = categories.activities.reduce(
                                                (min, activity) =>
                                                    activity.amount < min.amount ? activity : min,
                                            );
                                            total += cheapest.amount;
                                        }

                                        // Get cheapest car rental
                                        if (categories.rentalCars.length > 0) {
                                            const cheapest = categories.rentalCars.reduce(
                                                (min, car) => (car.amount < min.amount ? car : min),
                                            );
                                            total += cheapest.amount;
                                        }

                                        return total;
                                    })().toLocaleString("en-US", {
                                        style: "currency",
                                        currency: allCards[0]?.price?.currency || "USD",
                                    })}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Info Modal */}
                {modalProps.isOpen && modalProps.cardData && (
                    <InfoModal
                        {...modalProps}
                        onGoToWebsite={handleGoToWebsite}
                        onAddToItinerary={handleRemoveFromItinerary}
                        onBookFlight={handleBookFlight}
                        onBookHotel={handleBookHotel}
                        addToItineraryText="Remove from Itinerary"
                        addToItineraryIcon="Remove"
                    />
                )}

                <BookingOptionsModal
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    bookingToken={selectedBookingToken}
                    searchContext={selectedSearchContext}
                    flightInfo={selectedFlightInfo}
                />

                <ConfirmationModal
                    isOpen={showRemoveConfirm}
                    title="Remove Item"
                    message={`Are you sure you want to remove "${itemToRemove?.title}" from your itinerary?`}
                    confirmText="Remove"
                    onConfirm={confirmRemove}
                    onCancel={cancelRemove}
                    confirmButtonColor="#dc3545"
                    icon=""
                />

                <BookingOptionsModal
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    bookingToken={selectedBookingToken}
                    searchContext={selectedSearchContext}
                    flightInfo={selectedFlightInfo}
                />

                <HotelBookingModal
                    isOpen={isHotelBookingModalOpen}
                    onClose={() => setIsHotelBookingModalOpen(false)}
                    hotel={selectedHotel}
                    offer={selectedHotelOffer}
                    guestInfo={{
                        firstName: user?.firstName || "",
                        lastName: user?.lastName || "",
                        email: user?.email || "",
                    }}
                    onBookingComplete={() => setIsHotelBookingModalOpen(false)}
                    autoFillEnabled={true}
                />

                {/* Floating Cost Summary */}
                <FloatingCostSummary cards={allCards} />
            </div>
        </AppLayout>
    );
}
