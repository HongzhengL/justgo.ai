import React, { useState } from "react";

const defaultFilters = {
    priceMin: "",
    priceMax: "",
    rating: "",
    amenities: "",
};

export default function HotelSearch({ hotels = [], loading, error, onFilterChange, onBookHotel }) {
    const [filters, setFilters] = useState(defaultFilters);

    function handleChange(e) {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        if (onFilterChange) onFilterChange(newFilters);
    }

    return (
        <div className="hotel-search-container" style={{ margin: "2rem 0" }}>
            <h2>Hotel Results</h2>
            <div
                className="hotel-filters"
                style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
            >
                <input
                    type="number"
                    name="priceMin"
                    placeholder="Min Price"
                    value={filters.priceMin}
                    onChange={handleChange}
                />
                <input
                    type="number"
                    name="priceMax"
                    placeholder="Max Price"
                    value={filters.priceMax}
                    onChange={handleChange}
                />
                <input
                    type="number"
                    name="rating"
                    placeholder="Star Rating"
                    value={filters.rating}
                    onChange={handleChange}
                />
                <input
                    type="text"
                    name="amenities"
                    placeholder="Amenities (comma separated)"
                    value={filters.amenities}
                    onChange={handleChange}
                />
            </div>
            {loading && <div>Loading hotels...</div>}
            {error && <div style={{ color: "red" }}>Error: {error}</div>}
            {!loading && !error && hotels.length === 0 && (
                <div>No hotels found for your search.</div>
            )}
            <div
                className="hotel-list"
                style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}
            >
                {hotels.map((hotel, idx) => (
                    <div
                        key={hotel.id || idx}
                        className="hotel-card"
                        style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 16,
                            width: 320,
                            background: "#fff",
                        }}
                    >
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
                                {hotel.price?.currency} {hotel.price?.total}
                            </b>
                        </div>
                        <div>Rating: {hotel.rating || "N/A"} ⭐</div>
                        <div>Amenities: {hotel.amenities?.join(", ") || "N/A"}</div>
                        <button
                            style={{ marginTop: 12 }}
                            onClick={() => onBookHotel && onBookHotel(hotel)}
                        >
                            Book Hotel
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
