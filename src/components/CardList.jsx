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
            // Future: Add to user's itinerary
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
                        fontSize: "0.9rem",
                        color: "#666",
                        marginBottom: "1rem",
                        fontWeight: "500",
                    }}
                >
                    Found {cards.length} result{cards.length !== 1 ? "s" : ""}:
                </div>
                {cards.map((card, index) => {
                    // Create a stable unique key by combining card properties
                    const cardFingerprint = card.title
                        ? `${card.title}-${card.subtitle || ""}-${card.price?.amount || ""}`
                        : "untitled";
                    const stableKey = card.id
                        ? `card-${card.id}-${index}`
                        : `card-${index}-${cardFingerprint
                              .replace(/[^a-zA-Z0-9]/g, "")
                              .substring(0, 20)}`;

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
