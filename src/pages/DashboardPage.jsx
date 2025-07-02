import { useAuth } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import { useState, useEffect } from "react";
import { useAction, useQuery } from "wasp/client/operations";
import {
    processAIMessage,
    getActiveConversation,
    getItineraries,
    createItinerary,
    addToItinerary,
} from "wasp/client/operations";
import { CardList } from "../components/CardList";
import AppLayout from "../components/layout/AppLayout.jsx";

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

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isProcessing) return;

        const messageText = inputValue;
        setInputValue("");
        setIsProcessing(true);

        try {
            // Process message with AI Agent and save to database
            const result = await processAIMessageFn({ message: messageText });

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
            <div
                style={{
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: "800px",
                    margin: "0 auto",
                    width: "100%",
                    padding: "2rem 1rem",
                }}
            >
                {/* Messages Area */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "1rem 0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                    }}
                >
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: message.sender === "user" ? "flex-end" : "flex-start",
                            }}
                        >
                            <div
                                style={{
                                    maxWidth: "70%",
                                    padding: "0.75rem 1rem",
                                    borderRadius: "12px",
                                    backgroundColor:
                                        message.sender === "user" ? "#007bff" : "#f8f9fa",
                                    color: message.sender === "user" ? "white" : "#333",
                                    whiteSpace: "pre-line",
                                    fontSize: "0.95rem",
                                    lineHeight: "1.4",
                                }}
                            >
                                {message.text}
                            </div>
                            {/* Display cards if this is an AI message with cards */}
                            {message.sender === "ai" &&
                                message.cards &&
                                message.cards.length > 0 && (
                                    <div
                                        style={{
                                            width: "100%",
                                            maxWidth: "600px",
                                        }}
                                    >
                                        <CardList
                                            cards={message.cards}
                                            onGoToWebsite={(url) =>
                                                window.open(url, "_blank", "noopener,noreferrer")
                                            }
                                            onMoreInfo={(cardData) => {
                                                console.log("More info requested for:", cardData);
                                                // Future: Open modal with detailed information
                                            }}
                                            onAddToItinerary={handleAddToItinerary}
                                        />
                                    </div>
                                )}
                        </div>
                    ))}

                    {isProcessing && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-start",
                            }}
                        >
                            <div
                                style={{
                                    padding: "0.75rem 1rem",
                                    borderRadius: "12px",
                                    backgroundColor: "#f8f9fa",
                                    color: "#333",
                                }}
                            >
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <div
                                        style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            backgroundColor: "#999",
                                            animation: "pulse 1.5s infinite",
                                        }}
                                    ></div>
                                    <div
                                        style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            backgroundColor: "#999",
                                            animation: "pulse 1.5s infinite 0.2s",
                                        }}
                                    ></div>
                                    <div
                                        style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            backgroundColor: "#999",
                                            animation: "pulse 1.5s infinite 0.4s",
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div
                    style={{
                        padding: "1rem 0 2rem 0",
                        borderTop: "1px solid #eee",
                        backgroundColor: "white",
                    }}
                >
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Tell me about your travel plans... (e.g., 'I want to visit Paris next month')"
                            style={{
                                flex: 1,
                                padding: "0.75rem",
                                borderRadius: "8px",
                                border: "1px solid #ddd",
                                fontSize: "0.95rem",
                                fontFamily: "Arial, sans-serif",
                                resize: "none",
                                minHeight: "60px",
                                maxHeight: "120px",
                            }}
                            disabled={isProcessing}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isProcessing}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor:
                                    inputValue.trim() && !isProcessing ? "#007bff" : "#ccc",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor:
                                    inputValue.trim() && !isProcessing ? "pointer" : "not-allowed",
                                fontSize: "0.95rem",
                                fontWeight: "bold",
                            }}
                        >
                            Send
                        </button>
                    </div>
                    <div
                        style={{
                            fontSize: "0.8rem",
                            color: "#666",
                            marginTop: "0.5rem",
                            textAlign: "center",
                        }}
                    >
                        Press Enter to send • Shift+Enter for new line
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%,
                    80%,
                    100% {
                        opacity: 0.3;
                    }
                    40% {
                        opacity: 1;
                    }
                }
            `}</style>
        </AppLayout>
    );
}
