/**
 * Time Utilities for Flight Timing Management
 * Handles time formatting, timezone handling, and flight timing calculations
 */

// Interface for layover information between flight segments
export interface LayoverInfo {
    duration: number; // Layover duration in minutes
    airport: string; // Airport code (e.g., "DEN")
    overnight: boolean; // Whether layover crosses midnight
}

// Interface for extracted flight timing data
export interface FlightTiming {
    departureTime: string; // Formatted departure time
    arrivalTime: string; // Formatted arrival time
    totalDuration: number; // Total flight duration in minutes
    layoverInfo: LayoverInfo[]; // Array of layover details
}

/**
 * Extract overall departure/arrival times from SerpAPI flight segments
 * @param flightData - SerpAPI flight object with flights array and layovers
 * @returns FlightTiming object with extracted timing information
 */
export function extractFlightTiming(flightData: any): FlightTiming {
    try {
        const segments = flightData.flights || [];

        if (segments.length === 0) {
            throw new Error("No flight segments found");
        }

        // Extract overall departure time from first segment
        const firstSegment = segments[0];
        const departureTime = firstSegment?.departure_airport?.time;

        // Extract overall arrival time from last segment
        const lastSegment = segments[segments.length - 1];
        const arrivalTime = lastSegment?.arrival_airport?.time;

        if (!departureTime || !arrivalTime) {
            throw new Error("Missing departure or arrival time in flight segments");
        }

        // Calculate layover information for connecting flights
        const layoverInfo = calculateLayoverDuration(segments);

        return {
            departureTime: formatTimeForDisplay(departureTime),
            arrivalTime: formatTimeForDisplay(arrivalTime),
            totalDuration: flightData.total_duration || 0,
            layoverInfo,
        };
    } catch (error) {
        console.error("Error extracting flight timing:", error);
        // Return fallback timing data
        return {
            departureTime: "N/A",
            arrivalTime: "N/A",
            totalDuration: flightData.total_duration || 0,
            layoverInfo: [],
        };
    }
}

/**
 * Convert ISO datetime to user-friendly time display format
 * @param isoTime - ISO datetime string from SerpAPI
 * @param format - Optional time format preference (defaults to 12h)
 * @returns Formatted time string (e.g., "8:30 AM", "14:30")
 */
export function formatTimeForDisplay(isoTime: string, format: "12h" | "24h" = "12h"): string {
    try {
        if (!isoTime || typeof isoTime !== "string") {
            return "N/A";
        }

        const date = new Date(isoTime);

        if (isNaN(date.getTime())) {
            throw new Error(`Invalid ISO time format: ${isoTime}`);
        }

        if (format === "24h") {
            return date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        } else {
            return date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        }
    } catch (error) {
        console.error("Error formatting time for display:", error);
        return "N/A";
    }
}

/**
 * Calculate layover durations between flight segments
 * @param segments - Array of flight segments from SerpAPI
 * @returns Array of LayoverInfo objects with duration, airport, overnight flag
 */
export function calculateLayoverDuration(segments: any[]): LayoverInfo[] {
    try {
        if (!segments || segments.length <= 1) {
            // No layovers for single segment flights
            return [];
        }

        const layovers: LayoverInfo[] = [];

        for (let i = 0; i < segments.length - 1; i++) {
            const currentSegment = segments[i];
            const nextSegment = segments[i + 1];

            const arrivalTime = currentSegment?.arrival_airport?.time;
            const nextDepartureTime = nextSegment?.departure_airport?.time;
            const layoverAirport = currentSegment?.arrival_airport?.id;

            if (!arrivalTime || !nextDepartureTime || !layoverAirport) {
                console.warn(`Missing layover data between segments ${i} and ${i + 1}`);
                continue;
            }

            const arrivalDate = new Date(arrivalTime);
            const departureDate = new Date(nextDepartureTime);

            if (isNaN(arrivalDate.getTime()) || isNaN(departureDate.getTime())) {
                console.warn(`Invalid date format in layover calculation`);
                continue;
            }

            // Calculate layover duration in minutes
            const layoverMinutes = Math.round(
                (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60),
            );

            // Check if layover crosses midnight (overnight)
            const overnight = arrivalDate.getDate() !== departureDate.getDate();

            layovers.push({
                duration: layoverMinutes,
                airport: layoverAirport,
                overnight,
            });
        }

        return layovers;
    } catch (error) {
        console.error("Error calculating layover duration:", error);
        return [];
    }
}

/**
 * Format duration from minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2h 30m", "45m")
 */
export function formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) {
        return "N/A";
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
        return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
        return `${hours}h`;
    } else {
        return `${hours}h ${remainingMinutes}m`;
    }
}

/**
 * Check if a layover is considered long (over 3 hours)
 * @param duration - Layover duration in minutes
 * @returns True if layover is over 3 hours
 */
export function isLongLayover(duration: number): boolean {
    return duration > 180; // 3 hours = 180 minutes
}

/**
 * Convert timezone to local time
 * @param timezone - Target timezone string (e.g., "America/New_York")
 * @returns Current time in the specified timezone
 */
export function convertTimezoneToLocal(timezone: string): string {
    try {
        const now = new Date();
        return new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            weekday: "long",
        }).format(now);
    } catch (error) {
        console.error("Error converting timezone to local:", error);
        return new Date().toLocaleString();
    }
}

/**
 * Format time for AI consumption
 * @param date - Date object
 * @param timezone - Target timezone string
 * @returns Formatted time string for AI
 */
export function formatTimeForAI(date: Date, timezone: string): string {
    try {
        const timeString = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            weekday: "long",
        }).format(date);

        return `Current user time: ${timeString}`;
    } catch (error) {
        console.error("Error formatting time for AI:", error);
        return `Current user time: ${date.toLocaleString()}`;
    }
}

/**
 * Get current time in specific timezone
 * @param timezone - Target timezone string
 * @returns Date object representing current time in timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
    try {
        // Get current time
        const now = new Date();

        // Convert to target timezone
        const timeString = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(now);

        // Parse back to Date object
        return new Date(timeString);
    } catch (error) {
        console.error("Error getting current time in timezone:", error);
        return new Date();
    }
}
