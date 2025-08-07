import { HttpError } from "wasp/server";
import { aiHotelBookingAgent } from "../services/aiHotelBookingAgent.js";

let globalBookingStatus = {
    isBooking: false,
    currentStep: 0,
    bookingId: null,
    status: "idle",
    error: null,
};

/**
 * Book hotel with AI automation
 */
export const bookHotelWithAI = async (bookingData, context) => {
    try {
        // Validate input data
        if (!bookingData) {
            throw new Error("Booking data is required");
        }

        if (!bookingData.hotel) {
            throw new Error("Hotel information is required");
        }

        if (
            !bookingData.guestInfo ||
            !bookingData.guestInfo.firstName ||
            !bookingData.guestInfo.email
        ) {
            throw new Error("Guest information (name and email) is required");
        }

        console.log("📊 Starting AI hotel booking with data:", {
            hotel: bookingData.hotel?.title || bookingData.hotel?.name,
            checkIn: bookingData.offer?.checkInDate,
            checkOut: bookingData.offer?.checkOutDate,
            guest: bookingData.guestInfo?.firstName + " " + bookingData.guestInfo?.lastName,
        });

        // Reset global status
        globalBookingStatus = {
            isBooking: true,
            currentStep: 0,
            bookingId: `HTL-${Date.now()}`,
            status: "processing",
            error: null,
        };

        // Start the AI booking process with longer timeout for real automation
        const result = await Promise.race([
            aiHotelBookingAgent.startAutomatedBooking(bookingData),
            new Promise(
                (_, reject) =>
                    setTimeout(
                        () => reject(new Error("Automation timeout - using fallback booking")),
                        45000,
                    ), // 45 seconds for real browser automation
            ),
        ]);

        if (result.success) {
            globalBookingStatus = {
                isBooking: false,
                currentStep: 5,
                bookingId: result.bookingId,
                status: "completed",
                error: null,
            };

            console.log("✅ AI hotel booking completed successfully:", result.bookingId);
            console.log("🔍 Full result object:", result);

            return {
                success: true,
                bookingId: result.bookingId,
                confirmationCode: result.confirmationCode,
                checkoutUrl: result.checkoutUrl,
                bookingUrl: result.bookingDetails?.bookingUrl || result.checkoutUrl,
                openFinalPage: result.openFinalPage,
                fallback: result.fallback,
                message: result.message || "Hotel booking completed successfully",
            };
        } else {
            globalBookingStatus = {
                isBooking: false,
                currentStep: globalBookingStatus.currentStep,
                bookingId: globalBookingStatus.bookingId,
                status: "failed",
                error: result.error,
            };

            console.log("❌ AI hotel booking failed:", result.error);
            return {
                success: false,
                error: result.error,
                message: result.error || "Hotel booking failed",
            };
        }
    } catch (error) {
        console.error("💥 Hotel booking error:", error);

        globalBookingStatus = {
            isBooking: false,
            currentStep: globalBookingStatus.currentStep,
            bookingId: globalBookingStatus.bookingId,
            status: "failed",
            error: error.message,
        };

        throw new HttpError(500, "Hotel booking failed: " + error.message);
    }
};

/**
 * Get current AI booking status
 */
export const getAIBookingStatus = async (args, context) => {
    try {
        // Get current status from AI agent with error handling
        let agentStatus;
        try {
            agentStatus = aiHotelBookingAgent.getBookingStatus();
        } catch (agentError) {
            console.warn(
                "⚠️ Error getting agent status, using global status only:",
                agentError.message,
            );
            agentStatus = { isBooking: false, currentStep: 0, progress: 0 };
        }

        // Merge with global status
        const currentStatus = {
            ...globalBookingStatus,
            currentStep: agentStatus.currentStep || globalBookingStatus.currentStep,
            isBooking: agentStatus.isBooking || globalBookingStatus.isBooking,
            progress:
                agentStatus.progress || Math.round((globalBookingStatus.currentStep / 5) * 100),
        };

        console.log("📈 Current booking status:", currentStatus);
        return currentStatus;
    } catch (error) {
        console.error("❌ Error getting booking status:", error);
        return {
            isBooking: false,
            currentStep: 0,
            bookingId: null,
            status: "error",
            error: error.message,
            progress: 0,
        };
    }
};

/**
 * Cancel AI booking
 */
export const cancelAIBooking = async (args, context) => {
    try {
        console.log("🛑 Cancelling AI hotel booking");

        const result = await aiHotelBookingAgent.cancelBooking();

        if (result.success) {
            globalBookingStatus = {
                isBooking: false,
                currentStep: 0,
                bookingId: null,
                status: "cancelled",
                error: null,
            };
        }

        return result;
    } catch (error) {
        console.error("❌ Error cancelling booking:", error);
        throw new HttpError(500, "Failed to cancel booking: " + error.message);
    }
};

/**
 * Get available hotel booking sites
 */
export const getHotelBookingSites = async (args, context) => {
    try {
        return {
            sites: [
                {
                    name: "booking.com",
                    displayName: "Booking.com",
                    reliability: 0.95,
                    fees: "low",
                    features: ["instant_confirmation", "free_cancellation"],
                },
                {
                    name: "expedia.com",
                    displayName: "Expedia",
                    reliability: 0.9,
                    fees: "medium",
                    features: ["bundle_deals", "rewards_program"],
                },
                {
                    name: "hotels.com",
                    displayName: "Hotels.com",
                    reliability: 0.88,
                    fees: "medium",
                    features: ["loyalty_program", "price_match"],
                },
            ],
        };
    } catch (error) {
        console.error("❌ Error getting booking sites:", error);
        throw new HttpError(500, "Failed to get booking sites: " + error.message);
    }
};
