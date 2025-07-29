import React from "react";
import { useChatNavigation } from "../hooks/useChatNavigation.js";

export function ChatNavigation({ messagesRef, className }) {
    const { canScrollUp, canScrollDown, scrollToTop, scrollToBottom } =
        useChatNavigation(messagesRef);

    // Only render if there's something to scroll
    if (!canScrollUp && !canScrollDown) {
        return null;
    }

    return (
        <div className={`chat-navigation-buttons ${className || ""}`}>
            {canScrollUp && (
                <button
                    onClick={scrollToTop}
                    disabled={!canScrollUp}
                    className="scroll-button scroll-top"
                    aria-label="Scroll to top"
                >
                    ↑
                </button>
            )}
            {canScrollDown && (
                <button
                    onClick={scrollToBottom}
                    disabled={!canScrollDown}
                    className="scroll-button scroll-bottom"
                    aria-label="Scroll to bottom"
                >
                    ↓
                </button>
            )}
        </div>
    );
}
