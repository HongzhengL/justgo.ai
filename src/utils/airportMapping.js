// Airport code to city code mapping
const AIRPORT_TO_CITY_MAP = {
    // India
    'BOM': 'BOM', // Mumbai
    'DEL': 'DEL', // Delhi
    'BLR': 'BLR', // Bangalore
    'MAA': 'MAA', // Chennai
    'CCU': 'CCU', // Kolkata
    'HYD': 'HYD', // Hyderabad
    'AMD': 'AMD', // Ahmedabad
    'COK': 'COK', // Kochi
    'PNQ': 'PNQ', // Pune
    'GOI': 'GOI', // Goa
    
    // USA
    'LAX': 'LAX', // Los Angeles
    'JFK': 'NYC', // New York (JFK)
    'LGA': 'NYC', // New York (LaGuardia)
    'EWR': 'NYC', // New York (Newark)
    'ORD': 'CHI', // Chicago
    'MDW': 'CHI', // Chicago (Midway)
    'MIA': 'MIA', // Miami
    'SFO': 'SFO', // San Francisco
    'SJC': 'SFO', // San Jose (use SF city code)
    'OAK': 'SFO', // Oakland (use SF city code)
    'DFW': 'DFW', // Dallas
    'DAL': 'DFW', // Dallas (Love Field)
    'IAH': 'HOU', // Houston
    'HOU': 'HOU', // Houston (Hobby)
    'PHX': 'PHX', // Phoenix
    'LAS': 'LAS', // Las Vegas
    'SEA': 'SEA', // Seattle
    'DEN': 'DEN', // Denver
    'ATL': 'ATL', // Atlanta
    'BOS': 'BOS', // Boston
    'IAD': 'WAS', // Washington DC (Dulles)
    'DCA': 'WAS', // Washington DC (Reagan)
    'BWI': 'WAS', // Washington DC (Baltimore)
    
    // Europe
    'LHR': 'LON', // London (Heathrow)
    'LGW': 'LON', // London (Gatwick)
    'STN': 'LON', // London (Stansted)
    'LTN': 'LON', // London (Luton)
    'CDG': 'PAR', // Paris (Charles de Gaulle)
    'ORY': 'PAR', // Paris (Orly)
    'FRA': 'FRA', // Frankfurt
    'AMS': 'AMS', // Amsterdam
    'MAD': 'MAD', // Madrid
    'BCN': 'BCN', // Barcelona
    'FCO': 'ROM', // Rome (Fiumicino)
    'CIA': 'ROM', // Rome (Ciampino)
    'MXP': 'MIL', // Milan (Malpensa)
    'LIN': 'MIL', // Milan (Linate)
    'ZUR': 'ZUR', // Zurich
    'VIE': 'VIE', // Vienna
    'BRU': 'BRU', // Brussels
    'CPH': 'CPH', // Copenhagen
    'ARN': 'STO', // Stockholm
    'OSL': 'OSL', // Oslo
    'HEL': 'HEL', // Helsinki
    'DUB': 'DUB', // Dublin
    'EDI': 'EDI', // Edinburgh
    'MAN': 'MAN', // Manchester
    
    // Asia Pacific
    'NRT': 'TYO', // Tokyo (Narita)
    'HND': 'TYO', // Tokyo (Haneda)
    'KIX': 'OSA', // Osaka
    'ICN': 'SEL', // Seoul
    'HKG': 'HKG', // Hong Kong
    'SIN': 'SIN', // Singapore
    'BKK': 'BKK', // Bangkok
    'KUL': 'KUL', // Kuala Lumpur
    'CGK': 'JKT', // Jakarta
    'MNL': 'MNL', // Manila
    'TPE': 'TPE', // Taipei
    'PEK': 'BJS', // Beijing
    'PVG': 'SHA', // Shanghai (Pudong)
    'SHA': 'SHA', // Shanghai (Hongqiao)
    'CAN': 'CAN', // Guangzhou
    'SZX': 'SZX', // Shenzhen
    
    // Australia & New Zealand
    'SYD': 'SYD', // Sydney
    'MEL': 'MEL', // Melbourne
    'BNE': 'BNE', // Brisbane
    'PER': 'PER', // Perth
    'ADL': 'ADL', // Adelaide
    'AKL': 'AKL', // Auckland
    'CHC': 'CHC', // Christchurch
    
    // Middle East & Africa
    'DXB': 'DXB', // Dubai
    'AUH': 'AUH', // Abu Dhabi
    'DOH': 'DOH', // Doha
    'KWI': 'KWI', // Kuwait
    'CAI': 'CAI', // Cairo
    'JNB': 'JNB', // Johannesburg
    'CPT': 'CPT', // Cape Town
    'NBO': 'NBO', // Nairobi
    'ADD': 'ADD', // Addis Ababa
    
    // Canada
    'YYZ': 'YTO', // Toronto
    'YUL': 'YMQ', // Montreal
    'YVR': 'YVR', // Vancouver
    'YYC': 'YYC', // Calgary
    'YEG': 'YEG', // Edmonton
    'YOW': 'YOW', // Ottawa
    
    // South America
    'GRU': 'SAO', // São Paulo
    'GIG': 'RIO', // Rio de Janeiro
    'EZE': 'BUE', // Buenos Aires
    'SCL': 'SCL', // Santiago
    'LIM': 'LIM', // Lima
    'BOG': 'BOG', // Bogotá
    'UIO': 'UIO', // Quito
    'CCS': 'CCS', // Caracas
};

