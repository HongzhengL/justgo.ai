export function Card({
    cardData,
    onGoToWebsite,
    onMoreInfo,
    onAddToItinerary,
    onBookFlight,
    addToItineraryText,
    addToItineraryIcon,
}) {
    const {
        title,
        subtitle,
        price,
        type,
        essentialDetails,
        externalLinks,
        departureTime,
        arrivalTime,
        layoverInfo,
        metadata,
        // Hotel-specific fields
        rating,
        location,
        image,
        amenities,
        bookingUrl,
        additionalInfo,
    } = cardData;

    return (
        <div
            style={{
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "1rem",
                margin: "0.5rem 0",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                }}
            >
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                        }}
                    >
                        {type === "flight" && cardData.details?.airlineLogo && (
                            <img
                                src={cardData.details.airlineLogo}
                                alt="Airline logo"
                                style={{
                                    width: "24px",
                                    height: "24px",
                                    objectFit: "contain",
                                }}
                                onError={(e) => {
                                    e.target.style.display = "none";
                                }}
                            />
                        )}
                        {(type === "hotel" || additionalInfo?.hotelId) && (
                            <span style={{ fontSize: "18px", marginRight: "4px" }}>🏨</span>
                        )}
                        <h4 style={{ margin: "0", color: "#333" }}>{title}</h4>
                    </div>
                    <p
                        style={{
                            margin: "0 0 0.5rem 0",
                            color: "#666",
                            fontSize: "0.9rem",
                        }}
                    >
                        {subtitle}
                    </p>
                    {/* Flight timing display for flight cards */}
                    {type === "flight" && (departureTime || arrivalTime) && (
                        <div
                            className="flight-timing"
                            style={{
                                margin: "0 0 0.5rem 0",
                                padding: "0.5rem",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "4px",
                                border: "1px solid #e9ecef",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "0.9rem",
                                    fontWeight: "500",
                                }}
                            >
                                <div className="departure-time" style={{ color: "#28a745" }}>
                                    <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                                        Depart:
                                    </span>
                                    <br />
                                    <span>{departureTime || "N/A"}</span>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        flex: 1,
                                        justifyContent: "center",
                                    }}
                                >
                                    <div
                                        style={{
                                            height: "1px",
                                            backgroundColor: "#007bff",
                                            flex: 1,
                                        }}
                                    ></div>
                                    <span
                                        style={{
                                            fontSize: "0.7rem",
                                            color: "#007bff",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {layoverInfo && layoverInfo.length > 0
                                            ? `${layoverInfo.length} stop${
                                                  layoverInfo.length > 1 ? "s" : ""
                                              }`
                                            : "Direct"}
                                    </span>
                                    <div
                                        style={{
                                            height: "1px",
                                            backgroundColor: "#007bff",
                                            flex: 1,
                                        }}
                                    ></div>
                                </div>
                                <div className="arrival-time" style={{ color: "#dc3545" }}>
                                    <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                                        Arrive:
                                    </span>
                                    <br />
                                    <span>{arrivalTime || "N/A"}</span>
                                </div>
                            </div>
                            {layoverInfo && layoverInfo.length > 0 && (
                                <div
                                    className="layover-info"
                                    style={{
                                        marginTop: "0.5rem",
                                        fontSize: "0.7rem",
                                        color: "#6c757d",
                                    }}
                                >
                                    {layoverInfo.map((layover, index) => (
                                        <span
                                            key={`${cardData.id}-layover-${layover.airport}-${layover.duration}-${layover.overnight}`}
                                        >
                                            {layover.duration}m layover in {layover.airport}
                                            {layover.overnight && (
                                                <span style={{ color: "#ffc107" }}>
                                                    {" "}
                                                    (overnight)
                                                </span>
                                            )}
                                            {index < layoverInfo.length - 1 && " • "}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hotel-specific display */}
                    {(type === "hotel" || additionalInfo?.hotelId) && (
                        <div
                            className="hotel-details"
                            style={{
                                margin: "0 0 0.5rem 0",
                                padding: "0.5rem",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "4px",
                                border: "1px solid #e9ecef",
                            }}
                        >
                            {image && (
                                <img
                                    src={image}
                                    alt={title}
                                    style={{
                                        width: "100%",
                                        maxHeight: "120px",
                                        objectFit: "cover",
                                        borderRadius: "4px",
                                        marginBottom: "0.5rem",
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                    }}
                                />
                            )}
                            {rating && (
                                <div
                                    style={{
                                        fontSize: "0.9rem",
                                        color: "#ffc107",
                                        marginBottom: "0.25rem",
                                    }}
                                >
                                    {"⭐".repeat(Math.floor(rating))} {rating} stars
                                </div>
                            )}
                            {location && (
                                <div
                                    style={{
                                        fontSize: "0.8rem",
                                        color: "#6c757d",
                                        marginBottom: "0.25rem",
                                    }}
                                >
                                    📍 {typeof location === "object" ? location.address : location}
                                </div>
                            )}
                            {additionalInfo?.checkIn && (
                                <div
                                    style={{
                                        fontSize: "0.8rem",
                                        color: "#28a745",
                                        marginBottom: "0.25rem",
                                    }}
                                >
                                    Check-in: {additionalInfo.checkIn} | Check-out:{" "}
                                    {additionalInfo.checkOut}
                                </div>
                            )}
                            {amenities && amenities.length > 0 && (
                                <div style={{ fontSize: "0.7rem", color: "#6c757d" }}>
                                    Amenities: {amenities.slice(0, 3).join(", ")}
                                    {amenities.length > 3 && ` +${amenities.length - 3} more`}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Price display - works for both flights and hotels */}
                    {(price ||
                        ((type === "hotel" || additionalInfo?.hotelId) &&
                            typeof price === "string")) && (
                        <p
                            style={{
                                margin: "0 0 0.5rem 0",
                                color: "#007bff",
                                fontWeight: "bold",
                            }}
                        >
                            {typeof price === "string"
                                ? price
                                : `${price.currency} ${price.amount}`}
                        </p>
                    )}
                    <div style={{ fontSize: "0.8rem", color: "#888" }}>
                        {Object.entries(essentialDetails || {}).map(([key, value]) => (
                            <div key={key}>
                                {key}: {value}
                            </div>
                        ))}
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        marginLeft: "1rem",
                    }}
                >
                    {(externalLinks?.website || externalLinks?.booking || bookingUrl) && (
                        <button
                            onClick={() => {
                                // Handle flight booking with new modal approach
                                if (type === "flight" && metadata?.bookingToken && onBookFlight) {
                                    onBookFlight(metadata.bookingToken, metadata.searchContext, {
                                        title,
                                        subtitle,
                                    });
                                } else {
                                    // Fallback to existing behavior for non-flights or missing booking token
                                    const url =
                                        externalLinks?.website ||
                                        externalLinks?.booking ||
                                        bookingUrl;
                                    onGoToWebsite(url);
                                }
                            }}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                            }}
                        >
                            {type === "flight"
                                ? "Book Flight"
                                : type === "hotel" || additionalInfo?.hotelId
                                  ? "Book Hotel"
                                  : "Go to Website"}
                        </button>
                    )}
                    {(type === "hotel" || additionalInfo?.hotelId) &&
                        !(externalLinks?.website || externalLinks?.booking || bookingUrl) && (
                            <button
                                disabled
                                style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "not-allowed",
                                    fontSize: "0.8rem",
                                    opacity: 0.6,
                                }}
                            >
                                No Offers Available
                            </button>
                        )}
                    <button
                        onClick={() => onMoreInfo(cardData)}
                        style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                        }}
                    >
                        More Information
                    </button>
                    <button
                        onClick={() => onAddToItinerary(cardData)}
                        style={{
                            padding: "0.5rem 1rem",
                            backgroundColor:
                                addToItineraryText === "Remove from Itinerary"
                                    ? "#dc3545"
                                    : "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                        }}
                    >
                        {addToItineraryIcon && `${addToItineraryIcon} `}
                        {addToItineraryText || "Add to Itinerary"}
                    </button>
                </div>
            </div>
        </div>
    );
}
