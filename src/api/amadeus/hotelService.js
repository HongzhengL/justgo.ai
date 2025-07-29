import { getAmadeusToken } from './amadeusAuth.js';
import { getCachedHotels, setCachedHotels } from './cache.js';

// Use global fetch with proper node-fetch fallback
let fetchAPI;
if (typeof global !== 'undefined' && global.fetch) {
    fetchAPI = global.fetch;
} else if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    fetchAPI = globalThis.fetch;
} else {
    // Import node-fetch synchronously for Node.js environment
    try {
        const nodeFetch = require('node-fetch');
        fetchAPI = nodeFetch.default || nodeFetch;
    } catch (error) {
        console.error('Failed to import node-fetch:', error);
        throw new Error('Fetch API not available and node-fetch not found');
    }
}

const AMADEUS_HOTEL_LIST_URL = 'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city';
const AMADEUS_HOTEL_OFFERS_URL = 'https://test.api.amadeus.com/v3/shopping/hotel-offers';
const AMADEUS_HOTEL_BOOK_URL = 'https://test.api.amadeus.com/v1/booking/hotel-bookings';

// Helper to build cache key
function buildCacheKey({ cityCode, checkInDate, checkOutDate, adults, filters }) {
    return `${cityCode}_${checkInDate}_${checkOutDate}_${adults}_${JSON.stringify(filters)}`;
}

