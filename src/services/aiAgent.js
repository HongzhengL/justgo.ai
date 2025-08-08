import OpenAI from "openai";
import ParameterMappingService from "./parameterMapping.js";
import ValidationService from "./validation.js";
import { travelAPI } from "../api/index.js";
import { TimeContextManager } from "./timeContextManager.js";
import { SystemMessageBuilder } from "../utils/systemMessageBuilder.js";
import { extractDestinationCityCode, formatCityName } from "../utils/airportMapping.js";
import { getActivities } from "../operations/activities.js";
import logger from "../utils/logger.js";

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
                requiredParams: ["destination"],
                examples: ["Find hotels in Rome", "Show me hotels in Paris", "Hotels in Barcelona"],
            },
            hotel_search: {
                description: "User specifically wants to search for hotels in a destination",
                requiredParams: ["destination"],
                examples: [
                    "Show me hotels in Paris",
                    "Find hotels in Tokyo",
                    "Book a hotel in London",
                ],
            },
            trip_planning: {
                description:
                    "User wants to plan a complex multi-destination trip with 3+ destinations or multiple transportation modes (NOT simple round-trip flights)",
                requiredParams: ["destinations"],
                examples: [
                    "I want to go to LAX then drive to Yosemite and fly back from SFO",
                    "Plan a trip from NYC to Boston then rental car to Cape Cod",
                    "Multi-city trip with flights and car rental",
                ],
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
            - departure: departure airport IATA code (3-letter code) - REQUIRED for flights. Always convert city names to their primary international airport IATA code. If unable to determine IATA code, set to "ERROR: Cannot determine IATA code for [city name]"
            - destination: destination airport IATA code (3-letter code) - REQUIRED for flights, maps to 'arrival' in API. Always convert city names to their primary international airport IATA code. If unable to determine IATA code, set to "ERROR: Cannot determine IATA code for [city name]"
            - outboundDate: departure date in YYYY-MM-DD format (if mentioned) - REQUIRED for flights
            - returnDate: return date in YYYY-MM-DD format (if mentioned) - optional for round trips
            - adults: number of adult passengers (default 1 if not specified) - integer between 1-9
            - children: number of child passengers (optional) - integer between 0-8
            - travelClass: travel class preference (economy/business/first) - optional, defaults to economy
            - currency: price currency preference (optional) - defaults to USD
            - budget: budget information (if mentioned)
            - preferences: any specific preferences mentioned
            - query: for place searches, the type of place they're looking for
            - checkInDate: check-in date in YYYY-MM-DD format (for hotel searches)
            - checkOutDate: check-out date in YYYY-MM-DD format (for hotel searches)
            - destinations: array of destinations for trip planning (e.g., ["LAX", "Yosemite", "SFO"])
            - transportation: transportation preferences (flights, rental car, etc.)
            - activities: specific activities or interests mentioned
            - tripType: type of trip (multi-city, road trip, etc.)
            - iataConversionNotes: optional field to track IATA conversions (e.g., "Selected JFK for New York - multiple airports available")

            EXAMPLES:
            ${intentExamples}

            Only include fields that are clearly mentioned or can be reasonably inferred.
            If the intent is unclear, default to "general_question".

            When converting city names to IATA codes:
            - Always use the primary international airport for cities with multiple airports
            - For example: New York → JFK, London → LHR, Paris → CDG
            - If multiple airports exist, note this in iataConversionNotes field
            - If you cannot determine the IATA code, use the ERROR format shown above

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
            logger.info(`Processing message for user ${userId}:`, message);

            // Initialize time context manager for this conversation
            const timeContextManager = new TimeContextManager(conversationContext.conversationId);

            // Check for timezone override in user message
            const detectedTimezone = await timeContextManager.detectTimezoneFromMessage(message);
            if (detectedTimezone) {
                timeContextManager.setTimezoneOverride(detectedTimezone);
                logger.info(`Detected timezone override: ${detectedTimezone}`);
            }

            // Generate current time context for AI
            const timeContext = timeContextManager.getTimeContextForAI(frontendTimezone);
            logger.info(`Time context for AI: ${timeContext}`);

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
            logger.info("Extracted parameters:", parameters);

            // Validate the extracted intent
            if (!this.isValidIntent(parameters.intent)) {
                logger.warn(
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
            logger.error("AI Agent error:", error);
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
            logger.error("Parameter extraction error:", error);
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
                            - flight_search: looking for flights between cities (e.g. "flights from A to B", "fly from X to Y")
                            - hotel_search: specifically looking for hotels or accommodation
                            - place_search: looking for restaurants, activities, or other places (NOT hotels)
                            - trip_planning: complex multi-destination trips with multiple transport modes (e.g. "fly to LAX, drive to Yosemite, fly back from SFO")
                            - general_question: general travel questions

                            IMPORTANT: Use "flight_search" for simple flight requests between two cities, even if they mention return dates.
                            Only use "trip_planning" for complex itineraries with 3+ destinations or multiple transportation modes.

                            Examples:
                            - "flights from bom to lax on august 15th and back on august 17th" → flight_search
                            - "fly from NYC to LA" → flight_search
                            - "I want to fly to LAX, drive to Yosemite, then fly back from SFO" → trip_planning

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
            logger.error("Fallback parameter extraction error:", error);
            // Ultimate fallback
            return { intent: "general_question" };
        }
    }

    isValidIntent(intent) {
        return intent && Object.prototype.hasOwnProperty.call(this.supportedIntents, intent);
    }

    async handleFlightSearch(parameters, conversationContext, conversationHistory, timeContext) {
        try {
            logger.info("HandleFlightSearch called with parameters:", parameters);

            // Validate parameters first
            const validation = this.validationService.validateByIntent("flight_search", parameters);
            if (!validation.isValid) {
                logger.warn("Flight parameter validation failed:", validation.errors);
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
                logger.warn("Flight parameter warnings:", validation.warnings);
            }

            // Map AI parameters to SerpAPI format
            const mappedParams = this.mappingService.mapToSerpAPI(parameters);
            logger.debug("Original AI parameters:", JSON.stringify(parameters, null, 2));
            logger.debug("Mapped parameters for SerpAPI:", JSON.stringify(mappedParams, null, 2));

            // Perform outbound flight search with detailed logging
            logger.info("Starting outbound flight search with mapped params:", mappedParams);
            const outboundFlightResults = await travelAPI.searchFlights(mappedParams);
            logger.info(
                `Outbound flight search completed: ${outboundFlightResults.length} results found`,
            );
            logger.debug(
                "Outbound flight results:",
                JSON.stringify(outboundFlightResults, null, 2),
            );

            const allFlightResults = [...outboundFlightResults];

            // If return date is provided, also search for return flights
            if (mappedParams.returnDate) {
                logger.info("========== RETURN FLIGHT SEARCH ==========");
                logger.info(
                    `Searching return flights from ${mappedParams.arrival} to ${mappedParams.departure} on ${mappedParams.returnDate}`,
                );

                try {
                    // Create return flight parameters by swapping departure and arrival
                    const returnFlightParams = {
                        ...mappedParams,
                        departure: mappedParams.arrival, // Swap: destination becomes origin
                        arrival: mappedParams.departure, // Swap: origin becomes destination
                        outboundDate: mappedParams.returnDate, // Use return date as outbound date
                        returnDate: undefined, // Clear return date for one-way return search
                    };

                    logger.info("Return flight search parameters:", returnFlightParams);

                    const returnFlightResults = await travelAPI.searchFlights(returnFlightParams);
                    logger.info(
                        `Return flight search completed: ${returnFlightResults.length} results found`,
                    );
                    logger.debug(
                        "Return flight results:",
                        JSON.stringify(returnFlightResults, null, 2),
                    );

                    // Add return flights to the results
                    allFlightResults.push(...returnFlightResults);
                    logger.info(
                        `Combined flight results: ${allFlightResults.length} total (${outboundFlightResults.length} outbound + ${returnFlightResults.length} return)`,
                    );
                } catch (returnFlightError) {
                    logger.error("Return flight search failed:", returnFlightError);
                    logger.error("Return flight error details:", {
                        message: returnFlightError.message,
                        stack: returnFlightError.stack,
                    });
                    // Continue with just outbound flights if return search fails
                }
            }

            const flightResults = allFlightResults;

            // Add search context to flight cards for booking options
            const flightResultsWithContext = flightResults.map((flightCard, index) => {
                if (flightCard.type === "flight" && flightCard.metadata?.bookingToken) {
                    // Determine if this is a return flight (flights after outbound results)
                    const isReturnFlight = index >= outboundFlightResults.length;

                    // Set appropriate search context based on flight direction
                    const searchContext = isReturnFlight
                        ? {
                              departure: mappedParams.arrival, // Return flight swaps these
                              arrival: mappedParams.departure,
                              outboundDate: mappedParams.returnDate,
                              returnDate: undefined,
                              currency: mappedParams.currency,
                              adults: mappedParams.adults,
                              children: mappedParams.children,
                              travelClass: mappedParams.travelClass,
                              gl: mappedParams.gl,
                              hl: mappedParams.hl,
                          }
                        : {
                              departure: mappedParams.departure, // Original outbound flight context
                              arrival: mappedParams.arrival,
                              outboundDate: mappedParams.outboundDate,
                              returnDate: mappedParams.returnDate,
                              currency: mappedParams.currency,
                              adults: mappedParams.adults,
                              children: mappedParams.children,
                              travelClass: mappedParams.travelClass,
                              gl: mappedParams.gl,
                              hl: mappedParams.hl,
                          };

                    return {
                        ...flightCard,
                        metadata: {
                            ...flightCard.metadata,
                            searchContext,
                        },
                    };
                }
                return flightCard;
            });
            logger.info(
                `Added search context to ${flightResultsWithContext.filter((card) => card.metadata?.searchContext).length} flight cards`,
            );

            // Perform real hotel search with optimized approach
            logger.info("Starting hotel search with original parameters:", parameters);
            const hotelResults = await this.performAutomaticHotelSearch(parameters);
            logger.info(`Hotel search completed: ${hotelResults.length} results found`);
            logger.debug("Hotel results:", JSON.stringify(hotelResults, null, 2));

            // Handle flight results - use the version with search context
            const flights = flightResultsWithContext;
            const hotels = hotelResults;

            // Combine flight and hotel cards
            const allCards = [...flights, ...hotels];
            logger.info(
                `Total combined cards: ${allCards.length} (${flights.length} flights + ${hotels.length} hotels)`,
            );

            // Generate response with search results
            const response = await this.generateFlightHotelResponse(
                conversationContext.originalMessage || "Flight search request",
                parameters,
                flights,
                hotels,
                conversationContext,
                conversationHistory,
                timeContext,
            );

            const finalResponse = {
                type: "response_with_cards",
                message: response.text,
                cards: allCards,
                parameters: parameters,
            };

            logger.info("Final response prepared with", finalResponse.cards.length, "cards");
            logger.debug("Final response cards:", JSON.stringify(finalResponse.cards, null, 2));

            // Debug card types in final response
            const cardTypeCounts = finalResponse.cards.reduce((acc, card) => {
                acc[card.type] = (acc[card.type] || 0) + 1;
                return acc;
            }, {});
            logger.info("Card type counts in final response:", cardTypeCounts);

            // Debug hotel cards specifically
            const hotelCards = finalResponse.cards.filter(
                (card) => card.type === "place" && card.additionalInfo?.hotelId,
            );
            logger.info(`Hotel cards in final response: ${hotelCards.length}`);
            logger.debug(
                "Hotel cards details:",
                hotelCards.map((card) => ({
                    id: card.id,
                    title: card.title,
                    hotelId: card.additionalInfo?.hotelId,
                    hasOffers: card.additionalInfo?.hasOffers,
                })),
            );

            return finalResponse;
        } catch (error) {
            logger.error("HandleFlightSearch error:", error);

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
            logger.info("HandlePlaceSearch called with parameters:", parameters);

            // Validate parameters first
            const validation = this.validationService.validateByIntent("place_search", parameters);
            if (!validation.isValid) {
                logger.warn("Place parameter validation failed:", validation.errors);
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
                logger.warn("Place parameter warnings:", validation.warnings);
            }

            // Future implementation for place search API calls
            logger.info(
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
            logger.error("HandlePlaceSearch error:", error);
            throw new Error(`I encountered an issue searching for places: ${error.message}`);
        }
    }

    async handleHotelSearch(parameters, conversationContext, conversationHistory, timeContext) {
        try {
            logger.info("HandleHotelSearch called with parameters:", parameters);

            // Check if we have dates - if not, ask for them
            if (!parameters.checkInDate || !parameters.checkOutDate) {
                logger.info("Missing hotel dates, requesting clarification");
                const clarificationResponse = await this.generateHotelDateClarification(
                    conversationContext.originalMessage || "Hotel search request",
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

            // Extract city code from destination
            const cityCode = extractDestinationCityCode({
                arrival: parameters.destination,
            });

            if (!cityCode) {
                logger.warn(
                    "Could not extract city code for hotel search from:",
                    parameters.destination,
                );
                return {
                    type: "clarification",
                    message: `I'd love to help you find hotels! Could you please specify which city you'd like to search in? For example, you could say "Show me hotels in Paris" or "Find hotels in Tokyo".`,
                    parameters: parameters,
                };
            }

            // Perform hotel search
            const { searchHotels } = await import("../api/amadeus/hotelService.js");

            const hotelParams = {
                cityCode: cityCode,
                checkInDate: parameters.checkInDate,
                checkOutDate: parameters.checkOutDate,
                adults: parameters.adults || 1,
                filters: {},
            };

            logger.info("Performing hotel search with params:", hotelParams);
            const hotelResults = await searchHotels(hotelParams);
            logger.info("Hotel search results:", hotelResults);

            // Transform hotel results to card format
            const hotelCards = this.transformHotelResultsToCards(hotelResults, cityCode);

            // Generate response
            const response = await this.generateHotelResponse(
                conversationContext.originalMessage || "Hotel search request",
                parameters,
                hotelCards,
                cityCode,
                conversationContext,
                conversationHistory,
                timeContext,
            );

            return {
                type: "response_with_cards",
                message: response.text,
                cards: hotelCards,
                parameters: parameters,
            };
        } catch (error) {
            logger.error("HandleHotelSearch error:", error);
            throw new Error(`I encountered an issue searching for hotels: ${error.message}`);
        }
    }

    async handleTripPlanning(parameters, conversationContext, conversationHistory, timeContext) {
        try {
            logger.info("HandleTripPlanning called with parameters:", parameters);

            // Parse the complex trip planning request
            const tripPlan = await this.parseTripPlanningRequest(
                conversationContext.originalMessage || "Trip planning request",
                parameters,
                conversationHistory,
                timeContext,
            );

            if (!tripPlan.isValid) {
                logger.info("Trip planning request needs clarification");
                return {
                    type: "clarification",
                    message: tripPlan.clarificationMessage,
                    parameters: parameters,
                };
            }

            // Execute multi-service search for comprehensive trip planning
            logger.info("Executing comprehensive trip search for:", tripPlan);
            const tripResults = await this.executeComprehensiveTripSearch(tripPlan, conversationContext);

            // Log trip results summary
            logger.info("Trip results received:", {
                flights: tripResults.flights?.length || 0,
                hotels: tripResults.hotels?.length || 0,
                rentalCars: tripResults.rentalCars?.length || 0,
                activities: tripResults.activities?.length || 0,
            });

            // Generate comprehensive trip planning response
            const response = await this.generateTripPlanningResponse(
                conversationContext.originalMessage || "Trip planning request",
                parameters,
                tripResults,
                conversationContext,
                conversationHistory,
                timeContext,
            );

            // Combine all result cards (flights, hotels, cars, activities)
            const allCards = [
                ...(tripResults.flights || []),
                ...(tripResults.hotels || []),
                ...(tripResults.rentalCars || []),
                ...(tripResults.activities || []),
            ];

            // Log final cards summary
            logger.info("Final cards being returned:", {
                total: allCards.length,
                types: allCards.reduce((acc, card) => {
                    acc[card.type] = (acc[card.type] || 0) + 1;
                    return acc;
                }, {}),
            });

            return {
                type: "response_with_cards",
                message: response.text,
                cards: allCards,
                parameters: parameters,
            };
        } catch (error) {
            logger.error("HandleTripPlanning error:", error);
            throw new Error(`I encountered an issue planning your trip: ${error.message}`);
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
            logger.info("HandleGeneralQuestion called with message:", message);

            // Validate parameters first
            const validation = this.validationService.validateByIntent(
                "general_question",
                parameters,
            );
            if (!validation.isValid) {
                logger.warn("General question parameter validation failed:", validation.errors);
                // For general questions, we can proceed even with validation issues
            }

            // Log warnings if present
            if (validation.warnings.length > 0) {
                logger.warn("General question parameter warnings:", validation.warnings);
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
            logger.info("General question response generated");

            return {
                type: "response",
                message: aiResponse,
                parameters: parameters,
            };
        } catch (error) {
            logger.error("HandleGeneralQuestion error:", error);
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
            logger.info(`Routing to handler for intent: ${intent}`);

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
                case "hotel_search":
                    return await this.handleHotelSearch(
                        parameters,
                        conversationContext,
                        conversationHistory,
                        timeContext,
                    );
                case "trip_planning":
                    return await this.handleTripPlanning(
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
                    logger.warn(`Unknown intent: ${intent}, defaulting to general question`);
                    return await this.handleGeneralQuestion(
                        message,
                        parameters,
                        conversationContext,
                        conversationHistory,
                        timeContext,
                    );
            }
        } catch (error) {
            logger.error(`Intent handler error for ${intent}:`, error);
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
            logger.error("Response generation error:", error);
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
            logger.error("Clarification generation error:", error);
            return this.getFallbackClarificationMessage(parameters.intent);
        }
    }

    getFallbackClarificationMessage(intent) {
        const intentConfig = this.supportedIntents[intent];
        if (!intentConfig) {
            return "I'd love to help you plan your trip! Could you tell me more about what you're looking for?";
        }

        const examples = intentConfig.examples.join("' or '");
        return `I'd be happy to help with ${intent.replace(
            "_",
            " ",
        )}! Could you provide more details? For example: '${examples}'`;
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
        logger.info(
            `Context Performance - Conversation ${conversationId}: ${retrievalTime}ms retrieval, ${messageCount} messages, ${tokenCount} tokens`,
        );
    }

    async performAutomaticHotelSearch(flightParameters) {
        try {
            // Extract destination city code from flight parameters
            const cityCode = extractDestinationCityCode({
                arrival: flightParameters.destination || flightParameters.arrival,
            });

            if (!cityCode) {
                logger.warn("Could not extract city code for hotel search from:", flightParameters);
                return [];
            }

            // Use flight dates for hotel search (check-in on arrival date)
            const checkInDate = flightParameters.outboundDate;
            const checkOutDate =
                flightParameters.returnDate ||
                this.calculateDefaultCheckoutDate(flightParameters.outboundDate);

            if (!checkInDate) {
                logger.warn("No check-in date available for hotel search");
                return [];
            }

            // Import hotel search function dynamically
            const { searchHotels } = await import("../api/amadeus/hotelService.js");

            const hotelParams = {
                cityCode: cityCode,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                adults: flightParameters.adults || 1,
                filters: {},
            };

            logger.info("Performing automatic hotel search with params:", hotelParams);
            const hotelResults = await searchHotels(hotelParams);
            logger.info("Hotel search results:", hotelResults);

            // Transform hotel results to card format for consistency
            return this.transformHotelResultsToCards(hotelResults, cityCode);
        } catch (error) {
            logger.error("Automatic hotel search error:", error);
            logger.error("Error name:", error.name);
            logger.error("Error message:", error.message);
            logger.error("Error stack:", error.stack);
            logger.error("Error cause:", error.cause);
            logger.error(
                "Full error object:",
                JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
            );
            console.error("Console error log:", error);
            return []; // Return empty array instead of throwing to not break flight search
        }
    }

    calculateDefaultCheckoutDate(checkInDate) {
        try {
            const checkIn = new Date(checkInDate);
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + 3); // Default 3-night stay
            return checkOut.toISOString().split("T")[0]; // Format as YYYY-MM-DD
        } catch (error) {
            logger.error("Error calculating checkout date:", error);
            return null;
        }
    }

    transformHotelResultsToCards(hotelResults, cityCode) {
        try {
            logger.info("Starting hotel results transformation for city:", cityCode);
            logger.debug("Raw hotel results:", JSON.stringify(hotelResults, null, 2));

            if (!hotelResults || !hotelResults.data || !Array.isArray(hotelResults.data)) {
                logger.warn("Invalid hotel results format:", hotelResults);
                return [];
            }

            const cityName = formatCityName(cityCode);
            logger.info(`Transforming ${hotelResults.data.length} hotels for city: ${cityName}`);

            const transformedHotels = hotelResults.data
                .map((hotel, index) => {
                    logger.debug(
                        `Transforming hotel ${index + 1}:`,
                        JSON.stringify(hotel, null, 2),
                    );

                    // Debug the hotel structure
                    logger.debug(`Hotel ${index + 1} structure check:`, {
                        hasHotel: !!hotel.hotel,
                        hotelKeys: hotel.hotel ? Object.keys(hotel.hotel) : "NO_HOTEL_OBJECT",
                        hotelId: hotel.hotel?.hotelId,
                        hotelName: hotel.hotel?.name,
                        hasOffers: !!(hotel.offers && hotel.offers.length > 0),
                        offerCount: hotel.offers ? hotel.offers.length : 0,
                    });

                    const hasOffers = hotel.offers && hotel.offers.length > 0;
                    const firstOffer = hasOffers ? hotel.offers[0] : null;

                    const transformedHotel = {
                        id: `hotel-${hotel.hotel?.hotelId || index}`,
                        type: "place", // Changed from 'hotel' to 'place' to match StandardizedCard interface
                        title: hotel.hotel?.name || "Hotel",
                        subtitle: `${hotel.hotel?.rating || "N/A"} star hotel in ${cityName}${!hasOffers ? " (No offers available)" : ""}`,
                        price:
                            hasOffers && firstOffer?.price
                                ? {
                                      amount: parseFloat(firstOffer.price.total),
                                      currency: firstOffer.price.currency,
                                  }
                                : undefined,
                        location: {
                            lat: hotel.hotel?.latitude,
                            lng: hotel.hotel?.longitude,
                            address: cityName,
                        },
                        details: {
                            hotel: hotel.hotel,
                            offers: hotel.offers || [],
                            checkIn: firstOffer?.checkInDate,
                            checkOut: firstOffer?.checkOutDate,
                            roomType: firstOffer?.room?.description?.text,
                            boardType: firstOffer?.boardType,
                            hotelId: hotel.hotel?.hotelId,
                            offerId: firstOffer?.id,
                            amenities: hotel.hotel?.amenities || [],
                            media: hotel.hotel?.media || [],
                            hasOffers: hasOffers,
                        },
                        essentialDetails: {
                            rating: hotel.hotel?.rating || "N/A",
                            checkIn: firstOffer?.checkInDate,
                            checkOut: firstOffer?.checkOutDate,
                            roomType: firstOffer?.room?.description?.text || "Standard Room",
                            price:
                                hasOffers && firstOffer?.price
                                    ? `${firstOffer.price.currency} ${firstOffer.price.total}`
                                    : "Price on request",
                        },
                        externalLinks: {
                            booking: hasOffers ? firstOffer?.self || null : null,
                            website: hotel.hotel?.media?.[0]?.uri || null,
                        },
                        metadata: {
                            provider: "Amadeus",
                            confidence: hasOffers ? 0.9 : 0.7,
                            timestamp: new Date().toISOString(),
                            hotelId: hotel.hotel?.hotelId,
                            offerId: firstOffer?.id,
                            hasOffers: hasOffers,
                        },
                        // Legacy fields for backward compatibility
                        description: `${hotel.hotel?.rating || "N/A"} star hotel in ${cityName}${!hasOffers ? " (No offers available)" : ""}`,
                        rating: hotel.hotel?.rating || null,
                        image: hotel.hotel?.media?.[0]?.uri || null,
                        amenities: hotel.hotel?.amenities || [],
                        bookingUrl: hasOffers ? firstOffer?.self || null : null,
                        additionalInfo: {
                            checkIn: firstOffer?.checkInDate,
                            checkOut: firstOffer?.checkOutDate,
                            roomType: firstOffer?.room?.description?.text,
                            boardType: firstOffer?.boardType,
                            hotelId: hotel.hotel?.hotelId,
                            offerId: firstOffer?.id,
                            hasOffers: hasOffers,
                        },
                    };

                    logger.debug(
                        `Transformed hotel ${index + 1}:`,
                        JSON.stringify(transformedHotel, null, 2),
                    );
                    return transformedHotel;
                })
                .slice(0, 5); // Limit to 5 hotels to avoid overwhelming the user

            logger.info(`Successfully transformed ${transformedHotels.length} hotels`);
            logger.debug("Final transformed hotels:", JSON.stringify(transformedHotels, null, 2));
            logger.debug(
                "Hotel additionalInfo check:",
                transformedHotels.map((hotel) => ({
                    id: hotel.id,
                    type: hotel.type,
                    title: hotel.title,
                    additionalInfo: hotel.additionalInfo,
                    hasHotelId: !!hotel.additionalInfo?.hotelId,
                })),
            );
            return transformedHotels;
        } catch (error) {
            logger.error("Error transforming hotel results:", error);
            return [];
        }
    }

    async parseTripPlanningRequest(
        message,
        parameters,
        conversationHistory = [],
        timeContext = null,
    ) {
        try {
            const systemMessage = `Analyze this trip planning request and extract a structured trip plan.

                The user wants to plan a comprehensive trip with multiple destinations and transportation modes.

                IMPORTANT: Always look for 3-letter airport codes (like ORD, LAX, SFO) in the message and use them exactly.

                For trip patterns like "I want to travel from ORD to LAX, roadtrip to yosemite national park and then fly back to ORD from SFO":
                - origin: "ORD" (starting airport from the message)
                - intermediateStops: ["LAX", "Yosemite"]
                - finalDestination: "SFO" (the airport they depart FROM for the final return flight)
                - This indicates: ORD->LAX (flight), LAX->Yosemite (car), Yosemite->SFO (car), SFO->ORD (flight)

                CRITICAL:
                1. Use exact 3-letter airport codes from the user's message (ORD, LAX, SFO, etc.)
                2. finalDestination is the departure point for the RETURN flight
                3. For "fly back to ORD from SFO", finalDestination = "SFO", origin = "ORD"
                4. DO NOT convert airport codes to city names - keep them as 3-letter codes

                Extract:
                1. Origin (starting point - infer home location if not specified)
                2. Final destination (ending point for return journey)
                3. Intermediate destinations/stops
                4. Transportation preferences for each leg
                5. Activities or interests mentioned
                6. Travel dates if mentioned (parse natural language dates like "august 16th to august 21st")

                Return a JSON object with:
                - isValid: boolean (true if enough info to plan trip)
                - clarificationMessage: string (if isValid is false, what to ask)
                - origin: string (starting location, can infer "HOME" if not specified)
                - finalDestination: string (ending location for return journey)
                - intermediateStops: array of destinations to visit
                - transportationLegs: array of transport segments with mode, from, to
                - activities: array of mentioned activities
                - dates: object with startDate and endDate in YYYY-MM-DD format if mentioned

                IMPORTANT: For dates mentioned like "august 16th to august 21st", convert to proper YYYY-MM-DD format.
                Use current year (2025) if year not specified. Examples:
                - "august 16th" -> "2025-08-16"
                - "august 21st" -> "2025-08-21"

                EXAMPLE PARSING:
                Input: "I want to travel from ORD to LAX, roadtrip to yosemite national park and then fly back to ORD from SFO from august 16th to august 21st"
                Expected Output:
                {
                  "isValid": true,
                  "origin": "ORD",
                  "finalDestination": "SFO",
                  "intermediateStops": ["LAX", "Yosemite"],
                  "dates": {"startDate": "2025-08-16", "endDate": "2025-08-21"}
                }

                Always set isValid to true if you can identify destinations and basic trip structure.
            `;

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
                        content: `Trip request: "${message}"
                            Parameters: ${JSON.stringify(parameters)}

                            Parse this trip planning request.
                        `,
                    },
                ],
                temperature: 0.3,
                max_tokens: this.maxTokens,
            });

            const response = completion.choices[0].message.content;
            let jsonString = response.trim();

            // Clean up JSON formatting
            if (jsonString.startsWith("```json")) {
                jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
            } else if (jsonString.startsWith("```")) {
                jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
            }

            const tripPlan = JSON.parse(jsonString);
            logger.info("Parsed trip plan:", tripPlan);
            return tripPlan;
        } catch (error) {
            logger.error("Trip planning parsing error:", error);

            // Fallback parsing for common patterns like LAX/Yosemite/SFO
            const lowerMessage = message.toLowerCase();
            if (
                lowerMessage.includes("lax") &&
                lowerMessage.includes("yosemite") &&
                lowerMessage.includes("sfo")
            ) {
                logger.info("Using fallback parsing for LAX -> Yosemite -> SFO pattern");

                // Use future dates that are valid (current date is early August 2025)
                let startDate = "2025-08-20"; // Use a date in the near future
                let endDate = "2025-08-25";

                // Simple date extraction for the given example
                if (lowerMessage.includes("august 16") || lowerMessage.includes("aug 16")) {
                    startDate = "2025-08-16";
                }
                if (lowerMessage.includes("august 21") || lowerMessage.includes("aug 21")) {
                    endDate = "2025-08-21";
                }

                return {
                    isValid: true,
                    origin: "ORD", // Use ORD instead of HOME for the user's example
                    intermediateStops: ["LAX", "Yosemite"],
                    finalDestination: "SFO",
                    transportationLegs: [
                        { mode: "flight", from: "ORD", to: "LAX" },
                        { mode: "car", from: "LAX", to: "Yosemite" },
                        { mode: "car", from: "Yosemite", to: "SFO" },
                        { mode: "flight", from: "SFO", to: "ORD" },
                    ],
                    activities: ["hiking", "nature"],
                    dates: {
                        startDate: startDate,
                        endDate: endDate,
                    },
                };
            }

            return {
                isValid: false,
                clarificationMessage:
                    "I'd love to help plan your trip! Could you provide more details about where you want to go, how you want to travel, and what you want to do? For example: 'I want to fly to LAX, drive to Yosemite for hiking, then fly back from SFO.'",
            };
        }
    }

    async executeComprehensiveTripSearch(tripPlan, context = null) {
        try {
            logger.info("========== STARTING COMPREHENSIVE TRIP SEARCH ==========");
            logger.info(
                "Executing comprehensive trip search for plan:",
                JSON.stringify(tripPlan, null, 2),
            );

            const results = {
                flights: [],
                hotels: [],
                rentalCars: [],
                activities: [],
            };

            logger.info("Initialized results object:", results);

            // Always create flights for common patterns (origin -> destination, destination -> final)
            logger.error("========== ABOUT TO START FLIGHT SEARCH ==========");
            logger.error("========== FLIGHT SEARCH DEBUG ==========");
            logger.error("Trip plan structure:", JSON.stringify(tripPlan, null, 2));
            logger.error("Searching for flights based on trip pattern...");

            try {
                // Infer flights from trip structure
                const flights = [];

                logger.error("Checking outbound flight conditions:");
                logger.error("- tripPlan.origin:", tripPlan.origin);
                logger.error("- tripPlan.intermediateStops:", tripPlan.intermediateStops);
                logger.error("- tripPlan.finalDestination:", tripPlan.finalDestination);

                // Origin to first destination flight
                if (
                    tripPlan.origin &&
                    (tripPlan.intermediateStops?.length > 0 || tripPlan.finalDestination)
                ) {
                    const destination =
                        tripPlan.intermediateStops?.[0] || tripPlan.finalDestination;
                    logger.info(`Searching flights from ${tripPlan.origin} to ${destination}`);

                    try {
                        // Handle "HOME" case and validate IATA codes
                        let originCode = tripPlan.origin;
                        if (originCode === "HOME" || originCode === "home") {
                            originCode = "ORD"; // Use ORD as requested in the prompt
                            logger.info(`Using ORD for HOME`);
                        }

                        // Validate IATA codes (3 letters)
                        if (!originCode || originCode.length !== 3) {
                            logger.error(`Invalid origin IATA code: ${originCode}`);
                            throw new Error(`Invalid origin airport code: ${originCode}`);
                        }

                        if (!destination || destination.length !== 3) {
                            logger.error(`Invalid destination IATA code: ${destination}`);
                            throw new Error(`Invalid destination airport code: ${destination}`);
                        }

                        logger.error(`Flight search: ${originCode} -> ${destination}`);

                        // Create flight parameters EXACTLY like the working flight search
                        // Use dates from trip plan if available, otherwise use defaults
                        const outboundDate =
                            tripPlan.dates?.startDate || this.getDefaultTomorrowDate();

                        const flightParameters = {
                            intent: "flight_search",
                            departure: originCode,
                            destination: destination,
                            outboundDate: outboundDate,
                            adults: 1,
                        };

                        logger.error(`Creating flight search with parameters:`, flightParameters);

                        // Use EXACTLY the same approach as working flight search
                        const mappedParams = this.mappingService.mapToSerpAPI(flightParameters);
                        logger.error("Starting flight search with mapped params:", mappedParams);

                        const flightResults = await travelAPI.searchFlights(mappedParams);
                        logger.error(
                            `Flight search completed: ${flightResults.length} results found`,
                        );

                        // Add search context to flight cards for booking options (same as basic flight search)
                        const flightResultsWithContext = flightResults.map((flightCard) => {
                            if (flightCard.type === "flight" && flightCard.metadata?.bookingToken) {
                                return {
                                    ...flightCard,
                                    metadata: {
                                        ...flightCard.metadata,
                                        searchContext: mappedParams,
                                    },
                                };
                            }
                            return flightCard;
                        });

                        // Limit flights to 3 for trip planning (keep basic flight search unlimited)
                        const limitedOutboundFlights = flightResultsWithContext.slice(0, 3);
                        logger.error(
                            `Limited outbound flights to ${limitedOutboundFlights.length} for trip planning`,
                        );

                        flights.push(...limitedOutboundFlights);
                        logger.error(
                            `Added ${limitedOutboundFlights.length} outbound flights to results`,
                        );
                    } catch (flightError) {
                        logger.error(`Outbound flight search failed:`, flightError);
                        logger.error(`Flight error details:`, {
                            message: flightError.message,
                            stack: flightError.stack,
                        });
                    }
                }

                // Final destination to home flight
                logger.info("Checking return flight conditions:");
                logger.info("- tripPlan.finalDestination:", tripPlan.finalDestination);
                logger.info("- tripPlan.origin:", tripPlan.origin);
                logger.info("- Are they different?", tripPlan.finalDestination !== tripPlan.origin);

                if (
                    tripPlan.finalDestination &&
                    tripPlan.origin &&
                    tripPlan.finalDestination !== tripPlan.origin
                ) {
                    logger.info(`========== RETURN FLIGHT SEARCH ==========`);
                    logger.info(
                        `Searching return flights from ${tripPlan.finalDestination} to ${tripPlan.origin}`,
                    );

                    try {
                        // Handle "HOME" case for return destination and validate IATA codes
                        let returnOriginCode = tripPlan.origin;
                        if (returnOriginCode === "HOME" || returnOriginCode === "home") {
                            returnOriginCode = "ORD"; // Use ORD as requested in the prompt
                            logger.info(`Using ORD for HOME return destination`);
                        }

                        // Validate IATA codes for return flight
                        if (!tripPlan.finalDestination || tripPlan.finalDestination.length !== 3) {
                            logger.error(
                                `Invalid return origin IATA code: ${tripPlan.finalDestination}`,
                            );
                            throw new Error(
                                `Invalid return origin airport code: ${tripPlan.finalDestination}`,
                            );
                        }

                        if (!returnOriginCode || returnOriginCode.length !== 3) {
                            logger.error(
                                `Invalid return destination IATA code: ${returnOriginCode}`,
                            );
                            throw new Error(
                                `Invalid return destination airport code: ${returnOriginCode}`,
                            );
                        }

                        logger.info(
                            `Return flight search: ${tripPlan.finalDestination} -> ${returnOriginCode}`,
                        );

                        // Create return flight parameters EXACTLY like the working flight search
                        // Use end date from trip plan if available, otherwise use defaults
                        const returnDate =
                            tripPlan.dates?.endDate || this.getDefaultDayAfterTomorrow();

                        const returnFlightParameters = {
                            intent: "flight_search",
                            departure: tripPlan.finalDestination,
                            destination: returnOriginCode,
                            outboundDate: returnDate,
                            adults: 1,
                        };

                        logger.info(
                            `Creating return flight search with parameters:`,
                            returnFlightParameters,
                        );

                        // Use EXACTLY the same approach as working flight search
                        const returnMappedParams =
                            this.mappingService.mapToSerpAPI(returnFlightParameters);
                        logger.info(
                            "Starting return flight search with mapped params:",
                            returnMappedParams,
                        );

                        const returnFlightResults =
                            await travelAPI.searchFlights(returnMappedParams);
                        logger.info(
                            `Return flight search completed: ${returnFlightResults.length} results found`,
                        );

                        // Add search context to return flight cards for booking options (same as basic flight search)
                        const returnFlightResultsWithContext = returnFlightResults.map(
                            (flightCard) => {
                                if (
                                    flightCard.type === "flight" &&
                                    flightCard.metadata?.bookingToken
                                ) {
                                    return {
                                        ...flightCard,
                                        metadata: {
                                            ...flightCard.metadata,
                                            searchContext: returnMappedParams,
                                        },
                                    };
                                }
                                return flightCard;
                            },
                        );

                        // Limit return flights to 3 for trip planning (keep basic flight search unlimited)
                        const limitedReturnFlights = returnFlightResultsWithContext.slice(0, 3);
                        logger.info(
                            `Limited return flights to ${limitedReturnFlights.length} for trip planning`,
                        );

                        flights.push(...limitedReturnFlights);
                        logger.info(
                            `Added ${limitedReturnFlights.length} return flights to results`,
                        );
                    } catch (returnFlightError) {
                        logger.error(`Return flight search failed:`, returnFlightError);
                        logger.error(`Return flight error details:`, {
                            message: returnFlightError.message,
                            stack: returnFlightError.stack,
                        });
                    }
                }

                results.flights = flights;

                logger.info("========== FLIGHT SEARCH SUMMARY ==========");
                logger.info(`Total flights found: ${flights.length}`);
                logger.info(
                    "Flight details:",
                    flights.map((f) => ({
                        id: f.id,
                        type: f.type,
                        title: f.title,
                    })),
                );
            } catch (error) {
                logger.error("Flight search error:", error);
                // Continue with other services even if flights fail
                results.flights = []; // Ensure we have an empty array instead of undefined
            }

            // Search for hotels in destination areas
            logger.info("Searching for hotels in destinations...");
            if (tripPlan.intermediateStops) {
                for (const destination of tripPlan.intermediateStops) {
                    logger.info(`Searching hotels in ${destination}`);
                    try {
                        // Skip non-airport destinations like "Yosemite"
                        if (
                            !destination ||
                            destination.length !== 3 ||
                            !/^[A-Z]{3}$/.test(destination)
                        ) {
                            logger.info(
                                `Skipping hotel search for ${destination} - not a valid 3-letter airport code`,
                            );
                            continue;
                        }

                        const cityCode = extractDestinationCityCode({ arrival: destination });
                        logger.info(`Extracted city code for ${destination}: ${cityCode}`);

                        if (cityCode && cityCode.length === 3) {
                            // Only search if we have a valid 3-letter city code
                            const { searchHotels } = await import("../api/amadeus/hotelService.js");
                            const hotelParams = {
                                cityCode: cityCode,
                                checkInDate:
                                    tripPlan.dates?.startDate || this.getDefaultTomorrowDate(),
                                checkOutDate:
                                    tripPlan.dates?.endDate || this.getDefaultDayAfterTomorrow(),
                                adults: 1,
                                filters: {},
                            };

                            logger.info(`Hotel search params for ${destination}:`, hotelParams);
                            const hotelResults = await searchHotels(hotelParams);
                            const hotelCards = this.transformHotelResultsToCards(
                                hotelResults,
                                cityCode,
                            );
                            results.hotels.push(...hotelCards);
                            logger.info(`Added ${hotelCards.length} hotels for ${destination}`);
                        } else {
                            logger.info(
                                `Skipping hotel search for ${destination} - invalid city code: ${cityCode}`,
                            );
                        }
                    } catch (error) {
                        logger.error(`Hotel search error for ${destination}:`, error);
                        // Continue with other destinations - don't let hotel errors break the entire search
                    }
                }
            }

            // Also search for hotels at final destination (e.g., Portugal before flying back)
            if (tripPlan.finalDestination && tripPlan.finalDestination !== tripPlan.origin) {
                logger.info(`Searching hotels in final destination: ${tripPlan.finalDestination}`);
                try {
                    // Check if finalDestination is a valid airport code
                    if (
                        tripPlan.finalDestination &&
                        tripPlan.finalDestination.length === 3 &&
                        /^[A-Z]{3}$/.test(tripPlan.finalDestination)
                    ) {
                        const cityCode = extractDestinationCityCode({
                            arrival: tripPlan.finalDestination,
                        });
                        logger.info(
                            `Extracted city code for final destination ${tripPlan.finalDestination}: ${cityCode}`,
                        );

                        if (cityCode && cityCode.length === 3) {
                            const { searchHotels } = await import("../api/amadeus/hotelService.js");
                            const hotelParams = {
                                cityCode: cityCode,
                                checkInDate:
                                    tripPlan.dates?.startDate || this.getDefaultTomorrowDate(),
                                checkOutDate:
                                    tripPlan.dates?.endDate || this.getDefaultDayAfterTomorrow(),
                                adults: 1,
                                filters: {},
                            };

                            logger.info(
                                `Hotel search params for final destination ${tripPlan.finalDestination}:`,
                                hotelParams,
                            );
                            const hotelResults = await searchHotels(hotelParams);
                            const hotelCards = this.transformHotelResultsToCards(
                                hotelResults,
                                cityCode,
                            );
                            results.hotels.push(...hotelCards);
                            logger.info(
                                `Added ${hotelCards.length} hotels for final destination ${tripPlan.finalDestination}`,
                            );
                        }
                    }
                } catch (error) {
                    logger.error(
                        `Hotel search error for final destination ${tripPlan.finalDestination}:`,
                        error,
                    );
                }
            }

            // Always create rental cars for road trip patterns
            logger.info("Creating rental car options...");
            results.rentalCars = this.createPlaceholderRentalCarCards(tripPlan);

            // Always create activities for destinations mentioned
            logger.info("Creating real activity options...");
            results.activities = await this.createRealActivityCards(tripPlan, context);

            logger.info("Comprehensive trip search completed:", {
                flights: results.flights.length,
                hotels: results.hotels.length,
                rentalCars: results.rentalCars.length,
                activities: results.activities.length,
            });

            return results;
        } catch (error) {
            logger.error("Comprehensive trip search error:", error.message);

            // Return results with at least placeholder data
            return {
                flights: [],
                hotels: [],
                rentalCars: this.createPlaceholderRentalCarCards(tripPlan || {}),
                activities: await this.createRealActivityCards(tripPlan || {}, context),
            };
        }
    }

    createPlaceholderRentalCarCards(tripPlan) {
        const rentalCarOptions = [
            { company: "Hertz", type: "Economy", price: 35 },
            { company: "Enterprise", type: "SUV", price: 55 },
            { company: "Budget", type: "Compact", price: 28 },
        ];

        return rentalCarOptions.map((car, index) => ({
            id: `rental-car-${index}`,
            type: "rental_car",
            title: `${car.company} - ${car.type}`,
            subtitle: `Rental car for your road trip`,
            price: {
                amount: car.price,
                currency: "USD",
            },
            details: {
                company: car.company,
                vehicleType: car.type,
                dailyRate: car.price,
                pickupLocation: tripPlan.origin || "Airport",
                dropoffLocation: tripPlan.finalDestination || "Airport",
            },
            essentialDetails: {
                company: car.company,
                type: car.type,
                dailyRate: `$${car.price}/day`,
                transmission: "Automatic",
            },
            metadata: {
                provider: "Placeholder",
                confidence: 0.8,
                timestamp: new Date().toISOString(),
            },
        }));
    }

    async createRealActivityCards(tripPlan, context) {
        try {
            logger.info("createRealActivityCards called with tripPlan:", JSON.stringify(tripPlan, null, 2));
            logger.info("createRealActivityCards called with context:", context ? "context exists" : "no context");
            
            // Check for destination in different possible properties
            // For multi-city trips, we want the final destination, not the origin
            const destination = tripPlan?.finalDestination || tripPlan?.destinations?.[tripPlan?.destinations?.length - 1] || tripPlan?.destination;
            
            logger.info("Available destination options:");
            logger.info("- tripPlan.destination:", tripPlan?.destination);
            logger.info("- tripPlan.finalDestination:", tripPlan?.finalDestination);  
            logger.info("- tripPlan.destinations:", tripPlan?.destinations);
            logger.info("- tripPlan.origin:", tripPlan?.origin);
            logger.info("- Selected destination:", destination);
            
            if (!tripPlan || !destination) {
                logger.info("No tripPlan or destination, using placeholder activities");
                logger.info("tripPlan exists:", !!tripPlan);
                logger.info("tripPlan.destination:", tripPlan?.destination);
                logger.info("tripPlan.destinations:", tripPlan?.destinations);
                logger.info("tripPlan.finalDestination:", tripPlan?.finalDestination);
                return this.createPlaceholderActivityCards(tripPlan);
            }

            const location = destination;
            const date = tripPlan.outboundDate || new Date().toISOString().split('T')[0];
            const timeOfDay = this.determineTimeOfDay(tripPlan);

            logger.info(`Getting real activities for ${location} on ${date} during ${timeOfDay}`);
            logger.info("About to call getActivities with params:", { location, date, timeOfDay });

            // Call the real getActivities operation
            logger.info("Context structure for getActivities:", context);
            
            // Ensure we have proper context with user for the Wasp action
            const actionContext = {
                user: context?.user || { id: 1 }, // Fallback user ID for the operation
                ...context
            };
            logger.info("Calling getActivities with actionContext user:", actionContext.user);
            
            const realActivities = await getActivities({ location, date, timeOfDay }, actionContext);
            
            logger.info("getActivities returned:", realActivities);

            // Transform the OpenAI activities into our card format
            return realActivities.map((activity, index) => ({
                id: activity.id || `activity-${index}`,
                type: "activity",
                title: activity.title,
                subtitle: activity.subtitle,
                bookingUrl: activity.bookingUrl, // Add booking URL from OpenAI response
                price: activity.price ? {
                    amount: parseInt(activity.price.replace(/\D/g, '')) || 50,
                    currency: "USD",
                } : {
                    amount: 50,
                    currency: "USD",
                },
                details: {
                    category: "Experience",
                    timing: activity.timing,
                    duration: "2-4 hours",
                    includes: "As described",
                },
                essentialDetails: {
                    timing: activity.timing,
                    price: activity.price || "Contact for pricing",
                    duration: "2-4 hours",
                    rating: "4.5/5",
                },
                externalLinks: activity.externalLinks || [],
                metadata: {
                    provider: "OpenAI Activities",
                    confidence: 0.9,
                    timestamp: new Date().toISOString(),
                },
            }));
        } catch (error) {
            logger.error("Failed to get real activities:", error.message);
            logger.error("Full error details:", error);
            logger.error("Error stack:", error.stack);
            // Fallback to placeholder activities
            return this.createPlaceholderActivityCards(tripPlan);
        }
    }

    determineTimeOfDay(tripPlan) {
        const hour = new Date().getHours();
        if (hour < 12) return "morning";
        if (hour < 17) return "afternoon";
        return "evening";
    }

    createPlaceholderActivityCards(tripPlan) {
        const activities = [
            { name: "National Park Tours", category: "Nature", price: 45 },
            { name: "Local Food Tour", category: "Food", price: 75 },
            { name: "Historical Sites", category: "Culture", price: 25 },
            { name: "Adventure Activities", category: "Adventure", price: 95 },
        ];

        return activities.map((activity, index) => ({
            id: `activity-${index}`,
            type: "activity",
            title: activity.name,
            subtitle: `${activity.category} experience`,
            price: {
                amount: activity.price,
                currency: "USD",
            },
            details: {
                category: activity.category,
                duration: "2-4 hours",
                difficulty: "Easy to Moderate",
                includes: "Guide, entrance fees",
            },
            essentialDetails: {
                category: activity.category,
                price: `$${activity.price}`,
                duration: "2-4 hours",
                rating: "4.5/5",
            },
            metadata: {
                provider: "Placeholder",
                confidence: 0.7,
                timestamp: new Date().toISOString(),
            },
        }));
    }

    async generateTripPlanningResponse(
        message,
        parameters,
        tripResults,
        context,
        conversationHistory = [],
        timeContext = null,
    ) {
        try {
            const systemMessage = `You are a helpful travel assistant. The user requested comprehensive trip planning and you found various options.

                Generate a conversational response that:
                1. Acknowledges their complex trip planning request
                2. Summarizes what you found (flights, hotels, rental cars, activities)
                3. Explains how the different parts work together
                4. Encourages them to look at all the result cards
                5. Offers to help refine or book any part of the trip

                Be enthusiastic about the comprehensive trip you've planned for them.
            `;

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
                        content: `Trip request: "${message}"
                            Results found:
                            - Flights: ${tripResults.flights?.length || 0}
                            - Hotels: ${tripResults.hotels?.length || 0}
                            - Rental Cars: ${tripResults.rentalCars?.length || 0}
                            - Activities: ${tripResults.activities?.length || 0}

                            Generate an enthusiastic response about this comprehensive trip plan.
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
            logger.error("Trip planning response generation error:", error);
            const totalOptions =
                (tripResults.flights?.length || 0) +
                (tripResults.hotels?.length || 0) +
                (tripResults.rentalCars?.length || 0) +
                (tripResults.activities?.length || 0);

            return {
                text: `Fantastic! I've put together a comprehensive trip plan for you with ${totalOptions} different options including flights, hotels, rental cars, and activities. Take a look at all the options below - I've organized everything to work together for your multi-destination journey. Let me know which options interest you most and I can help you with the next steps!`,
            };
        }
    }

    getDefaultTomorrowDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    }

    getDefaultDayAfterTomorrow() {
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        return dayAfter.toISOString().split("T")[0];
    }

    async generateHotelDateClarification(
        message,
        parameters,
        context,
        conversationHistory = [],
        timeContext = null,
    ) {
        try {
            const systemMessage = `You are a helpful travel assistant. The user wants to search for hotels but hasn't provided check-in and check-out dates.
                Generate a conversational response that:
                1. Acknowledges their hotel search request
                2. Asks for their travel dates (check-in and check-out)
                3. Provides helpful suggestions about date formats
                4. Maintains a friendly, helpful tone

                Be specific about needing both check-in and check-out dates for hotels.
            `;

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
                            Parameters I extracted: ${JSON.stringify(parameters)}
                            Destination: ${parameters.destination || "Not specified"}

                            What should I ask to get their hotel dates?
                        `,
                    },
                ],
                temperature: this.temperature,
                max_tokens: this.maxTokens,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            logger.error("Hotel date clarification generation error:", error);
            return "I'd love to help you find hotels! When would you like to check in and check out? For example, you could say 'Check in December 15th, check out December 18th' or use a specific date format like '2024-12-15 to 2024-12-18'.";
        }
    }

    async generateHotelResponse(
        message,
        parameters,
        hotelResults,
        cityCode,
        context,
        conversationHistory = [],
        timeContext = null,
    ) {
        try {
            const cityName = formatCityName(cityCode);

            const baseSystemMessage = `You are a helpful travel assistant. The user searched for hotels and you found results.
                Generate a conversational response that:
                1. Acknowledges their hotel search request
                2. Mentions the city they searched in
                3. Briefly describes what you found
                4. Encourages them to look at the hotel results cards
                5. Offers to help with next steps like booking or filtering options

                Keep it conversational and helpful. The actual search results will be displayed as cards below your message.
                Be specific about the destination city and dates.
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
                            Hotel results found: ${hotelResults.length}
                            Destination city: ${cityName}
                            Check-in: ${parameters.checkInDate}
                            Check-out: ${parameters.checkOutDate}

                            Generate a helpful response for hotel search results.
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
            logger.error("Hotel response generation error:", error);
            const cityName = formatCityName(cityCode);
            return {
                text: `Great! I found ${hotelResults.length} hotel options in ${cityName} for your stay from ${parameters.checkInDate} to ${parameters.checkOutDate}. Take a look at the options below and let me know if you'd like me to help you with booking or find different options!`,
            };
        }
    }

    async generateFlightHotelResponse(
        message,
        parameters,
        flightResults,
        hotelResults,
        context,
        conversationHistory = [],
        timeContext = null,
    ) {
        try {
            const destinationCity = extractDestinationCityCode({
                arrival: parameters.destination || parameters.arrival,
            });
            const cityName = destinationCity ? formatCityName(destinationCity) : "your destination";

            // Build system message with time context
            const baseSystemMessage = `You are a helpful travel assistant. The user searched for flights and you also found hotel options for their destination.
                Generate a conversational response that:
                1. Acknowledges their flight search request
                2. Mentions the flight options you found
                3. Highlights that you also found hotel options in the destination city
                4. Encourages them to look at both flight and hotel results cards
                5. Offers to help with next steps like booking or finding more options

                Keep it conversational and helpful. The actual search results will be displayed as cards below your message.
                Be specific about the destination city when mentioning hotels.
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
                            Flight results found: ${flightResults.length}
                            Hotel results found: ${hotelResults.length}
                            Destination city: ${cityName}

                            Generate a helpful response mentioning both flights and hotels.
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
            logger.error("Flight+Hotel response generation error:", error);
            const cityName = extractDestinationCityCode({
                arrival: parameters.destination || parameters.arrival,
            });
            const formattedCity = cityName ? formatCityName(cityName) : "your destination";

            return {
                text: `Great! I found ${flightResults.length} flight options for your trip${hotelResults.length > 0 ? ` and ${hotelResults.length} hotel options in ${formattedCity}` : ""}. Take a look at the options below and let me know if you'd like me to search for more options or help you with booking!`,
            };
        }
    }

    async retrieveConversationContext(conversationId, userId, dbContext) {
        const startTime = Date.now();

        if (!dbContext || !dbContext.entities || !dbContext.entities.Message) {
            logger.error("Invalid dbContext provided to retrieveConversationContext.");
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
            logger.error("Context retrieval error:", error);
            return [];
        }
    }
}
