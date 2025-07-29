// Amadeus OAuth token management
// Usage: const token = await getAmadeusToken();

// Use global fetch with proper node-fetch fallback
let fetchAPI;
if (typeof global !== "undefined" && global.fetch) {
    fetchAPI = global.fetch;
} else if (typeof globalThis !== "undefined" && globalThis.fetch) {
    fetchAPI = globalThis.fetch;
} else {
    try {
        const nodeFetch = require("node-fetch");
        fetchAPI = nodeFetch.default || nodeFetch;
    } catch (error) {
        console.error("Failed to import node-fetch:", error);
        throw new Error("Fetch API not available and node-fetch not found");
    }
}

let cachedToken = null;
let tokenExpiry = null;

const AMADEUS_CLIENT_ID = process.env.AMADEUS_API_KEY;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_API_SECRET;
const AMADEUS_AUTH_URL = "https://test.api.amadeus.com/v1/security/oauth2/token";

async function fetchToken() {
    const res = await Promise.race([
        fetchAPI(AMADEUS_AUTH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=client_credentials&client_id=${AMADEUS_CLIENT_ID}&client_secret=${AMADEUS_CLIENT_SECRET}`,
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Amadeus auth request timeout")), 5000),
        ),
    ]);
    if (!res.ok) throw new Error("Failed to fetch Amadeus token");
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 60s buffer
    return cachedToken;
}

async function getAmadeusToken() {
    if (!cachedToken || !tokenExpiry || Date.now() > tokenExpiry) {
        return await fetchToken();
    }
    return cachedToken;
}

export { getAmadeusToken };