// City names to city codes (for cases where user provides city name instead of airport code)
const CITY_NAME_TO_CODE_MAP = {
    // Common city name variations
    'mumbai': 'BOM',
    'delhi': 'DEL',
    'new delhi': 'DEL',
    'bangalore': 'BLR',
    'bengaluru': 'BLR',
    'chennai': 'MAA',
    'kolkata': 'CCU',
    'calcutta': 'CCU',
    'hyderabad': 'HYD',
    'ahmedabad': 'AMD',
    'kochi': 'COK',
    'cochin': 'COK',
    'pune': 'PNQ',
    'goa': 'GOI',
    
    'los angeles': 'LAX',
    'new york': 'NYC',
    'chicago': 'CHI',
    'miami': 'MIA',
    'san francisco': 'SFO',
    'dallas': 'DFW',
    'houston': 'HOU',
    'phoenix': 'PHX',
    'las vegas': 'LAS',
    'seattle': 'SEA',
    'denver': 'DEN',
    'atlanta': 'ATL',
    'boston': 'BOS',
    'washington': 'WAS',
    'washington dc': 'WAS',
    
    'london': 'LON',
    'paris': 'PAR',
    'frankfurt': 'FRA',
    'amsterdam': 'AMS',
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'rome': 'ROM',
    'milan': 'MIL',
    'zurich': 'ZUR',
    'vienna': 'VIE',
    'brussels': 'BRU',
    'copenhagen': 'CPH',
    'stockholm': 'STO',
    'oslo': 'OSL',
    'helsinki': 'HEL',
    'dublin': 'DUB',
    'edinburgh': 'EDI',
    'manchester': 'MAN',
    
    'tokyo': 'TYO',
    'osaka': 'OSA',
    'seoul': 'SEL',
    'hong kong': 'HKG',
    'singapore': 'SIN',
    'bangkok': 'BKK',
    'kuala lumpur': 'KUL',
    'jakarta': 'JKT',
    'manila': 'MNL',
    'taipei': 'TPE',
    'beijing': 'BJS',
    'shanghai': 'SHA',
    'guangzhou': 'CAN',
    'shenzhen': 'SZX',
    
    'sydney': 'SYD',
    'melbourne': 'MEL',
    'brisbane': 'BNE',
    'perth': 'PER',
    'adelaide': 'ADL',
    'auckland': 'AKL',
    'christchurch': 'CHC',
    
    'dubai': 'DXB',
    'abu dhabi': 'AUH',
    'doha': 'DOH',
    'kuwait': 'KWI',
    'cairo': 'CAI',
    'johannesburg': 'JNB',
    'cape town': 'CPT',
    'nairobi': 'NBO',
    
    'toronto': 'YTO',
    'montreal': 'YMQ',
    'vancouver': 'YVR',
    'calgary': 'YYC',
    'edmonton': 'YEG',
    'ottawa': 'YOW',
    
    'sao paulo': 'SAO',
    'são paulo': 'SAO',
    'rio de janeiro': 'RIO',
    'buenos aires': 'BUE',
    'santiago': 'SCL',
    'lima': 'LIM',
    'bogota': 'BOG',
    'bogotá': 'BOG',
    'quito': 'UIO',
    'caracas': 'CCS',
};

