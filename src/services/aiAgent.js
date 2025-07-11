import OpenAI from "openai";
import ParameterMappingService from "./parameterMapping.js";
import ValidationService from "./validation.js";
import { travelAPI } from "../api/index.js";
import { TimeContextManager } from "./timeContextManager.js";
import { SystemMessageBuilder } from "../utils/systemMessageBuilder.js";

export class AIAgent {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
        this.temperature = 0.7;
        this.maxTokens = 5000;
        this.contextWindowSize = parseInt(process.env.CONTEXT_WINDOW_SIZE) || 20;
        this.maxContextTokens = parseInt(process.env.MAX_CONTEXT_TOKENS) || 10000;

        // Initialize mapping and validation services
        this.mappingService = new ParameterMappingService();
        this.validationService = new ValidationService();

        // Initialize system message builder
        this.systemMessageBuilder = new SystemMessageBuilder(this.systemPrompt);

        // Define supported intents - easy to maintain and extend
        this.supportedIntents = {
            flight_search: {
                description: "User wants to search for flights between cities",
                requiredParams: ["departure", "destination", "outboundDate"],
                examples: ["Find flights from NYC to Paris", "Book a flight to Tokyo"],
            },
            place_search: {
                description: "User wants to find places like hotels, restaurants, activities",
                requiredParams: ["destination", "query"],
                examples: ["Find hotels in Rome", "Show me restaurants in Barcelona"],
            },
            general_question: {
                description: "General travel questions or conversations",
                requiredParams: [],
                examples: [
                    "What's the best time to visit Japan?",
                    "Tell me about travel insurance",
                ],
            },
        };

