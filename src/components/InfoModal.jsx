import { useEffect } from "react";
import logger from "../utils/logger.js";

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

                                {/* Segment-by-segment breakdown */}
                                {cardData.details?.segments &&
                                    cardData.details.segments.length > 1 && (
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
                                                Flight Segments
                                            </div>
                                            {cardData.details.segments.map((segment, index) => (
                                                <div
                                                    key={`${cardData.id}-segment-${segment.flight_number || "unknown"}-${segment.departure_airport?.id || "unknown"}-${segment.arrival_airport?.id || "unknown"}`}
                                                    style={{
                                                        padding: "0.75rem",
                                                        backgroundColor: "white",
                                                        borderRadius: "4px",
                                                        marginBottom:
                                                            index <
                                                            cardData.details.segments.length - 1
                                                                ? "0.5rem"
                                                                : "0",
                                                        border: "1px solid #e9ecef",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: "0.8rem",
                                                            fontWeight: "bold",
                                                            marginBottom: "0.5rem",
                                                        }}
                                                    >
                                                        Segment {index + 1}: {segment.flight_number}
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            fontSize: "0.8rem",
                                                        }}
                                                    >
                                                        <span>
                                                            {segment.departure_airport?.id} at{" "}
                                                            {new Date(
                                                                segment.departure_airport?.time,
                                                            ).toLocaleTimeString("en-US", {
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                                hour12: true,
                                                            })}
                                                        </span>
                                                        <span>→</span>
                                                        <span>
                                                            {segment.arrival_airport?.id} at{" "}
                                                            {new Date(
                                                                segment.arrival_airport?.time,
                                                            ).toLocaleTimeString("en-US", {
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                                hour12: true,
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.7rem",
                                                            color: "#6c757d",
                                                            marginTop: "0.25rem",
                                                        }}
                                                    >
                                                        {segment.airline} • {segment.airplane} •{" "}
                                                        {Math.floor((segment.duration || 0) / 60)}h{" "}
                                                        {(segment.duration || 0) % 60}m
                                                    </div>
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

                {/* Detailed information */}
                {cardData.details && Object.keys(cardData.details).length > 0 && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <h3
                            style={{
                                margin: "0 0 1rem 0",
                                color: "#333",
                                fontSize: "1.1rem",
                            }}
                        >
                            Detailed Information
                        </h3>
                        <div
                            style={{
                                backgroundColor: "#f8f9fa",
                                padding: "1rem",
                                borderRadius: "8px",
                                border: "1px solid #e9ecef",
                            }}
                        >
                            <pre
                                style={{
                                    margin: 0,
                                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                    fontSize: "0.85rem",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    color: "#333",
                                }}
                            >
                                {JSON.stringify(cardData.details, null, 2)}
                            </pre>
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
