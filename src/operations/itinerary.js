import { HttpError } from "wasp/server";
import logger from "../utils/logger.js";

// Get all itineraries for the logged-in user
export const getItineraries = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        const itineraries = await context.entities.Itinerary.findMany({
            where: { userId: context.user.id },
            include: {
                items: {
                    orderBy: { orderIndex: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        logger.info(`Found ${itineraries.length} itineraries for user ${context.user.id}`);
        return itineraries;
    } catch (error) {
        logger.error("Get itineraries error:", error);
        throw new HttpError(500, "Failed to fetch itineraries");
    }
};

// Get a specific itinerary by ID
export const getItinerary = async ({ id }, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        const itinerary = await context.entities.Itinerary.findFirst({
            where: {
                id: id,
                userId: context.user.id,
            },
            include: {
                items: {
                    orderBy: { orderIndex: "asc" },
                },
            },
        });

        if (!itinerary) {
            throw new HttpError(404, "Itinerary not found");
        }

        return itinerary;
    } catch (error) {
        logger.error("Get itinerary error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to fetch itinerary");
    }
};

// Create a new itinerary
export const createItinerary = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        const { title, description, destination, startDate, endDate, budget } = args;

        // Validate required fields
        if (!title) {
            throw new HttpError(400, "Title is required");
        }

        const itinerary = await context.entities.Itinerary.create({
            data: {
                title,
                description,
                destination,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                budget: budget ? parseFloat(budget) : null,
                userId: context.user.id,
            },
        });

        logger.info(`Created itinerary ${itinerary.id} for user ${context.user.id}`);
        return itinerary;
    } catch (error) {
        logger.error("Create itinerary error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to create itinerary");
    }
};

// Add a travel card to an itinerary
export const addToItinerary = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        const { itineraryId, cardData, dayNumber, notes } = args;

        // Validate required fields
        if (!itineraryId || !cardData) {
            throw new HttpError(400, "Itinerary ID and card data are required");
        }

        // Verify the itinerary belongs to the user
        const itinerary = await context.entities.Itinerary.findFirst({
            where: {
                id: itineraryId,
                userId: context.user.id,
            },
        });

        if (!itinerary) {
            throw new HttpError(404, "Itinerary not found");
        }

        // Get the next order index
        const lastItem = await context.entities.ItineraryItem.findFirst({
            where: { itineraryId },
            orderBy: { orderIndex: "desc" },
        });

        const nextOrderIndex = lastItem ? lastItem.orderIndex + 1 : 0;

        const itineraryItem = await context.entities.ItineraryItem.create({
            data: {
                itineraryId,
                cardData: JSON.stringify(cardData),
                orderIndex: nextOrderIndex,
                dayNumber,
                notes,
            },
        });

        logger.info(`Added item ${itineraryItem.id} to itinerary ${itineraryId}`);
        return itineraryItem;
    } catch (error) {
        logger.error("Add to itinerary error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to add item to itinerary");
    }
};

// Remove an item from an itinerary
export const removeFromItinerary = async ({ itemId }, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        // First, get the item and verify ownership through the itinerary
        const item = await context.entities.ItineraryItem.findFirst({
            where: { id: itemId },
            include: {
                itinerary: true,
            },
        });

        if (!item) {
            throw new HttpError(404, "Itinerary item not found");
        }

        if (item.itinerary.userId !== context.user.id) {
            throw new HttpError(403, "Not authorized to remove this item");
        }

        await context.entities.ItineraryItem.delete({
            where: { id: itemId },
        });

        logger.info(`Removed item ${itemId} from itinerary ${item.itineraryId}`);
        return { success: true };
    } catch (error) {
        logger.error("Remove from itinerary error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to remove item from itinerary");
    }
};

// Update itinerary details
export const updateItinerary = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        const { id, title, description, destination, startDate, endDate, budget } = args;

        // Verify the itinerary belongs to the user
        const existingItinerary = await context.entities.Itinerary.findFirst({
            where: {
                id,
                userId: context.user.id,
            },
        });

        if (!existingItinerary) {
            throw new HttpError(404, "Itinerary not found");
        }

        const updatedItinerary = await context.entities.Itinerary.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description && { description }),
                ...(destination && { destination }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate && { endDate: new Date(endDate) }),
                ...(budget && { budget: parseFloat(budget) }),
            },
        });

        logger.info(`Updated itinerary ${id} for user ${context.user.id}`);
        return updatedItinerary;
    } catch (error) {
        logger.error("Update itinerary error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to update itinerary");
    }
};
