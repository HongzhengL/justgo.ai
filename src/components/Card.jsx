export function Card({
    cardData,
    onGoToWebsite,
    onMoreInfo,
    onAddToItinerary,
    addToItineraryText,
    addToItineraryIcon,
}) {
    const { title, subtitle, price, type, essentialDetails, externalLinks, departureTime, arrivalTime, layoverInfo } = cardData;

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
                        <div className="flight-timing" style={{
                            margin: "0 0 0.5rem 0",
                            padding: "0.5rem",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "4px",
                            border: "1px solid #e9ecef"
                        }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "0.9rem",
                                fontWeight: "500"
                            }}>
                                <div className="departure-time" style={{ color: "#28a745" }}>
                                    <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>Depart:</span>
                                    <br />
                                    <span>{departureTime || "N/A"}</span>
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    flex: 1,
                                    justifyContent: "center"
                                }}>
                                    <div style={{
                                        height: "1px",
                                        backgroundColor: "#007bff",
                                        flex: 1
                                    }}></div>
                                    <span style={{
                                        fontSize: "0.7rem",
                                        color: "#007bff",
                                        fontWeight: "bold"
                                    }}>
                                        {layoverInfo && layoverInfo.length > 0 ? `${layoverInfo.length} stop${layoverInfo.length > 1 ? 's' : ''}` : 'Direct'}
                                    </span>
                                    <div style={{
                                        height: "1px",
                                        backgroundColor: "#007bff",
                                        flex: 1
                                    }}></div>
                                </div>
                                <div className="arrival-time" style={{ color: "#dc3545" }}>
                                    <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>Arrive:</span>
                                    <br />
                                    <span>{arrivalTime || "N/A"}</span>
                                </div>
                            </div>
                            {layoverInfo && layoverInfo.length > 0 && (
                                <div className="layover-info" style={{
                                    marginTop: "0.5rem",
                                    fontSize: "0.7rem",
                                    color: "#6c757d"
                                }}>
                                    {layoverInfo.map((layover, index) => (
                                        <span key={index}>
                                            {layover.duration}m layover in {layover.airport}
                                            {layover.overnight && <span style={{ color: "#ffc107" }}> (overnight)</span>}
                                            {index < layoverInfo.length - 1 && " • "}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {price && (
                        <p
                            style={{
                                margin: "0 0 0.5rem 0",
                                color: "#007bff",
                                fontWeight: "bold",
                            }}
                        >
                            {price.currency} {price.amount}
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
                    {(externalLinks?.website || externalLinks?.booking) && (
                        <button
                            onClick={() => {
                                const url = externalLinks.website || externalLinks.booking;
                                onGoToWebsite(url);
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
                            {type === "flight" ? "Book Flight" : "Go to Website"}
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
