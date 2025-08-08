// Minimal airport to city code mapping for hotel search only
const HOTEL_CITY_MAP = {
    // Major airport codes to hotel city codes
    JFK: "NYC",
    LGA: "NYC",
    EWR: "NYC", // New York
    ORD: "CHI",
    MDW: "CHI", // Chicago
    SJC: "SFO",
    OAK: "SFO", // San Francisco Bay Area
    DFW: "DFW",
    DAL: "DFW", // Dallas
    IAH: "HOU",
    HOU: "HOU", // Houston
    IAD: "WAS",
    DCA: "WAS",
    BWI: "WAS", // Washington DC
    LHR: "LON",
    LGW: "LON",
    STN: "LON",
    LTN: "LON", // London
    CDG: "PAR",
    ORY: "PAR", // Paris
    FCO: "ROM",
    CIA: "ROM", // Rome
    MXP: "MIL",
    LIN: "MIL", // Milan
    NRT: "TYO",
    HND: "TYO", // Tokyo
    PVG: "SHA",
    SHA: "SHA", // Shanghai
    YYZ: "YTO",
    YUL: "YMQ", // Canada
    GRU: "SAO",
    GIG: "RIO",
    EZE: "BUE", // South America
    ARN: "STO", // Stockholm
    LIS: "LIS", // Lisbon
    OPO: "OPO", // Porto
};

// Common city names to city codes for hotel search
const HOTEL_CITY_NAME_MAP = {
    "new york": "NYC",
    chicago: "CHI",
    "san francisco": "SFO",
    dallas: "DFW",
    houston: "HOU",
    washington: "WAS",
    "washington dc": "WAS",
    london: "LON",
    paris: "PAR",
    rome: "ROM",
    milan: "MIL",
    tokyo: "TYO",
    shanghai: "SHA",
    toronto: "YTO",
    montreal: "YMQ",
    "sao paulo": "SAO",
    "são paulo": "SAO",
    "rio de janeiro": "RIO",
    "buenos aires": "BUE",
    stockholm: "STO",
    portugal: "LIS", // Default Portugal to Lisbon
    lisbon: "LIS",
    porto: "OPO",
};

/**
 * Convert airport code to city code for hotel search
 * @param {string} airportCode - 3-letter airport code (e.g., 'BOM', 'LAX')
 * @returns {string} - City code for hotel search
 */
export function getHotelCityCode(airportCode) {
    if (!airportCode || typeof airportCode !== "string") {
        return null;
    }

    const upperCode = airportCode.toUpperCase().trim();
    return HOTEL_CITY_MAP[upperCode] || upperCode;
}

/**
 * Convert city name to city code for hotel search
 * @param {string} cityName - City name (e.g., 'Mumbai', 'Los Angeles')
 * @returns {string} - City code for hotel search
 */
export function getCityCodeFromName(cityName) {
    if (!cityName || typeof cityName !== "string") {
        return null;
    }

    const lowerName = cityName.toLowerCase().trim();
    return HOTEL_CITY_NAME_MAP[lowerName] || null;
}

/**
 * Extract destination city code from flight search parameters
 * @param {Object} flightParams - Flight search parameters
 * @returns {string} - City code for hotel search
 */
export function extractDestinationCityCode(flightParams) {
    if (!flightParams || !flightParams.arrival) {
        return null;
    }

    // Handle error cases from AI parameter extraction
    if (flightParams.arrival.includes("ERROR:") || flightParams.arrival.includes("Cannot determine")) {
        return null;
    }

    // First try city name mapping (more flexible for hotel searches)
    const cityFromName = getCityCodeFromName(flightParams.arrival);
    if (cityFromName) {
        return cityFromName;
    }

    // Then try airport code mapping
    const cityCode = getHotelCityCode(flightParams.arrival);
    if (cityCode) {
        return cityCode;
    }

    // If it's a 3-letter code, assume it's already a valid city/airport code
    if (flightParams.arrival.length === 3 && /^[A-Z]{3}$/i.test(flightParams.arrival)) {
        return flightParams.arrival.toUpperCase();
    }

    return null;
}

/**
 * Format city name for display
 * @param {string} cityCode - City code
 * @returns {string} - Formatted city name
 */

export function formatCityName(cityCode) {
    const cityNames = {
        BOM: "Mumbai",
        DEL: "Delhi",
        BLR: "Bangalore",
        MAA: "Chennai",
        CCU: "Kolkata",
        HYD: "Hyderabad",
        LAX: "Los Angeles",
        NYC: "New York",
        CHI: "Chicago",
        MIA: "Miami",
        SFO: "San Francisco",
        LON: "London",
        PAR: "Paris",
        TYO: "Tokyo",
        SIN: "Singapore",
        DXB: "Dubai",
        LIS: "Lisbon",
        OPO: "Porto",
        // Add more as needed
    };

    return cityNames[cityCode] || cityCode;
}
