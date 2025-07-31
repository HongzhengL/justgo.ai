import { useEffect } from "react";
import logger from "../utils/logger.js";
import "./infomodal.css";

// Helper function to get appropriate icons for flight features
function getFeatureIcon(feature) {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes("wi-fi") || lowerFeature.includes("wifi")) return "📶";
    if (lowerFeature.includes("power") || lowerFeature.includes("outlet")) return "🔌";
    if (lowerFeature.includes("video") || lowerFeature.includes("entertainment")) return "📺";
    if (lowerFeature.includes("legroom")) return "💺";
    if (lowerFeature.includes("usb")) return "🔌";
    if (lowerFeature.includes("carbon") || lowerFeature.includes("emission")) return "🌱";
    if (lowerFeature.includes("meal") || lowerFeature.includes("food")) return "🍽️";
    if (lowerFeature.includes("baggage") || lowerFeature.includes("bag")) return "🧳";
    return "•";
}

export function InfoModal({
    isOpen,
    onClose,
    cardData,
    onGoToWebsite,
    onAddToItinerary,
    addToItineraryText,
    addToItineraryIcon,
}) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !cardData) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
                padding: "1rem",
            }}
            onClick={handleOverlayClick}
        >
            <div
                style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "2rem",
                    maxWidth: "600px",
                    width: "100%",
                    maxHeight: "80vh",
                    overflowY: "auto",
                    position: "relative",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        background: "none",
                        border: "none",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        color: "#999",
                        padding: "0.5rem",
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    ×
                </button>

                {/* Modal header */}
                <div style={{ marginBottom: "1.5rem", paddingRight: "3rem" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            marginBottom: "0.5rem",
                        }}
                    >
                        {cardData.type === "flight" && cardData.details?.airlineLogo && (
                            <img
                                src={cardData.details.airlineLogo}
                                alt="Airline logo"
                                style={{
                                    width: "32px",
                                    height: "32px",
                                    objectFit: "contain",
                                }}
                                onError={(e) => {
                                    e.target.style.display = "none";
                                }}
                            />
                        )}
                        <h2 style={{ margin: "0", color: "#333" }}>{cardData.title}</h2>
                    </div>
                    <p style={{ margin: 0, color: "#666", fontSize: "1rem" }}>
                        {cardData.subtitle}
                    </p>
                    {cardData.price && (
                        <p
                            style={{
                                margin: "0.5rem 0 0 0",
                                color: "#007bff",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                            }}
                        >
                            {cardData.price.currency} {cardData.price.amount}
                        </p>
                    )}
                </div>

                {/* Search Information */}
                {cardData.type === "flight" && cardData.metadata?.searchContext && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <h3 className="modal-section-title">Search Details</h3>
                        <div className="search-info-grid">
                            <div className="search-info-item">
                                <span className="search-info-label">Passengers:</span>
                                <span className="search-info-value">
                                    👥 {cardData.metadata.searchContext.adults} adult
                                    {cardData.metadata.searchContext.adults > 1 ? "s" : ""}
                                    {cardData.metadata.searchContext.children > 0 && (
                                        <>
                                            , {cardData.metadata.searchContext.children} child
                                            {cardData.metadata.searchContext.children > 1
                                                ? "ren"
                                                : ""}
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="search-info-item">
                                <span className="search-info-label">Travel Class:</span>
                                <span className="search-info-value">
                                    ✈️{" "}
                                    {cardData.metadata.searchContext.travelClass
                                        ?.charAt(0)
                                        .toUpperCase() +
                                        cardData.metadata.searchContext.travelClass?.slice(1)}
                                </span>
                            </div>
                            <div className="search-info-item">
                                <span className="search-info-label">Route:</span>
                                <span className="search-info-value">
                                    🛫 {cardData.metadata.searchContext.departure} →{" "}
                                    {cardData.metadata.searchContext.arrival}
                                </span>
                            </div>
                            <div className="search-info-item">
                                <span className="search-info-label">Dates:</span>
                                <span className="search-info-value">
                                    📅{" "}
                                    {new Date(
                                        cardData.metadata.searchContext.outboundDate,
                                    ).toLocaleDateString()}
                                    {cardData.metadata.searchContext.returnDate && (
                                        <>
                                            {" "}
                                            →{" "}
                                            {new Date(
                                                cardData.metadata.searchContext.returnDate,
                                            ).toLocaleDateString()}
                                        </>
                                    )}
                                </span>
                            </div>
                            {cardData.metadata.searchContext.currency && (
                                <div className="search-info-item">
                                    <span className="search-info-label">Currency:</span>
                                    <span className="search-info-value">
                                        💰 {cardData.metadata.searchContext.currency}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Flight timing details for flight cards */}
                {cardData.type === "flight" && cardData.details?.timingDetails && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <h3
                            style={{
                                margin: "0 0 1rem 0",
                                color: "#333",
                                fontSize: "1.1rem",
                            }}
                        >
                            Flight Schedule
                        </h3>
                        <div
                            style={{
                                backgroundColor: "#f8f9fa",
                                padding: "1rem",
                                borderRadius: "8px",
                                border: "1px solid #e9ecef",
                            }}
                        >
                            <div style={{ display: "grid", gap: "1rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "#6c757d",
                                                marginBottom: "0.25rem",
                                            }}
                                        >
                                            Departure
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "1.1rem",
                                                fontWeight: "bold",
                                                color: "#28a745",
                                            }}
                                        >
                                            {cardData.details.timingDetails.departureTime}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "center", flex: 1, margin: "0 1rem" }}>
                                        <div
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "#6c757d",
                                                marginBottom: "0.25rem",
                                            }}
                                        >
                                            Duration
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#007bff" }}>
                                            {Math.floor(
                                                (cardData.details.timingDetails.totalDuration ||
                                                    0) / 60,
                                            )}
                                            h{" "}
                                            {(cardData.details.timingDetails.totalDuration || 0) %
                                                60}
                                            m
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "#6c757d",
                                                marginBottom: "0.25rem",
                                            }}
                                        >
                                            Arrival
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "1.1rem",
                                                fontWeight: "bold",
                                                color: "#dc3545",
                                            }}
                                        >
                                            {cardData.details.timingDetails.arrivalTime}
                                        </div>
                                    </div>
                                </div>

                                {/* Layover details */}
                                {cardData.details.timingDetails.layoverInfo &&
                                    cardData.details.timingDetails.layoverInfo.length > 0 && (
                                        <div
                                            style={{
                                                borderTop: "1px solid #dee2e6",
                                                paddingTop: "1rem",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: "0.9rem",
                                                    fontWeight: "bold",
                                                    color: "#333",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                Layovers (
                                                {cardData.details.timingDetails.layoverInfo.length})
                                            </div>
                                            {cardData.details.timingDetails.layoverInfo.map(
                                                (layover, index) => (
                                                    <div
                                                        key={`${cardData.id}-layover-${layover.airport}-${layover.duration}-${layover.overnight}`}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            padding: "0.5rem",
                                                            backgroundColor: "white",
                                                            borderRadius: "4px",
                                                            marginBottom:
                                                                index <
                                                                cardData.details.timingDetails
                                                                    .layoverInfo.length -
                                                                    1
                                                                    ? "0.5rem"
                                                                    : "0",
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: "500" }}>
                                                            {layover.airport}
                                                        </span>
                                                        <span style={{ color: "#6c757d" }}>
                                                            {Math.floor(layover.duration / 60)}h{" "}
                                                            {layover.duration % 60}m
                                                            {layover.overnight && (
                                                                <span
                                                                    style={{
                                                                        color: "#ffc107",
                                                                        marginLeft: "0.5rem",
                                                                    }}
                                                                >
                                                                    (overnight)
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}

                                {/* Detailed Flight Segments */}
                                {cardData.details?.segments &&
                                    cardData.details.segments.length > 0 && (
                                        <div
                                            style={{
                                                borderTop: "1px solid #dee2e6",
                                                paddingTop: "1rem",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: "0.9rem",
                                                    fontWeight: "bold",
                                                    color: "#333",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                Flight Segments ({cardData.details.segments.length})
                                            </div>
                                            {cardData.details.segments.map((segment, index) => (
                                                <div
                                                    key={`${cardData.id}-segment-${segment.flight_number || "unknown"}-${segment.departure_airport?.id || "unknown"}-${segment.arrival_airport?.id || "unknown"}`}
                                                    className="segment-card"
                                                >
                                                    {/* Segment Header */}
                                                    <div className="segment-header">
                                                        <div className="segment-flight-info">
                                                            <span className="segment-number">
                                                                Segment {index + 1}
                                                            </span>
                                                            <span className="flight-number">
                                                                {segment.flight_number}
                                                            </span>
                                                            <span className="airline-name">
                                                                {segment.airline}
                                                            </span>
                                                        </div>
                                                        {segment.airline_logo && (
                                                            <img
                                                                src={segment.airline_logo}
                                                                alt={`${segment.airline} logo`}
                                                                className="segment-airline-logo"
                                                                onError={(e) => {
                                                                    e.target.style.display = "none";
                                                                }}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Route and Times */}
                                                    <div className="segment-route">
                                                        <div className="segment-airport">
                                                            <div className="airport-code">
                                                                {segment.departure_airport?.id}
                                                            </div>
                                                            <div className="airport-name">
                                                                {segment.departure_airport?.name}
                                                            </div>
                                                            <div className="airport-time">
                                                                {new Date(
                                                                    segment.departure_airport?.time,
                                                                ).toLocaleTimeString("en-US", {
                                                                    hour: "numeric",
                                                                    minute: "2-digit",
                                                                    hour12: true,
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className="segment-arrow">
                                                            <div className="duration-badge">
                                                                {Math.floor(
                                                                    (segment.duration || 0) / 60,
                                                                )}
                                                                h {(segment.duration || 0) % 60}m
                                                            </div>
                                                            →
                                                        </div>
                                                        <div className="segment-airport">
                                                            <div className="airport-code">
                                                                {segment.arrival_airport?.id}
                                                            </div>
                                                            <div className="airport-name">
                                                                {segment.arrival_airport?.name}
                                                            </div>
                                                            <div className="airport-time">
                                                                {new Date(
                                                                    segment.arrival_airport?.time,
                                                                ).toLocaleTimeString("en-US", {
                                                                    hour: "numeric",
                                                                    minute: "2-digit",
                                                                    hour12: true,
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Aircraft and Class Details */}
                                                    <div className="segment-details">
                                                        {segment.airplane && (
                                                            <span className="detail-badge">
                                                                ✈️ {segment.airplane}
                                                            </span>
                                                        )}
                                                        {segment.travel_class && (
                                                            <span className="detail-badge">
                                                                🎫 {segment.travel_class}
                                                            </span>
                                                        )}
                                                        {segment.legroom && (
                                                            <span className="detail-badge">
                                                                💺 {segment.legroom}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Warning Indicators */}
                                                    {(segment.often_delayed_by_over_30_min ||
                                                        segment.overnight) && (
                                                        <div className="segment-warnings">
                                                            {segment.often_delayed_by_over_30_min && (
                                                                <span className="warning-indicator">
                                                                    ⚠️ Often delayed 30+ min
                                                                </span>
                                                            )}
                                                            {segment.overnight && (
                                                                <span className="info-indicator">
                                                                    🌙 Overnight
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Flight Features */}
                                                    {segment.extensions &&
                                                        segment.extensions.length > 0 && (
                                                            <div className="segment-features">
                                                                <div className="features-label">
                                                                    Features:
                                                                </div>
                                                                <div className="features-list">
                                                                    {segment.extensions.map(
                                                                        (feature, fIndex) => (
                                                                            <span
                                                                                key={fIndex}
                                                                                className="feature-item"
                                                                            >
                                                                                {getFeatureIcon(
                                                                                    feature,
                                                                                )}{" "}
                                                                                {feature}
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                    {/* Additional Info */}
                                                    {(segment.ticket_also_sold_by ||
                                                        segment.plane_and_crew_by) && (
                                                        <div className="segment-additional">
                                                            {segment.ticket_also_sold_by && (
                                                                <div className="additional-info">
                                                                    <strong>Also sold by:</strong>{" "}
                                                                    {segment.ticket_also_sold_by.join(
                                                                        ", ",
                                                                    )}
                                                                </div>
                                                            )}
                                                            {segment.plane_and_crew_by && (
                                                                <div className="additional-info">
                                                                    <strong>Operated by:</strong>{" "}
                                                                    {segment.plane_and_crew_by}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Essential details */}
                {cardData.essentialDetails && Object.keys(cardData.essentialDetails).length > 0 && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <h3
                            style={{
                                margin: "0 0 1rem 0",
                                color: "#333",
                                fontSize: "1.1rem",
                            }}
                        >
                            Key Information
                        </h3>
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                            {Object.entries(cardData.essentialDetails).map(([key, value]) => (
                                <div
                                    key={key}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "0.5rem 0",
                                        borderBottom: "1px solid #f0f0f0",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: "500",
                                            color: "#555",
                                        }}
                                    >
                                        {key}:
                                    </span>
                                    <span style={{ color: "#333" }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Detailed Information */}
                {cardData.details &&
                    Object.keys(cardData.details).filter(
                        (key) =>
                            ![
                                "segments",
                                "layovers",
                                "timingDetails",
                                "airlineLogo",
                                "airlineLogos",
                                "bookingToken",
                            ].includes(key),
                    ).length > 0 && (
                        <div style={{ marginBottom: "1.5rem" }}>
                            <h3 className="modal-section-title">
                                {cardData.type === "flight"
                                    ? "Flight Details"
                                    : "Additional Information"}
                            </h3>
                            <div className="modal-info-grid">
                                {Object.entries(cardData.details)
                                    .filter(
                                        ([key]) =>
                                            ![
                                                "segments",
                                                "layovers",
                                                "timingDetails",
                                                "airlineLogo",
                                                "airlineLogos",
                                                "bookingToken",
                                            ].includes(key),
                                    )
                                    .map(([key, value]) => (
                                        <div key={key} className="modal-info-item">
                                            <span className="modal-info-label">
                                                {formatLabel(key)}:
                                            </span>
                                            <span className="modal-info-value">
                                                {formatValue(key, value)}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                {/* Booking Options */}
                {cardData.type === "flight" && cardData.details?.bookingOptions && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <h3 className="modal-section-title">
                            Booking Options ({cardData.details.bookingOptions.length})
                        </h3>
                        <div className="booking-options-grid">
                            {cardData.details.bookingOptions.slice(0, 6).map((option, index) => (
                                <div key={index} className="booking-option-card">
                                    <div className="booking-header">
                                        <div className="booking-provider">
                                            {option.together?.airline_logos &&
                                                option.together.airline_logos[0] && (
                                                    <img
                                                        src={option.together.airline_logos[0]}
                                                        alt="Provider logo"
                                                        className="provider-logo"
                                                        onError={(e) => {
                                                            e.target.style.display = "none";
                                                        }}
                                                    />
                                                )}
                                            <span className="provider-name">
                                                {option.together?.book_with}
                                            </span>
                                        </div>
                                        <div className="booking-price">
                                            ${option.together?.price}
                                        </div>
                                    </div>

                                    {option.together?.option_title && (
                                        <div className="booking-type">
                                            {option.together.option_title}
                                        </div>
                                    )}

                                    {option.together?.extensions && (
                                        <div className="booking-features">
                                            {option.together.extensions
                                                .slice(0, 3)
                                                .map((feature, fIndex) => (
                                                    <span key={fIndex} className="booking-feature">
                                                        {feature}
                                                    </span>
                                                ))}
                                            {option.together.extensions.length > 3 && (
                                                <span className="booking-feature more-features">
                                                    +{option.together.extensions.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {option.together?.baggage_prices && (
                                        <div className="baggage-info">
                                            <div className="baggage-label">Baggage:</div>
                                            {option.together.baggage_prices.map(
                                                (baggage, bIndex) => (
                                                    <span key={bIndex} className="baggage-item">
                                                        🧳 {baggage}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}

                                    {option.together?.booking_phone && (
                                        <div className="booking-phone">
                                            📞 {option.together.booking_phone}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {cardData.details.bookingOptions.length > 6 && (
                                <div className="more-options-notice">
                                    +{cardData.details.bookingOptions.length - 6} more booking
                                    options available
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* General Baggage Policies */}
                {cardData.type === "flight" && cardData.details?.baggagePrices && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <h3 className="modal-section-title">Baggage Policies</h3>
                        <div className="baggage-policies">
                            {cardData.details.baggagePrices.together && (
                                <div className="baggage-section">
                                    <div className="baggage-section-title">General Policy</div>
                                    {cardData.details.baggagePrices.together.map(
                                        (policy, index) => (
                                            <div key={index} className="baggage-policy-item">
                                                🧳 {policy}
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}

                            {cardData.details.baggagePrices.departing && (
                                <div className="baggage-section">
                                    <div className="baggage-section-title">Departing Flight</div>
                                    {cardData.details.baggagePrices.departing.map(
                                        (policy, index) => (
                                            <div key={index} className="baggage-policy-item">
                                                🧳 {policy}
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}

                            {cardData.details.baggagePrices.returning && (
                                <div className="baggage-section">
                                    <div className="baggage-section-title">Returning Flight</div>
                                    {cardData.details.baggagePrices.returning.map(
                                        (policy, index) => (
                                            <div key={index} className="baggage-policy-item">
                                                🧳 {policy}
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {(cardData.externalLinks?.website || cardData.externalLinks?.booking) && (
                        <button
                            onClick={() => {
                                const url =
                                    cardData.externalLinks.website ||
                                    cardData.externalLinks.booking;
                                if (onGoToWebsite) {
                                    onGoToWebsite(url);
                                } else {
                                    window.open(url, "_blank", "noopener,noreferrer");
                                }
                            }}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                            }}
                        >
                            {cardData.type === "flight" ? "Book Flight" : "Go to Website"}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onAddToItinerary) {
                                onAddToItinerary(cardData);
                            } else {
                                logger.info("Add to itinerary:", cardData);
                            }
                        }}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor:
                                addToItineraryText === "Remove from Itinerary"
                                    ? "#dc3545"
                                    : "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                        }}
                    >
                        {addToItineraryIcon && `${addToItineraryIcon} `}
                        {addToItineraryText || "Add to Itinerary"}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to format field labels
function formatLabel(key) {
    return key
        .split(/(?=[A-Z])|_/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

// Helper function to format field values
function formatValue(key, value) {
    if (value === null || value === undefined) {
        return "N/A";
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return "None";
        return value.join(", ");
    }

    if (typeof value === "object") {
        // Handle nested objects gracefully
        if (value.name) return value.name;
        if (value.id) return value.id;
        if (value.code) return value.code;

        // Special handling for carbon emissions
        if (key.toLowerCase().includes("carbon") || key.toLowerCase().includes("emission")) {
            if (value.this_flight && value.typical_for_this_route) {
                const thisFlightKg = Math.round(value.this_flight / 1000);
                const typicalKg = Math.round(value.typical_for_this_route / 1000);
                const diff = value.difference_percent || 0;
                const diffText = diff > 0 ? `+${diff}%` : `${diff}%`;
                return `${thisFlightKg}kg CO₂ (${diffText} vs typical ${typicalKg}kg)`;
            }
        }

        // Handle other common object patterns
        if (value.amount && value.currency) {
            return `${value.currency} ${value.amount}`;
        }

        if (value.lat && value.lng) {
            return `${value.lat}, ${value.lng}`;
        }

        // For other objects, create a readable key-value format
        const entries = Object.entries(value);
        if (entries.length <= 3) {
            return entries.map(([k, v]) => `${formatLabel(k)}: ${v}`).join(", ");
        }

        return JSON.stringify(value, null, 2);
    }

    // Format duration values
    if (key.toLowerCase().includes("duration") && typeof value === "number") {
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return `${hours}h ${minutes}m`;
    }

    // Format price values
    if (key.toLowerCase().includes("price") && typeof value === "number") {
        return `$${value.toFixed(2)}`;
    }

    return String(value);
}
