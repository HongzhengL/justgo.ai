import { useAuth } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import { useState, useEffect } from "react";
import { useAction, useQuery } from "wasp/client/operations";
import "./dashboard.css";
import {
    processAIMessage,
    getActiveConversation,
    getItineraries,
    createItinerary,
    addToItinerary,
} from "wasp/client/operations";
import { CardList } from "../components/CardList";
import { InfoModal } from "../components/InfoModal.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import useInfoModal from "../hooks/useInfoModal.js";

export function DashboardPage() {
    const { data: user, isLoading } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

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
            console.warn("Timezone detection failed:", error);
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
            console.error("Error processing message:", error);

            // Add user message and error response
            const userMessage = {
                id: Date.now(),
                sender: "user",
                text: messageText,
                timestamp: new Date(),
                type: "text",
            };

            const errorMessage = {
                id: Date.now() + 1,
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

            console.log("Successfully added to itinerary:", cardData.title);

            // Show a success message (you could use a toast notification here)
            alert(`Added "${cardData.title}" to your itinerary!`);
        } catch (error) {
            console.error("Error adding to itinerary:", error);
            alert("Failed to add item to itinerary. Please try again.");
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
                <div className="chat-messages">
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

                {/* Input Area */}
                <div className="chat-input-area">
                    <div className="chat-input-row">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Tell me about your travel plans... (e.g., 'I want to visit Paris next month')"
                            className="chat-input"
                            disabled={isProcessing}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isProcessing}
                            className="chat-send-button"
                        >
                            Send
                        </button>
                    </div>
                    <div className="chat-helper-text">
                        Press Enter to send • Shift+Enter for new line
                    </div>
                </div>
            </div>

            <InfoModal
                {...modalProps}
                onGoToWebsite={(url) => window.open(url, "_blank", "noopener,noreferrer")}
                onAddToItinerary={handleAddToItinerary}
            />
        </AppLayout>
    );
}
