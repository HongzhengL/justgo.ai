import React, { useState, useEffect } from "react";
import { useQuery } from "wasp/client/operations";
import { fetchFlightBookingOptions } from "wasp/client/operations";
import logger from "../utils/logger.js";

export function BookingOptionsModal({ isOpen, onClose, bookingToken, searchContext, flightInfo }) {
    const [isLoading, setIsLoading] = useState(true);
    const [bookingOptions, setBookingOptions] = useState(null);
    const [error, setError] = useState(null);

    const {
        data,
        isLoading: queryLoading,
        error: queryError,
    } = useQuery(
        fetchFlightBookingOptions,
        { bookingToken, searchContext },
        { enabled: isOpen && !!bookingToken && !!searchContext },
    );

    useEffect(() => {
        if (data) {
            setIsLoading(false);
            if (data.success && data.bookingOptions) {
                setBookingOptions(data.bookingOptions);
                setError(null);
            } else {
                setBookingOptions(null);
                setError(data.error || "Failed to fetch booking options");
            }
        } else if (queryError) {
            setIsLoading(false);
            setError(queryError.message || "Failed to fetch booking options");
        } else if (queryLoading) {
            setIsLoading(true);
        }
    }, [data, queryError, queryLoading]);

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

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleBookingClick = (option) => {
        // Handle StandardizedCard format (new implementation)
        if (option.type === "flight" && option.details?.bookingRequest) {
            const { url, post_data } = option.details.bookingRequest;
            submitBookingRequest(url, post_data);
            return;
        }

        // Handle StandardizedCard with direct external link (fallback)
        if (option.type === "flight" && option.externalLinks?.booking) {
            window.open(option.externalLinks.booking, "_blank", "noopener,noreferrer");
            logger.info("Opening StandardizedCard booking URL:", option.externalLinks.booking);
            return;
        }

        // Handle legacy SerpAPI format (for backward compatibility)
        const bookingData = option.together || option.departing || option.returning;
        if (bookingData && bookingData.booking_request) {
            const { url, post_data } = bookingData.booking_request;
            submitBookingRequest(url, post_data);
        } else if (bookingData && bookingData.booking_phone) {
            // Handle phone-only booking
            alert(`Please call ${bookingData.booking_phone} to book this flight.`);
        }
    };

    const submitBookingRequest = (url, postData) => {
        try {
            // Create form to exactly match the successful curl command
            const form = document.createElement("form");
            form.method = "POST";
            form.action = url;
            form.target = "_blank";
            form.style.display = "none";
            form.enctype = "application/x-www-form-urlencoded";

            // Extract the 'u' parameter value from post_data
            // post_data comes as "u=EqQeCgJXThoECAMQAUKEBQoCVVMSBWVu..." from SerpAPI
            let uValue;
            if (postData.startsWith("u=")) {
                uValue = postData.substring(2); // Remove "u=" prefix
            } else {
                uValue = postData; // Use as-is if no prefix
            }

            // Add the 'u' parameter as form field (matching curl --data "u=...")
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "u";
            input.value = uValue;
            form.appendChild(input);

            // Add to DOM, submit, then remove
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            logger.info(
                "Submitted booking POST request to:",
                url,
                "with u parameter length:",
                uValue.length,
            );
        } catch (error) {
            logger.error("Error submitting booking request:", error);
            // Fallback: try opening directly with query string
            const fallbackUrl = postData.startsWith("u=")
                ? `${url}?${postData}`
                : `${url}?u=${postData}`;
            window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        }
    };

    const formatPrice = (price, localPrices) => {
        if (!price) return "Price not available";

        let priceText = `$${price}`;
        if (localPrices && localPrices.length > 0) {
            const localPrice = localPrices[0];
            priceText += ` (${localPrice.currency} ${localPrice.price})`;
        }
        return priceText;
    };

    const renderBookingOption = (option, index) => {
        // Handle StandardizedCard format (new implementation)
        if (option.type === "flight" && option.title) {
            return (
                <div
                    key={index}
                    style={{
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "1rem",
                        backgroundColor: "#f9f9f9",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div>
                            <h4 style={{ margin: "0 0 0.5rem 0" }}>{option.title}</h4>
                            {option.subtitle && (
                                <div
                                    style={{
                                        fontSize: "0.9rem",
                                        color: "#666",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    {option.subtitle}
                                </div>
                            )}
                            {option.details?.baggagePrices &&
                                option.details.baggagePrices.length > 0 && (
                                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                                        {option.details.baggagePrices.map((baggage, idx) => (
                                            <div key={idx}>✓ {baggage}</div>
                                        ))}
                                    </div>
                                )}
                            {option.details?.extensions && option.details.extensions.length > 0 && (
                                <div
                                    style={{
                                        fontSize: "0.85rem",
                                        color: "#666",
                                        marginTop: "0.5rem",
                                    }}
                                >
                                    {option.details.extensions.map((ext, idx) => (
                                        <div key={idx}>• {ext}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div
                                style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a73e8" }}
                            >
                                {option.price
                                    ? `${option.price.currency} ${option.price.amount}`
                                    : "Price not available"}
                            </div>
                            <button
                                onClick={() => handleBookingClick(option)}
                                style={{
                                    marginTop: "0.5rem",
                                    padding: "0.5rem 1.5rem",
                                    backgroundColor: "#1a73e8",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                }}
                                onMouseOver={(e) => (e.target.style.backgroundColor = "#1557b0")}
                                onMouseOut={(e) => (e.target.style.backgroundColor = "#1a73e8")}
                            >
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Fallback: Handle legacy SerpAPI format (for backward compatibility)
        const isSeparate = option.separate_tickets;
        const mainData = option.together || {};

        return (
            <div
                key={index}
                style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem",
                    backgroundColor: "#f9f9f9",
                }}
            >
                {isSeparate && (
                    <div style={{ color: "#ff6b00", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        ⚠️ Separate Tickets
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <h4 style={{ margin: "0 0 0.5rem 0" }}>
                            {mainData.book_with || "Unknown Seller"}
                        </h4>
                        {mainData.option_title && (
                            <div
                                style={{
                                    fontSize: "0.9rem",
                                    color: "#666",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                {mainData.option_title}
                            </div>
                        )}
                        {mainData.baggage_prices && mainData.baggage_prices.length > 0 && (
                            <div style={{ fontSize: "0.85rem", color: "#666" }}>
                                {mainData.baggage_prices.map((baggage, idx) => (
                                    <div key={idx}>✓ {baggage}</div>
                                ))}
                            </div>
                        )}
                        {mainData.extensions && mainData.extensions.length > 0 && (
                            <div
                                style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}
                            >
                                {mainData.extensions.map((ext, idx) => (
                                    <div key={idx}>• {ext}</div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a73e8" }}>
                            {formatPrice(mainData.price, mainData.local_prices)}
                        </div>
                        <button
                            onClick={() => handleBookingClick(option)}
                            style={{
                                marginTop: "0.5rem",
                                padding: "0.5rem 1.5rem",
                                backgroundColor: "#1a73e8",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                            }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#1557b0")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#1a73e8")}
                        >
                            Book Now
                        </button>
                    </div>
                </div>

                {isSeparate && option.departing && option.returning && (
                    <div
                        style={{
                            marginTop: "1rem",
                            paddingTop: "1rem",
                            borderTop: "1px solid #e0e0e0",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.9rem",
                            }}
                        >
                            <div>
                                <strong>Departing:</strong> {option.departing.book_with} - $
                                {option.departing.price}
                            </div>
                            <div>
                                <strong>Returning:</strong> {option.returning.book_with} - $
                                {option.returning.price}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
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
            }}
            onClick={handleOverlayClick}
        >
            <div
                style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "2rem",
                    maxWidth: "600px",
                    width: "90%",
                    maxHeight: "80vh",
                    overflow: "auto",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                    }}
                >
                    <h2 style={{ margin: 0 }}>Booking Options</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: "1.5rem",
                            cursor: "pointer",
                            padding: "0.5rem",
                        }}
                    >
                        ✕
                    </button>
                </div>

                {flightInfo && (
                    <div
                        style={{
                            marginBottom: "1.5rem",
                            padding: "0.75rem",
                            backgroundColor: "#f0f7ff",
                            borderRadius: "8px",
                        }}
                    >
                        <div style={{ fontWeight: "bold" }}>{flightInfo.title}</div>
                        <div style={{ fontSize: "0.9rem", color: "#666" }}>
                            {flightInfo.subtitle}
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div style={{ textAlign: "center", padding: "2rem" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✈️</div>
                        <div>Fetching booking options...</div>
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: "center", padding: "2rem" }}>
                        <div style={{ color: "#d93025", marginBottom: "1rem" }}>{error}</div>
                        {data && data.fallbackUrl && (
                            <a
                                href={data.fallbackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: "#1a73e8",
                                    textDecoration: "none",
                                    display: "inline-block",
                                    padding: "0.5rem 1rem",
                                    border: "1px solid #1a73e8",
                                    borderRadius: "4px",
                                }}
                            >
                                Search on Google Flights
                            </a>
                        )}
                    </div>
                )}

                {!isLoading && !error && bookingOptions && bookingOptions.length > 0 && (
                    <div>
                        {bookingOptions.map((option, index) => renderBookingOption(option, index))}
                    </div>
                )}

                {!isLoading && !error && bookingOptions && bookingOptions.length === 0 && (
                    <div style={{ textAlign: "center", padding: "2rem" }}>
                        <div style={{ marginBottom: "1rem" }}>
                            No booking options available for this flight.
                        </div>
                        {data && data.fallbackUrl && (
                            <a
                                href={data.fallbackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: "#1a73e8",
                                    textDecoration: "none",
                                    display: "inline-block",
                                    padding: "0.5rem 1rem",
                                    border: "1px solid #1a73e8",
                                    borderRadius: "4px",
                                }}
                            >
                                Search on Google Flights
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
