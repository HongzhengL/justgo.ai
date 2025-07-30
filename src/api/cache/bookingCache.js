const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

export function getCachedBookingOptions(token) {
    const cached = cache.get(token);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
        cache.delete(token);
        return null;
    }

    return cached.data;
}

export function setCachedBookingOptions(token, data) {
    cache.set(token, {
        data: data,
        timestamp: Date.now(),
    });
}

export function clearExpiredCache() {
    const now = Date.now();
    for (const [token, cached] of cache.entries()) {
        if (now - cached.timestamp > CACHE_TTL) {
            cache.delete(token);
        }
    }
}
