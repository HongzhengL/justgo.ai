import React, { useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import { getItineraries, removeFromItinerary } from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import { CardList } from "../components/CardList.jsx";
import { InfoModal } from "../components/InfoModal.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import useInfoModal from "../hooks/useInfoModal.js";
import logger from "../utils/logger.js";

export function MyItineraryPage() {
    const { data: user } = useAuth();
    const { data: itineraries, isLoading, error } = useQuery(getItineraries);
    const removeFromItineraryFn = useAction(removeFromItinerary);

    // Hook for modal management
    const { openModal, modalProps } = useInfoModal();

    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [itemToRemove, setItemToRemove] = useState(null);

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
                    padding: "2rem",
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                <div style={{ marginBottom: "2rem" }}>
                    <h1
                        style={{
                            fontSize: "2rem",
                            fontWeight: "bold",
                            color: "#2c3e50",
                            marginBottom: "0.5rem",
                        }}
                    >
                        📋 My Itinerary
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
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎒</div>
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
                            💬 Go to Chat
                        </Link>
                    </div>
                ) : (
                    <>
                        <CardList
                            cards={allCards}
                            onGoToWebsite={handleGoToWebsite}
                            onMoreInfo={handleMoreInfo}
                            onAddToItinerary={handleRemoveFromItinerary}
                            addToItineraryText="Remove from Itinerary"
                            addToItineraryIcon="🗑️"
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
                                💰 Trip Summary
                            </h3>
                            <p
                                style={{
                                    color: "#0c5460",
                                    margin: 0,
                                    fontSize: "1rem",
                                }}
                            >
                                Total estimated cost:{" "}
                                {allCards
                                    .reduce((total, card) => {
                                        return total + (card.price?.amount || 0);
                                    }, 0)
                                    .toLocaleString("en-US", {
                                        style: "currency",
                                        currency: allCards[0]?.price?.currency || "USD",
                                    })}
                            </p>
                        </div>
                    </>
                )}

                {/* Remove Confirmation Dialog */}
                {showRemoveConfirm && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "2rem",
                                borderRadius: "8px",
                                maxWidth: "400px",
                                margin: "1rem",
                            }}
                        >
                            <h3
                                style={{
                                    marginBottom: "1rem",
                                    color: "#dc3545",
                                }}
                            >
                                🗑️ Remove Item
                            </h3>
                            <p
                                style={{
                                    marginBottom: "1.5rem",
                                    color: "#495057",
                                }}
                            >
                                Are you sure you want to remove &quot;{itemToRemove?.title}&quot;
                                from your itinerary?
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    gap: "1rem",
                                    justifyContent: "flex-end",
                                }}
                            >
                                <button
                                    onClick={cancelRemove}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "#6c757d",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRemove}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "#dc3545",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Modal */}
                {modalProps.isOpen && modalProps.cardData && (
                    <InfoModal
                        {...modalProps}
                        onGoToWebsite={handleGoToWebsite}
                        onAddToItinerary={handleRemoveFromItinerary}
                        addToItineraryText="Remove from Itinerary"
                        addToItineraryIcon="🗑️"
                    />
                )}
            </div>
        </AppLayout>
    );
}
