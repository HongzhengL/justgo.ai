import { useEffect } from "react";

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
                                console.log("Add to itinerary:", cardData);
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
