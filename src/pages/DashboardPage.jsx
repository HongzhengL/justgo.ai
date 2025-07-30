import { useAuth } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import { useState, useEffect, useRef } from "react";
import { useAction, useQuery } from "wasp/client/operations";
import logger from "../utils/logger.js";
import "./dashboard.css";
import {
    processAIMessage,
    getActiveConversation,
    getItineraries,
    createItinerary,
    addToItinerary,
    processVoiceMessage,
} from "wasp/client/operations";
import { CardList } from "../components/CardList";
import { InfoModal } from "../components/InfoModal.jsx";
import { BookingOptionsModal } from "../components/BookingOptionsModal.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import useInfoModal from "../hooks/useInfoModal.js";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { ChatNavigation } from "../components/ChatNavigation.jsx";

export function DashboardPage() {
    const { data: user, isLoading } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesRef = useRef(null);

    // Booking modal states
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedBookingToken, setSelectedBookingToken] = useState(null);
    const [selectedSearchContext, setSelectedSearchContext] = useState(null);
    const [selectedFlightInfo, setSelectedFlightInfo] = useState(null);

    // Voice recording hooks
    const { isRecording, startVoiceRecording, stopVoiceRecording } = useVoiceRecorder();
    const processVoiceMessageFn = useAction(processVoiceMessage);

    // Hooks for AI operations
    const processAIMessageFn = useAction(processAIMessage);
    const { data: activeConversation, isLoading: conversationLoading } = useQuery(
        getActiveConversation,
        {},
        { enabled: !!user },
    );

    // Hooks for itinerary operations
    const { data: itineraries } = useQuery(getItineraries, {}, { enabled: !!user });
    const createItineraryFn = useAction(createItinerary);
    const addToItineraryFn = useAction(addToItinerary);

    // Hook for modal management
    const { openModal, modalProps } = useInfoModal();

    // Load conversation history when conversation is available
    useEffect(() => {
        if (activeConversation && activeConversation.messages) {
            const formattedMessages = activeConversation.messages.map((msg) => ({
                id: msg.id,
                sender: msg.sender,
                text: msg.content,
                timestamp: new Date(msg.timestamp),
                type: msg.messageType,
                cards: msg.metadata?.cards || [],
            }));

            // Add welcome message if no messages exist
            if (formattedMessages.length === 0) {
                const welcomeMessage = {
                    id: "welcome",
                    sender: "ai",
                    text: "Hello! I'm your AI travel planner. Tell me where you'd like to go, when you want to travel, and I'll help you plan the perfect trip! 🌎✈️",
                    timestamp: new Date(),
                    type: "text",
                    cards: [],
                };
                setMessages([welcomeMessage]);
            } else {
                setMessages(formattedMessages);
            }
        }
    }, [activeConversation]);

    // Function to detect user timezone
    const detectUserTimezone = () => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (error) {
            logger.warn("Timezone detection failed:", error);
            return null;
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isProcessing) return;

        const messageText = inputValue;
        setInputValue("");
        setIsProcessing(true);

        try {
            // Detect user timezone
            const frontendTimezone = detectUserTimezone();

            // Process message with AI Agent and save to database
            const result = await processAIMessageFn({
                message: messageText,
                frontendTimezone: frontendTimezone,
            });

            // Add both user and AI messages to local state
            const userMessage = {
                id: result.userMessage.id,
                sender: "user",
                text: messageText,
                timestamp: result.userMessage.timestamp,
                type: "text",
            };

            const aiMessage = {
                id: result.aiMessage.id,
                sender: "ai",
                text: result.aiMessage.content,
                timestamp: result.aiMessage.timestamp,
                type: result.aiMessage.type,
                cards: result.aiMessage.cards || [],
            };

            setMessages((prev) => [...prev, userMessage, aiMessage]);
        } catch (error) {
            logger.error("Error processing message:", error);

            // Add user message and error response
            const userMessage = {
                id: crypto.randomUUID(),
                sender: "user",
                text: messageText,
                timestamp: new Date(),
                type: "text",
            };

            const errorMessage = {
                id: crypto.randomUUID(),
                sender: "ai",
                text: "I'm sorry, I encountered an issue processing your request. Please try again.",
                timestamp: new Date(),
                type: "error",
            };

            setMessages((prev) => [...prev, userMessage, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleAddToItinerary = async (cardData) => {
        try {
            // Get or create a default itinerary
            let targetItinerary = itineraries?.find((it) => it.title === "My Travel Plans");

            if (!targetItinerary) {
                // Create a default itinerary
                targetItinerary = await createItineraryFn({
                    title: "My Travel Plans",
                    description: "Items saved from AI travel search",
                });
            }

            // Add the card to the itinerary
            await addToItineraryFn({
                itineraryId: targetItinerary.id,
                cardData: cardData,
            });

            logger.info("Successfully added to itinerary:", cardData.title);

            // Show a success message (you could use a toast notification here)
            alert(`Added "${cardData.title}" to your itinerary!`);
        } catch (error) {
            logger.error("Error adding to itinerary:", error);
            alert("Failed to add item to itinerary. Please try again.");
        }
    };

    const handleBookFlight = (bookingToken, searchContext, flightInfo) => {
        setSelectedBookingToken(bookingToken);
        setSelectedSearchContext(searchContext);
        setSelectedFlightInfo(flightInfo);
        setIsBookingModalOpen(true);
    };

    const handleVoiceRecording = async () => {
        logger.debug("Voice recording button clicked, current state:", isRecording);
        if (isRecording) {
            logger.debug("Stopping recording...");
            const base64Audio = await stopVoiceRecording();
            if (base64Audio) {
                logger.debug("Got base64 audio, length:", base64Audio.length);
                setIsProcessing(true);
                try {
                    logger.debug("Sending audio to server...");
                    const result = await processVoiceMessageFn({ audioBlob: base64Audio });
                    logger.debug("Server response:", result);
                    if (result.success && result.text) {
                        setInputValue(result.text);
                        await handleSendMessage();
                    } else {
                        logger.warn("Transcription failed:", result.error);
                        const errorMessage = {
                            id: crypto.randomUUID(),
                            sender: "ai",
                            text: result.text || "I didn't quite catch that, could you try again?",
                            timestamp: new Date(),
                            type: "error",
                        };
                        setMessages((prev) => [...prev, errorMessage]);
                    }
                } catch (error) {
                    logger.error("Error processing voice:", error);
                } finally {
                    setIsProcessing(false);
                }
            } else {
                logger.debug("No audio data received");
            }
        } else {
            logger.debug("Starting recording...");
            await startVoiceRecording();
        }
    };

    if (isLoading || conversationLoading) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <div>Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <AppLayout>
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    <div>Please log in to access the dashboard.</div>
                    <Link to="/login">Go to Login</Link>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            {/* Chat Container */}
            <div className="chat-container">
                {/* Messages Area */}
                <div className="chat-messages" ref={messagesRef}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`message-container message-container--${message.sender}`}
                        >
                            <div className={`message-bubble message-bubble--${message.sender}`}>
                                {message.text}
                            </div>
                            {/* Display cards if this is an AI message with cards */}
                            {message.sender === "ai" &&
                                message.cards &&
                                message.cards.length > 0 && (
                                    <div className="message-cards">
                                        <CardList
                                            cards={message.cards}
                                            onGoToWebsite={(url) =>
                                                window.open(url, "_blank", "noopener,noreferrer")
                                            }
                                            onMoreInfo={openModal}
                                            onAddToItinerary={handleAddToItinerary}
                                            onBookFlight={handleBookFlight}
                                        />
                                    </div>
                                )}
                        </div>
                    ))}

                    {isProcessing && (
                        <div className="message-container message-container--ai">
                            <div className="typing-indicator">
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                            </div>
                        </div>
                    )}
                </div>

                <ChatNavigation messagesRef={messagesRef} />

                {/* Input Area */}
                <div className="chat-input-area">
                    <div className="chat-input-row">
                        <button
                            onClick={handleVoiceRecording}
                            disabled={isProcessing}
                            className={`chat-mic-button ${isRecording ? "recording" : ""}`}
                        >
                            {isRecording ? "🔴" : "🎤"}
                        </button>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Tell me about your travel plans... (e.g., 'I want to visit Paris next month')"
                            className="chat-input"
                            disabled={isProcessing || isRecording}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isProcessing || isRecording}
                            className="chat-send-button"
                        >
                            Send
                        </button>
                    </div>
                    <div className="chat-helper-text">
                        Press Enter to send • Shift+Enter for new line • Click 🎤 to use voice
                    </div>
                </div>
            </div>

            <InfoModal
                {...modalProps}
                onGoToWebsite={(url) => window.open(url, "_blank", "noopener,noreferrer")}
                onAddToItinerary={handleAddToItinerary}
            />

            <BookingOptionsModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                bookingToken={selectedBookingToken}
                searchContext={selectedSearchContext}
                flightInfo={selectedFlightInfo}
            />
        </AppLayout>
    );
}