async function searchHotels({ cityCode, checkInDate, checkOutDate, adults = 1, filters = {} }) {
    console.log('Hotel search called with:', { cityCode, checkInDate, checkOutDate, adults, filters });
    
    const cacheKey = buildCacheKey({ cityCode, checkInDate, checkOutDate, adults, filters });
    const cached = getCachedHotels(cacheKey);
    if (cached) return cached;

    const token = await getAmadeusToken();
    console.log('Got Amadeus token for hotel search:', token ? 'Token received' : 'No token');
    
    try {
        // Step 1: Get list of hotels in the city
        const hotelListParams = new URLSearchParams({ cityCode });
        const hotelListUrl = `${AMADEUS_HOTEL_LIST_URL}?${hotelListParams.toString()}`;
        console.log('Getting hotel list from:', hotelListUrl);
        
        const hotelListRes = await Promise.race([
            fetchAPI(hotelListUrl, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Hotel list request timeout')), 10000)
            )
        ]);

        if (!hotelListRes.ok) {
            const errorText = await hotelListRes.text();
            console.error('Hotel List API Error:', hotelListRes.status, hotelListRes.statusText, errorText);
            throw new Error(`Failed to fetch hotel list: ${hotelListRes.status} ${hotelListRes.statusText} - ${errorText}`);
        }
        
        const hotelListData = await hotelListRes.json();
        console.log(`Found ${hotelListData.data?.length || 0} hotels for city ${cityCode}`);
        
        if (!hotelListData.data || hotelListData.data.length === 0) {
            console.log('No hotels found for city:', cityCode);
            return { data: [] };
        }

        // Step 2: Try multiple hotels to collect 3-4 working hotels
        console.log(`Trying hotels from list of ${hotelListData.data.length} hotels`);
        
        const workingHotels = [];
        const hotelInfo = []; // Store basic hotel info even without offers
        const maxHotels = 5; // We want 3-5 hotels (increased from 4)
        const minHotels = 3; // Minimum hotels we want to find
        
        // Try up to 20 different hotels to find 3-5 working ones (increased from 15)
        for (let i = 0; i < Math.min(20, hotelListData.data.length) && (workingHotels.length + hotelInfo.length) < maxHotels; i++) {
            const hotel = hotelListData.data[i];
            console.log(`Attempting hotel ${i + 1}: ${hotel.name} (${hotel.hotelId})`);
            
            try {
                // Step 3: Get hotel offers for single hotel
                const offersParams = new URLSearchParams({
                    hotelIds: hotel.hotelId,
                    checkInDate,
                    checkOutDate,
                    adults: adults.toString()
                });
                
                const offersUrl = `${AMADEUS_HOTEL_OFFERS_URL}?${offersParams.toString()}`;
                console.log('Getting hotel offers from:', offersUrl);
                
                const offersRes = await Promise.race([
                    fetchAPI(offersUrl, {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Hotel offers request timeout')), 8000)
                    )
                ]);

                if (!offersRes.ok) {
                    const errorText = await offersRes.text();
                    console.error(`Hotel ${hotel.name} API Error:`, offersRes.status, errorText);
                    
                    // Even if no offers, store basic hotel info
                    if (hotelInfo.length < (maxHotels - workingHotels.length)) {
                        hotelInfo.push({
                            type: "hotel-offers",
                            hotel: hotel,
                            available: false,
                            offers: []
                        });
                        console.log(`Added ${hotel.name} to hotel info (no offers). Total info: ${hotelInfo.length}`);
                    }
                    continue; // Try next hotel
                }
                
                const offersData = await offersRes.json();
                console.log(`Successfully found offers for ${hotel.name}: ${offersData.data?.length || 0} offers`);
                console.log(`Hotel ${hotel.name} offers data structure:`, JSON.stringify(offersData, null, 2));
                
                if (offersData.data && offersData.data.length > 0) {
                    // Success! Add to working hotels collection
                    workingHotels.push(...offersData.data);
                    console.log(`Added ${offersData.data.length} offers from ${hotel.name}. Total: ${workingHotels.length}`);
                    
                    // If we have enough hotels, we can stop early
                    if ((workingHotels.length + hotelInfo.length) >= minHotels) {
                        console.log(`Found minimum required hotels (${minHotels}), stopping search`);
                        break;
                    }
                } else {
                    // No offers but hotel exists - add to hotel info
                    if (hotelInfo.length < (maxHotels - workingHotels.length)) {
                        hotelInfo.push({
                            type: "hotel-offers",
                            hotel: hotel,
                            available: false,
                            offers: []
                        });
                        console.log(`Added ${hotel.name} to hotel info (no offers). Total info: ${hotelInfo.length}`);
                    }
                }
                
            } catch (error) {
                console.error(`Error with hotel ${hotel.name}:`, error.message);
                
                // Even on error, store basic hotel info
                if (hotelInfo.length < (maxHotels - workingHotels.length)) {
                    hotelInfo.push({
                        type: "hotel-offers",
                        hotel: hotel,
                        available: false,
                        offers: []
                    });
                    console.log(`Added ${hotel.name} to hotel info (error). Total info: ${hotelInfo.length}`);
                }
                continue; // Try next hotel
            }
        }
        
        // Combine working hotels with hotel info to ensure we have at least 3 hotels
        const allHotels = [...workingHotels, ...hotelInfo.slice(0, Math.max(0, minHotels - workingHotels.length))];
        
        // Return hotels - prioritize working hotels, then add hotel info to reach minimum
        if (allHotels.length > 0) {
            console.log(`Successfully collected ${workingHotels.length} working hotels and ${hotelInfo.length} hotel info`);
            const result = { data: allHotels };
            setCachedHotels(cacheKey, result);
            console.log("Returning hotel results with data length:", result.data.length);
            return result;
        }
        
        // If no hotels worked, return empty - no fallback data
        console.log('No working hotels found - returning empty result');
        const emptyResult = { data: [] };
        setCachedHotels(cacheKey, emptyResult);
        return emptyResult;
        
    } catch (error) {
        console.error('Hotel search error:', error);
        throw error;
    }
}

async function bookHotel({ offerId, guestInfo }) {
    const token = await getAmadeusToken();
    const res = await fetchAPI(AMADEUS_HOTEL_BOOK_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offerId, guests: [guestInfo] }),
    });

    if (!res.ok) throw new Error('Failed to book hotel');
    return await res.json();
}

export { searchHotels, bookHotel };