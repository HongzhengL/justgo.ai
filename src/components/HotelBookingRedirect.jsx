import React from "react";

export default function HotelBookingRedirect({ hotel, offer, guestInfo, onProceed }) {
    if (!hotel || !offer) return <div>No booking information available.</div>;

    return (
        <div
            className="hotel-booking-redirect"
            style={{
                maxWidth: 480,
                margin: "2rem auto",
                padding: 24,
                border: "1px solid #eee",
                borderRadius: 8,
                background: "#fff",
            }}
        >
            <h2>Confirm Your Hotel Booking</h2>
            <h3>{hotel.name}</h3>
            {hotel.images && hotel.images.length > 0 && (
                <img
                    src={hotel.images[0].url}
                    alt={hotel.name}
                    style={{ width: "100%", borderRadius: 4, marginBottom: 8 }}
                />
            )}
            <div>
                Price:{" "}
                <b>
                    {offer.price?.currency} {offer.price?.total}
                </b>
            </div>
            <div>Check-in: {offer.checkInDate}</div>
            <div>Check-out: {offer.checkOutDate}</div>
            <div>Room: {offer.room?.description?.text || "N/A"}</div>
            <div style={{ margin: "1rem 0" }}>
                <b>Guest Info:</b>
                <div>Name: {guestInfo?.name || "N/A"}</div>
                <div>Email: {guestInfo?.email || "N/A"}</div>
            </div>
            <div style={{ margin: "1rem 0", color: "#555" }}>
                You will be redirected to complete your booking and payment.
            </div>
            <button style={{ marginTop: 12 }} onClick={onProceed}>
                Proceed to Booking
            </button>
        </div>
    );
}