/**
 * Convert airport code to city code for hotel search
 * @param {string} airportCode - 3-letter airport code (e.g., 'BOM', 'LAX')
 * @returns {string} - City code for hotel search
 */
export function getHotelCityCode(airportCode) {
    if (!airportCode || typeof airportCode !== 'string') {
        return null;
    }
    
    const upperCode = airportCode.toUpperCase().trim();
    return AIRPORT_TO_CITY_MAP[upperCode] || upperCode;
}

/**
 * Convert city name to city code for hotel search
 * @param {string} cityName - City name (e.g., 'Mumbai', 'Los Angeles')
 * @returns {string} - City code for hotel search
 */
export function getCityCodeFromName(cityName) {
    if (!cityName || typeof cityName !== 'string') {
        return null;
    }
    
    const lowerName = cityName.toLowerCase().trim();
    return CITY_NAME_TO_CODE_MAP[lowerName] || null;
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
    
    // First try airport code mapping
    const cityCode = getHotelCityCode(flightParams.arrival);
    if (cityCode) {
        return cityCode;
    }
    
    // If not found, try city name mapping
    return getCityCodeFromName(flightParams.arrival);
}

/**
 * Format city name for display
 * @param {string} cityCode - City code
 * @returns {string} - Formatted city name
 */
/**
 * Convert city name or city code to primary airport code for SerpAPI
 * @param {string} input - City name (e.g., 'Paris') or city code (e.g., 'PAR')
 * @returns {string} - Primary airport code for flights (e.g., 'CDG')
 */
export function getAirportCodeForFlights(input) {
    if (!input || typeof input !== 'string') {
        return null;
    }
    
    const cityToAirportMap = {
        // Direct city name to primary airport
        'paris': 'CDG',
        'new york': 'JFK',
        'nyc': 'JFK',
        'mumbai': 'BOM',
        'delhi': 'DEL',
        'new delhi': 'DEL',
        'london': 'LHR',
        'tokyo': 'NRT',
        'singapore': 'SIN',
        'dubai': 'DXB',
        'los angeles': 'LAX',
        'chicago': 'ORD',
        'miami': 'MIA',
        'san francisco': 'SFO',
        'boston': 'BOS',
        'washington': 'IAD',
        'seattle': 'SEA',
        'denver': 'DEN',
        'atlanta': 'ATL',
        'las vegas': 'LAS',
        'phoenix': 'PHX',
        'toronto': 'YYZ',
        'vancouver': 'YVR',
        'sydney': 'SYD',
        'melbourne': 'MEL',
        
        // City codes to primary airport codes
        'PAR': 'CDG',
        'NYC': 'JFK',
        'LON': 'LHR',
        'TYO': 'NRT',
        'CHI': 'ORD',
        'WAS': 'IAD',
        'YTO': 'YYZ',
        'SAO': 'GRU',
        'RIO': 'GIG',
        'BUE': 'EZE',
    };
    
    const lowerInput = input.toLowerCase().trim();
    const upperInput = input.toUpperCase().trim();
    
    return cityToAirportMap[lowerInput] || cityToAirportMap[upperInput] || upperInput;
}

export function formatCityName(cityCode) {
    const cityNames = {
        'BOM': 'Mumbai',
        'DEL': 'Delhi',
        'BLR': 'Bangalore',
        'MAA': 'Chennai',
        'CCU': 'Kolkata',
        'HYD': 'Hyderabad',
        'LAX': 'Los Angeles',
        'NYC': 'New York',
        'CHI': 'Chicago',
        'MIA': 'Miami',
        'SFO': 'San Francisco',
        'LON': 'London',
        'PAR': 'Paris',
        'TYO': 'Tokyo',
        'SIN': 'Singapore',
        'DXB': 'Dubai',
        // Add more as needed
    };
    
    return cityNames[cityCode] || cityCode;
}