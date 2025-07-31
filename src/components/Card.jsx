import "./card.css";

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
        <div className="card">
            <div className="card-content">
                <div className="card-main">
                    <div className="card-header">
                        {type === "flight" && cardData.details?.airlineLogo && (
                            <div className="card-icon">
                                <img
                                    src={cardData.details.airlineLogo}
                                    alt="Airline logo"
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                    }}
                                />
                            </div>
                        )}
                        {(type === "hotel" || additionalInfo?.hotelId) && (
                            <span className="card-icon">🏨</span>
                        )}
                        <h4 className="card-title">{title}</h4>
                    </div>
                    <p className="card-subtitle">{subtitle}</p>
                    {/* Flight timing display for flight cards */}
                    {type === "flight" && (departureTime || arrivalTime) && (
                        <div className="flight-route">
                            <div className="flight-times">
                                <div className="flight-time departure-time">
                                    <span className="flight-time-label">Depart</span>
                                    <span className="flight-time-value">
                                        {departureTime || "N/A"}
                                    </span>
                                </div>
                                <div className="flight-path">
                                    <div className="flight-line"></div>
                                    <div className="flight-path-info">
                                        <span className="flight-stops">
                                            {layoverInfo && layoverInfo.length > 0
                                                ? `${layoverInfo.length} stop${
                                                      layoverInfo.length > 1 ? "s" : ""
                                                  }`
                                                : "Direct"}
                                        </span>
                                        {cardData.details?.timingDetails?.totalDuration && (
                                            <span className="flight-duration">
                                                {Math.floor(
                                                    cardData.details.timingDetails.totalDuration /
                                                        60,
                                                )}
                                                h{" "}
                                                {cardData.details.timingDetails.totalDuration % 60}m
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flight-time arrival-time">
                                    <span className="flight-time-label">Arrive</span>
                                    <span className="flight-time-value">
                                        {arrivalTime || "N/A"}
                                    </span>
                                </div>
                            </div>
                            {layoverInfo && layoverInfo.length > 0 && (
                                <div className="flight-layovers">
                                    {layoverInfo.map((layover) => (
                                        <span
                                            key={`${cardData.id}-layover-${layover.airport}-${layover.duration}-${layover.overnight}`}
                                            className="layover-item"
                                        >
                                            {layover.duration}m in {layover.airport}
                                            {layover.overnight && (
                                                <span className="layover-overnight">
                                                    {" "}
                                                    (overnight)
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Flight Details Section */}
                            {type === "flight" && cardData.details && (
                                <div className="flight-details">
                                    {/* Passenger Information */}
                                    {cardData.metadata?.searchContext && (
                                        <div className="passenger-info">
                                            <span className="passenger-badge">
                                                👥 {cardData.metadata.searchContext.adults} adult
                                                {cardData.metadata.searchContext.adults > 1
                                                    ? "s"
                                                    : ""}
                                                {cardData.metadata.searchContext.children > 0 && (
                                                    <>
                                                        , {cardData.metadata.searchContext.children}{" "}
                                                        child
                                                        {cardData.metadata.searchContext.children >
                                                        1
                                                            ? "ren"
                                                            : ""}
                                                    </>
                                                )}
                                            </span>
                                            {cardData.metadata.searchContext.travelClass && (
                                                <span className="travel-class-badge">
                                                    ✈️{" "}
                                                    {cardData.metadata.searchContext.travelClass
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        cardData.metadata.searchContext.travelClass.slice(
                                                            1,
                                                        )}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Aircraft and Class Info */}
                                    <div className="flight-aircraft-info">
                                        {cardData.details.segments &&
                                            cardData.details.segments.length > 0 && (
                                                <>
                                                    {cardData.details.segments[0].airplane && (
                                                        <span className="aircraft-badge">
                                                            ✈️{" "}
                                                            {cardData.details.segments[0].airplane}
                                                        </span>
                                                    )}
                                                    {cardData.details.segments[0].travel_class && (
                                                        <span className="class-badge">
                                                            🎫{" "}
                                                            {
                                                                cardData.details.segments[0]
                                                                    .travel_class
                                                            }
                                                        </span>
                                                    )}
                                                    {cardData.details.segments[0].legroom && (
                                                        <span className="legroom-badge">
                                                            💺{" "}
                                                            {cardData.details.segments[0].legroom}{" "}
                                                            legroom
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                    </div>

                                    {/* Warning Indicators */}
                                    {cardData.details.segments &&
                                        cardData.details.segments.some(
                                            (segment) =>
                                                segment.often_delayed_by_over_30_min ||
                                                segment.overnight,
                                        ) && (
                                            <div className="flight-warnings">
                                                {cardData.details.segments.some(
                                                    (segment) =>
                                                        segment.often_delayed_by_over_30_min,
                                                ) && (
                                                    <span className="warning-badge delay-warning">
                                                        ⚠️ Often delayed 30+ min
                                                    </span>
                                                )}
                                                {cardData.details.segments.some(
                                                    (segment) => segment.overnight,
                                                ) && (
                                                    <span className="info-badge overnight-badge">
                                                        🌙 Overnight flight
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                    {/* Flight Features */}
                                    {cardData.details.segments &&
                                        cardData.details.segments[0].extensions && (
                                            <div className="flight-features">
                                                {cardData.details.segments[0].extensions
                                                    .slice(0, 3)
                                                    .map((feature, index) => (
                                                        <span key={index} className="feature-badge">
                                                            {getFeatureIcon(feature)} {feature}
                                                        </span>
                                                    ))}
                                                {cardData.details.segments[0].extensions.length >
                                                    3 && (
                                                    <span className="feature-badge more-features">
                                                        +
                                                        {cardData.details.segments[0].extensions
                                                            .length - 3}{" "}
                                                        more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                    {/* Additional Booking Info */}
                                    {cardData.details.segments &&
                                        cardData.details.segments[0].ticket_also_sold_by && (
                                            <div className="additional-sellers">
                                                <span className="sellers-label">Also sold by:</span>
                                                <span className="sellers-list">
                                                    {cardData.details.segments[0].ticket_also_sold_by.join(
                                                        ", ",
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hotel-specific display */}
                    {(type === "hotel" || additionalInfo?.hotelId) && (
                        <div className="hotel-details">
                            {image && (
                                <img
                                    src={image}
                                    alt={title}
                                    className="hotel-image"
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                    }}
                                />
                            )}
                            {rating && (
                                <div className="hotel-rating">
                                    <span className="hotel-stars">
                                        {"⭐".repeat(Math.floor(rating))}
                                    </span>
                                    <span>{rating} stars</span>
                                </div>
                            )}
                            {location && (
                                <div className="hotel-location">
                                    <span>📍</span>
                                    <span>
                                        {typeof location === "object" ? location.address : location}
                                    </span>
                                </div>
                            )}
                            {additionalInfo?.checkIn && (
                                <div className="hotel-dates">
                                    Check-in: {additionalInfo.checkIn} | Check-out:{" "}
                                    {additionalInfo.checkOut}
                                </div>
                            )}
                            {amenities && amenities.length > 0 && (
                                <div className="hotel-amenities">
                                    {amenities.slice(0, 3).map((amenity, index) => (
                                        <span key={index} className="amenity-tag">
                                            {amenity}
                                        </span>
                                    ))}
                                    {amenities.length > 3 && (
                                        <span className="amenity-tag">
                                            +{amenities.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Price display - works for both flights and hotels */}
                    {(price ||
                        ((type === "hotel" || additionalInfo?.hotelId) &&
                            typeof price === "string")) && (
                        <div className="card-price">
                            {typeof price === "string" ? (
                                price
                            ) : (
                                <>
                                    <span className="card-price-currency">{price.currency}</span>
                                    <span>{price.amount}</span>
                                </>
                            )}
                        </div>
                    )}
                    {/* Essential details - only show for non-flight cards to avoid duplication */}
                    {type !== "flight" && (
                        <div className="card-details">
                            {Object.entries(essentialDetails || {}).map(([key, value]) => (
                                <div key={key} className="card-detail-item">
                                    {key}: {value}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="card-actions">
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
                            className="card-button card-button-primary"
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
                            <button disabled className="card-button card-button-secondary">
                                No Offers Available
                            </button>
                        )}
                    <button
                        onClick={() => onMoreInfo(cardData)}
                        className="card-button card-button-secondary"
                    >
                        More Information
                    </button>
                    <button
                        onClick={() => onAddToItinerary(cardData)}
                        className={`card-button ${
                            addToItineraryText === "Remove from Itinerary"
                                ? "card-button-danger"
                                : "card-button-success"
                        }`}
                    >
                        {addToItineraryIcon && `${addToItineraryIcon} `}
                        {addToItineraryText || "Add to Itinerary"}
                    </button>
                </div>
            </div>
        </div>
    );
}
