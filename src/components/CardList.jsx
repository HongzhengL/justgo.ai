import { useState } from "react";
import { Card } from "./Card.jsx";
import { InfoModal } from "./InfoModal.jsx";
import logger from "../utils/logger.js";

export function CardList({
    cards = [],
    onGoToWebsite,
    onMoreInfo,
    onAddToItinerary,
    addToItineraryText,
    addToItineraryIcon,
}) {
    const [modalState, setModalState] = useState({
        isOpen: false,
        cardData: null,
    });

    if (!cards.length) {
        return null;
    }

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

    return (
        <>
            <div
                style={{
                    margin: "1rem 0",
                    padding: "1rem",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #e9ecef",
                }}
            >
                <div
                    style={{
                        fontSize: "1rem",
                        color: "#333",
                        marginBottom: "1rem",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                    }}
                >
                    <span style={{ fontSize: "1.2rem" }}>✈️</span>
                    Search Results ({cards.length} result{cards.length !== 1 ? "s" : ""})
                </div>
                {cards.map((card, index) => {
                    // Create a stable unique key prioritizing card.id, avoiding index when possible
                    let stableKey;

                    if (card.id) {
                        // Use card ID as primary key if available - no index needed
                        stableKey = `card-${card.id}`;
                    } else {
                        // Fallback: create fingerprint from card properties
                        const cardFingerprint = card.title
                            ? `${card.title}-${card.subtitle || ""}-${card.price?.amount || ""}`
                            : "untitled";
                        stableKey = `card-${index}-${cardFingerprint
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
                            addToItineraryText={addToItineraryText}
                            addToItineraryIcon={addToItineraryIcon}
                        />
                    );
                })}
            </div>

            <InfoModal
                isOpen={modalState.isOpen}
                onClose={handleCloseModal}
                cardData={modalState.cardData}
            />
        </>
    );
}
