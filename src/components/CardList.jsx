import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";
import "swiper/css/navigation";
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
            <div style={{ margin: "1rem 0" }}>
                <div
                    style={{
                        fontSize: "0.9rem",
                        color: "#666",
                        marginBottom: "0.5rem",
                        fontWeight: "500",
                    }}
                >
                    Found {cards.length} result{cards.length !== 1 ? "s" : ""}:
                </div>

                <Swiper
                    modules={[EffectCards, Navigation]}
                    effect="cards"
                    grabCursor={true}
                    navigation
                    className="card-swiper"
                >
                    {cards.map((card, index) => {
                        const cardFingerprint = card.title
                            ? `${card.title}-${card.subtitle || ""}-${card.price?.amount || ""}`
                            : "untitled";
                        const stableKey = card.id
                            ? `card-${card.id}-${index}`
                            : `card-${index}-${cardFingerprint.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)}`;
                        return (
                            <SwiperSlide style={{ width: "280px" }} key={stableKey}>
                                <Card
                                    cardData={card}
                                    onGoToWebsite={handleGoToWebsite}
                                    onMoreInfo={handleMoreInfo}
                                    onAddToItinerary={handleAddToItinerary}
                                    addToItineraryText={addToItineraryText}
                                    addToItineraryIcon={addToItineraryIcon}
                                />
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>

            <InfoModal
                isOpen={modalState.isOpen}
                onClose={handleCloseModal}
                cardData={modalState.cardData}
            />
        </>
    );
}
