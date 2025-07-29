// Simple in-memory cache for hotel search results
// Key: city+dates, Value: hotel results array

const hotelCache = {};

function getCachedHotels(key) {
    if (!hotelCache[key]) return null;
    // Optionally, add cache expiry logic here
    return hotelCache[key];
}

function setCachedHotels(key, data) {
    hotelCache[key] = data;
}

export { getCachedHotels, setCachedHotels };
