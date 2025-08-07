import { useState } from "react";
import { Card } from "./Card.jsx";
import { InfoModal } from "./InfoModal.jsx";
import logger from "../utils/logger.js";
import "./cardlist.css";

export function CardList({
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
            <div className="card-list-container">
                <div className="card-list-header">
                    <span className="card-list-icon">✈️</span>
                    <span className="card-list-count">
                        Search Results ({cards.length} result{cards.length !== 1 ? "s" : ""})
                    </span>
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
                            onBookFlight={onBookFlight}
                            onBookHotel={onBookHotel}
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
                onBookFlight={onBookFlight}
                onBookHotel={onBookHotel}
            />
        </>
    );
}
