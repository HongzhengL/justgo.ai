import { HttpError } from "wasp/server";
import { AIAgent } from "../services/aiAgent.js";
import logger from "../utils/logger.js";

// Get or create the active conversation for a user
export const getActiveConversation = async (args, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        // First, try to find an existing active conversation
        let conversation = await context.entities.Conversation.findFirst({
            where: {
                userId: context.user.id,
                isActive: true,
            },
            include: {
                messages: {
                    orderBy: { timestamp: "asc" },
                    take: 50, // Limit to last 50 messages for performance
                },
            },
        });

        // If no active conversation exists, create one
        if (!conversation) {
            conversation = await context.entities.Conversation.create({
                data: {
                    userId: context.user.id,
                    title: "Travel Planning Session",
                    isActive: true,
                },
                include: {
                    messages: true,
                },
            });

            logger.info(`Created new conversation ${conversation.id} for user ${context.user.id}`);
        } else {
            logger.info(
                `Found existing conversation ${conversation.id} for user ${context.user.id}`,
            );
        }

        // Parse metadata for all messages before returning
        if (conversation.messages) {
            conversation.messages = conversation.messages.map((message) => ({
                ...message,
                metadata: message.metadata ? JSON.parse(message.metadata) : null,
            }));
        }

        return conversation;
    } catch (error) {
        logger.error("Get active conversation error:", error);
        throw new HttpError(500, "Failed to get conversation");
    }
};

// Save a message to the conversation
export const saveMessage = async (
    { conversationId, sender, content, messageType, metadata },
    context,
) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        // Verify the conversation belongs to the user
        const conversation = await context.entities.Conversation.findFirst({
            where: {
                id: conversationId,
                userId: context.user.id,
            },
        });

        if (!conversation) {
            throw new HttpError(404, "Conversation not found or access denied");
        }

        // Create the message
        const message = await context.entities.Message.create({
            data: {
                conversationId,
                sender,
                content,
                messageType: messageType || "text",
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });

        // Update conversation timestamp
        await context.entities.Conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        logger.info(`Saved message ${message.id} to conversation ${conversationId}`);
        return message;
    } catch (error) {
        logger.error("Save message error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to save message");
    }
};

// Get conversation history
export const getConversationHistory = async ({ conversationId, limit = 50 }, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        // Verify the conversation belongs to the user
        const conversation = await context.entities.Conversation.findFirst({
            where: {
                id: conversationId,
                userId: context.user.id,
            },
            include: {
                messages: {
                    orderBy: { timestamp: "desc" },
                    take: limit,
                },
            },
        });

        if (!conversation) {
            throw new HttpError(404, "Conversation not found or access denied");
        }

        // Return messages in chronological order (oldest first)
        const messages = conversation.messages.reverse().map((message) => ({
            ...message,
            metadata: message.metadata ? JSON.parse(message.metadata) : null,
        }));

        return {
            conversation: {
                id: conversation.id,
                title: conversation.title,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            },
            messages,
        };
    } catch (error) {
        logger.error("Get conversation history error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to get conversation history");
    }
};

// Process AI message - combines AI processing with message saving
export const processAIMessage = async ({ message, frontendTimezone }, context) => {
    if (!context.user) {
        throw new HttpError(401, "User must be logged in");
    }

    try {
        // Get or create active conversation
        const conversation = await getActiveConversation({}, context);

        // Save the user's message first
        await saveMessage(
            {
                conversationId: conversation.id,
                sender: "user",
                content: message,
                messageType: "text",
            },
            context,
        );

        // Create AI Agent instance
        const aiAgent = new AIAgent();

        // Process the message with AI
        const aiResponse = await aiAgent.processUserMessage(
            message,
            { conversationId: conversation.id },
            context.user.id,
            context,
            frontendTimezone,
        );

        // Save the AI response
        const aiMessage = await saveMessage(
            {
                conversationId: conversation.id,
                sender: "ai",
                content: aiResponse.message,
                messageType: aiResponse.type,
                metadata: {
                    cards: aiResponse.cards || [],
                    parameters: aiResponse.parameters || {},
                },
            },
            context,
        );

        logger.info(
            `Processed AI message for user ${context.user.id}, conversation ${conversation.id}`,
        );

        return {
            conversation: {
                id: conversation.id,
                title: conversation.title,
            },
            userMessage: {
                id: conversation.messages[conversation.messages.length - 1]?.id,
                content: message,
                sender: "user",
                timestamp: new Date(),
            },
            aiMessage: {
                id: aiMessage.id,
                content: aiResponse.message,
                sender: "ai",
                type: aiResponse.type,
                cards: aiResponse.cards || [],
                parameters: aiResponse.parameters || {},
                timestamp: aiMessage.timestamp,
            },
        };
    } catch (error) {
        logger.error("Process AI message error:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "Failed to process AI message");
    }
};