        // System prompt for travel planning assistant
        this.systemPrompt = `
            You are an intelligent travel planning assistant. Your role is to:
            1. Extract travel parameters from natural language requests
            2. Help users plan trips by understanding their preferences
            3. Provide helpful suggestions when information is incomplete
            4. Maintain a conversational and friendly tone

            When users make travel requests, extract structured parameters and determine their intent.
            Always be helpful and ask clarifying questions when needed.
        `;
    }

    generateIntentPrompt() {
        const intentDescriptions = Object.entries(this.supportedIntents)
            .map(([intent, config]) => `- ${intent}: ${config.description}`)
            .join("\n");

        const intentExamples = Object.entries(this.supportedIntents)
            .map(([intent, config]) => `${intent} examples: ${config.examples.join(", ")}`)
            .join("\n");

        return `Extract travel parameters from the user's message. Return ONLY a valid JSON object (no markdown formatting) with these fields:

            INTENT (choose one):
            ${intentDescriptions}
            
            PARAMETERS:
            - intent: one of the supported intents above
            - departure: departure city/airport IATA code (if mentioned) - REQUIRED for flights
            - destination: destination city/airport IATA code (if mentioned) - REQUIRED for flights, maps to 'arrival' in API
            - outboundDate: departure date in YYYY-MM-DD format (if mentioned) - REQUIRED for flights
            - returnDate: return date in YYYY-MM-DD format (if mentioned) - optional for round trips
            - adults: number of adult passengers (default 1 if not specified) - integer between 1-9
            - children: number of child passengers (optional) - integer between 0-8
            - travelClass: travel class preference (economy/business/first) - optional, defaults to economy
            - currency: price currency preference (optional) - defaults to USD
            - budget: budget information (if mentioned)
            - preferences: any specific preferences mentioned
            - query: for place searches, the type of place they're looking for

            EXAMPLES:
            ${intentExamples}

            Only include fields that are clearly mentioned or can be reasonably inferred.
            If the intent is unclear, default to "general_question".
            
            IMPORTANT: Return only valid JSON without any markdown code block formatting or explanatory text.
        `;
    }

    async processUserMessage(
        message,
        conversationContext = {},
        userId,
        dbContext,
        frontendTimezone = null,
    ) {
        try {
            console.log(`Processing message for user ${userId}:`, message);

            // Initialize time context manager for this conversation
            const timeContextManager = new TimeContextManager(conversationContext.conversationId);

            // Check for timezone override in user message
            const detectedTimezone = await timeContextManager.detectTimezoneFromMessage(message);
            if (detectedTimezone) {
                timeContextManager.setTimezoneOverride(detectedTimezone);
                console.log(`Detected timezone override: ${detectedTimezone}`);
            }

            // Generate current time context for AI
            const timeContext = timeContextManager.getTimeContextForAI(frontendTimezone);
            console.log(`Time context for AI: ${timeContext}`);

            // Retrieve conversation history for context
            const conversationHistory = await this.retrieveConversationContext(
                conversationContext.conversationId,
                userId,
                dbContext,
            );

            // Extract travel parameters from the message
            const parameters = await this.extractTravelParameters(
                message,
                conversationHistory,
                timeContext,
            );
            console.log("Extracted parameters:", parameters);

            // Validate the extracted intent
            if (!this.isValidIntent(parameters.intent)) {
                console.warn(
                    `Invalid intent detected: ${parameters.intent}, defaulting to general_question`,
                );
                parameters.intent = "general_question";
            }


            // Store original message in conversation context for handlers
            conversationContext.originalMessage = message;

            // Route to appropriate intent handler
            return await this.routeToIntentHandler(
                parameters.intent,
                parameters,
                message,
                conversationContext,
                conversationHistory,
                timeContext,
            );
        } catch (error) {
            console.error("AI Agent error:", error);
            return {
                type: "error",
                message:
                    "I'm sorry, I encountered an issue processing your request. Could you please try rephrasing it?",
                parameters: {},
            };
        }
    }

    async extractTravelParameters(message, conversationHistory = [], timeContext = null) {
        try {
            // Build system message with time context
            const baseIntentPrompt = this.generateIntentPrompt();
            const systemMessage = timeContext
                ? `${baseIntentPrompt}\n\n${timeContext}`
                : baseIntentPrompt;

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: systemMessage,
                    },
                    ...conversationHistory,
                    {
                        role: "user",
                        content: message,
                    },
                ],
                temperature: 0.3, // Lower temperature for more consistent parameter extraction
                max_tokens: this.maxTokens,
            });

            const response = completion.choices[0].message.content;

            // Extract JSON from markdown code blocks if present
            let jsonString = response.trim();
            if (jsonString.startsWith("```json")) {
                jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
            } else if (jsonString.startsWith("```")) {
                jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
            }

            const parameters = JSON.parse(jsonString);

            // Ensure we have a valid intent
            if (!parameters.intent || !this.isValidIntent(parameters.intent)) {
                parameters.intent = "general_question";
            }

            return parameters;
        } catch (error) {
            console.error("Parameter extraction error:", error);
            // Simple fallback that still uses AI for intent recognition
            return await this.fallbackParameterExtraction(message);
        }
    }

    async fallbackParameterExtraction(message) {
        try {
            // Simplified AI-based fallback - just get the intent
            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: `Classify this travel-related message into one of these intents:
                            - flight_search: looking for flights
                            - place_search: looking for hotels, restaurants, activities, or places
                            - general_question: general travel questions
                            
                            Respond with only the intent name.`,
                    },
                    {
                        role: "user",
                        content: message,
                    },
                ],
                temperature: 0.1,
                max_tokens: 50,
            });

            const intent = completion.choices[0].message.content.trim();
            return {
                intent: this.isValidIntent(intent) ? intent : "general_question",
            };
        } catch (error) {
            console.error("Fallback parameter extraction error:", error);
            // Ultimate fallback
            return { intent: "general_question" };
        }
    }

    isValidIntent(intent) {
        return intent && this.supportedIntents.hasOwnProperty(intent);
    }

    async handleFlightSearch(parameters, conversationContext, conversationHistory, timeContext) {
        try {
            console.log("HandleFlightSearch called with parameters:", parameters);

            // Validate parameters first
            const validation = this.validationService.validateByIntent("flight_search", parameters);
            if (!validation.isValid) {
                console.warn("Flight parameter validation failed:", validation.errors);
                // Return clarification request instead of throwing error
                const clarificationResponse = await this.generateClarificationResponse(
                    conversationContext.originalMessage || "Flight search request",
                    parameters,
                    conversationContext,
                    conversationHistory,
                    timeContext,
                );

                return {
                    type: "clarification",
                    message: clarificationResponse,
                    parameters: parameters,
                };
            }

            // Log warnings if present
            if (validation.warnings.length > 0) {
                console.warn("Flight parameter warnings:", validation.warnings);
            }

            // Map AI parameters to SerpAPI format
            const mappedParams = this.mappingService.mapToSerpAPI(parameters);
            console.log("Original AI parameters:", JSON.stringify(parameters, null, 2));
            console.log("Mapped parameters for SerpAPI:", JSON.stringify(mappedParams, null, 2));

            // Call TravelAPIModule for flight search
            const results = await travelAPI.searchFlights(mappedParams);
            console.log(`Flight search completed: ${results.length} results found`);

            // Generate response with search results
            const response = await this.generateResponseWithResults(
                conversationContext.originalMessage || "Flight search request",
                parameters,
                results,
                conversationContext,
                conversationHistory,
                timeContext,
            );

            return {
                type: "response_with_cards",
                message: response.text,
                cards: results,
                parameters: parameters,
            };
        } catch (error) {
            console.error("HandleFlightSearch error:", error);

            // Surface API errors directly to users as requested
            if (error.message && error.message.includes("SerpAPI")) {
                throw error; // Pass through SerpAPI errors unchanged
            }

            // For other errors, provide user-friendly message
            throw new Error(`I encountered an issue searching for flights: ${error.message}`);
        }
    }

    async handlePlaceSearch(parameters, conversationContext, conversationHistory, timeContext) {
        try {
            console.log("HandlePlaceSearch called with parameters:", parameters);

            // Validate parameters first
            const validation = this.validationService.validateByIntent("place_search", parameters);
            if (!validation.isValid) {
                console.warn("Place parameter validation failed:", validation.errors);
                // Return clarification request instead of throwing error
                const clarificationResponse = await this.generateClarificationResponse(
                    conversationContext.originalMessage || "Place search request",
                    parameters,
                    conversationContext,
                    conversationHistory,
                    timeContext,
                );

                return {
                    type: "clarification",
                    message: clarificationResponse,
                    parameters: parameters,
                };
            }

            // Log warnings if present
            if (validation.warnings.length > 0) {
                console.warn("Place parameter warnings:", validation.warnings);
            }

            // Future implementation for place search API calls
            console.log(
                "Place search API integration not implemented yet - returning empty results",
            );
            const results = [];

            // Generate response with search results
            const response = await this.generateResponseWithResults(
                conversationContext.originalMessage || "Place search request",
                parameters,
                results,
                conversationContext,
                conversationHistory,
                timeContext,
            );

            return {
                type: "response_with_cards",
                message: response.text,
                cards: results,
                parameters: parameters,
            };
        } catch (error) {
            console.error("HandlePlaceSearch error:", error);
            throw new Error(`I encountered an issue searching for places: ${error.message}`);
        }
    }

    async handleGeneralQuestion(
        message,
        parameters,
        conversationContext,
        conversationHistory,
        timeContext,
    ) {
        try {
            console.log("HandleGeneralQuestion called with message:", message);

            // Validate parameters first
            const validation = this.validationService.validateByIntent(
                "general_question",
                parameters,
            );
            if (!validation.isValid) {
                console.warn("General question parameter validation failed:", validation.errors);
                // For general questions, we can proceed even with validation issues
            }

            // Log warnings if present
            if (validation.warnings.length > 0) {
                console.warn("General question parameter warnings:", validation.warnings);
            }

            // Build system message with time context
            const baseSystemMessage = `You are a helpful travel assistant. Answer the user's general travel question with accurate, helpful information. 
                Use web search if needed to provide current information. Be conversational and friendly.
                Focus on providing practical travel advice and information.
            `;

            const systemMessage = timeContext
                ? `${baseSystemMessage}\n\n${timeContext}`
                : baseSystemMessage;

            // Use OpenAI with web search tools for general questions
            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: systemMessage,
                    },
                    ...conversationHistory,
                    {
                        role: "user",
                        content: message,
                    },
                ],
                temperature: this.temperature,
                max_tokens: this.maxTokens,
            });

            const aiResponse = completion.choices[0].message.content;
            console.log("General question response generated");

            return {
                type: "response",
                message: aiResponse,
                parameters: parameters,
            };
        } catch (error) {
            console.error("HandleGeneralQuestion error:", error);
            return {
                type: "response",
                message:
                    "I'd be happy to help answer your travel question! Could you please rephrase it or provide more details?",
                parameters: parameters,
            };
        }
    }

    async routeToIntentHandler(
        intent,
        parameters,
        message,
        conversationContext,
        conversationHistory,
        timeContext,
    ) {
        try {
            console.log(`Routing to handler for intent: ${intent}`);

            switch (intent) {
                case "flight_search":
                    return await this.handleFlightSearch(
                        parameters,
                        conversationContext,
                        conversationHistory,
                        timeContext,
                    );
                case "place_search":
                    return await this.handlePlaceSearch(
                        parameters,
                        conversationContext,
                        conversationHistory,
                        timeContext,
                    );
                case "general_question":
                    return await this.handleGeneralQuestion(
                        message,
                        parameters,
                        conversationContext,
                        conversationHistory,
                        timeContext,
                    );
                default:
                    console.warn(`Unknown intent: ${intent}, defaulting to general question`);
                    return await this.handleGeneralQuestion(
                        message,
                        parameters,
                        conversationContext,
                        conversationHistory,
                        timeContext,
                    );
            }
        } catch (error) {
            console.error(`Intent handler error for ${intent}:`, error);
            throw error; // Re-throw to be handled by processUserMessage
        }
    }

    async generateResponseWithResults(
        message,
        parameters,
        searchResults,
        context,
        conversationHistory = [],
        timeContext = null,
    ) {
        try {
            // Build system message with time context
            const baseSystemMessage = `You are a helpful travel assistant. The user made a request and you found search results. 
                Generate a conversational response that:
                1. Acknowledges their request
                2. Briefly describes what you found
                3. Encourages them to look at the results cards
                4. Offers to help with next steps

                Keep it conversational and helpful. The actual search results will be displayed as cards below your message.
            `;

            const systemMessage = timeContext
                ? `${baseSystemMessage}\n\n${timeContext}`
                : baseSystemMessage;

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: systemMessage,
                    },
                    ...conversationHistory,
                    {
                        role: "user",
                        content: `User request: "${message}"
                            Parameters extracted: ${JSON.stringify(parameters)}
                            Number of results found: ${searchResults.length}

                            Generate a helpful response.
                        `,
                    },
                ],
                temperature: this.temperature,
                max_tokens: this.maxTokens,
            });

            return {
                text: completion.choices[0].message.content,
            };
        } catch (error) {
            console.error("Response generation error:", error);
            return {
                text: `I found ${searchResults.length} results for your request! Take a look at the options below and let me know if you'd like me to search for something else or help you add any of these to your itinerary.`,
            };
        }
    }

    async generateClarificationResponse(
        message,
        parameters,
        context,
        conversationHistory = [],
        timeContext = null,
    ) {
        try {
            const requiredParams = this.supportedIntents[parameters.intent]?.requiredParams || [];
            const missingParams = requiredParams.filter((param) => {
                if (param === "query" && parameters.intent === "place_search") {
                    return !parameters.destination && !parameters.query;
                }
                return !parameters[param];
            });

            // Build system message with time context
            const baseSystemMessage = `You are a helpful travel assistant. The user made a request but you need more information to help them effectively. 
                Generate a conversational response that:
                1. Acknowledges what you understood from their request
                2. Asks for the specific missing information needed
                3. Provides examples or suggestions to help them
                4. Maintains a friendly, helpful tone

                Be specific about what information you need. Focus on the missing parameters.
            `;

            const systemMessage = timeContext
                ? `${baseSystemMessage}\n\n${timeContext}`
                : baseSystemMessage;

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: systemMessage,
                    },
                    ...conversationHistory,
                    {
                        role: "user",
                        content: `User request: "${message}"
                            Intent: ${parameters.intent}
                            Parameters I extracted: ${JSON.stringify(parameters)}
                            Missing required parameters: ${missingParams.join(", ")}

                            What clarifying questions should I ask to help them better?
                        `,
                    },
                ],
                temperature: this.temperature,
                max_tokens: this.maxTokens,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error("Clarification generation error:", error);
            return this.getFallbackClarificationMessage(parameters.intent);
        }
    }

    getFallbackClarificationMessage(intent) {
        const intentConfig = this.supportedIntents[intent];
        if (!intentConfig) {
            return "I'd love to help you plan your trip! Could you tell me more about what you're looking for?";
        }

        const examples = intentConfig.examples.join("' or '");
        return `I'd be happy to help with ${intent.replace("_", " ")}! Could you provide more details? For example: '${examples}'`;
    }

    // Utility method to add new intents easily
    addIntent(intentName, config) {
        this.supportedIntents[intentName] = {
            description: config.description,
            requiredParams: config.requiredParams || [],
            examples: config.examples || [],
        };
    }

    // Utility method to get all supported intents
    getSupportedIntents() {
        return Object.keys(this.supportedIntents);
    }

    estimateTokenCount(text) {
        return Math.ceil(text.length / 4);
    }

    truncateContextToTokenLimit(messages, maxTokens) {
        let totalTokens = 0;
        const truncatedMessages = [];

        // Process messages in reverse order (most recent first)
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            const messageTokens = this.estimateTokenCount(message.content);

            if (totalTokens + messageTokens <= maxTokens) {
                totalTokens += messageTokens;
                truncatedMessages.unshift(message);
            } else {
                break;
            }
        }

        return truncatedMessages;
    }

    logContextPerformance(conversationId, retrievalTime, messageCount, tokenCount) {
        console.log(
            `Context Performance - Conversation ${conversationId}: ${retrievalTime}ms retrieval, ${messageCount} messages, ${tokenCount} tokens`,
        );
    }

    async retrieveConversationContext(conversationId, userId, dbContext) {
        const startTime = Date.now();

        if (!dbContext || !dbContext.entities || !dbContext.entities.Message) {
            console.error("Invalid dbContext provided to retrieveConversationContext.");
            return [];
        }

        try {
            // Query database for messages excluding system and error types
            const messages = await dbContext.entities.Message.findMany({
                where: {
                    conversationId: conversationId,
                    NOT: {
                        messageType: {
                            in: ["system", "error"],
                        },
                    },
                },
                orderBy: {
                    timestamp: "desc",
                },
                take: this.contextWindowSize,
            });

            // Format messages as OpenAI format
            const formattedMessages = messages.map((msg) => ({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.content,
            }));

            // Reverse array to chronological order (oldest first)
            formattedMessages.reverse();

            // Apply token truncation
            const truncatedMessages = this.truncateContextToTokenLimit(
                formattedMessages,
                this.maxContextTokens,
            );

            // Calculate metrics
            const retrievalTime = Date.now() - startTime;
            const totalTokens = truncatedMessages.reduce(
                (sum, msg) => sum + this.estimateTokenCount(msg.content),
                0,
            );

            // Log performance
            this.logContextPerformance(
                conversationId,
                retrievalTime,
                truncatedMessages.length,
                totalTokens,
            );

            return truncatedMessages;
        } catch (error) {
            console.error("Context retrieval error:", error);
            return [];
        }
    }
}
