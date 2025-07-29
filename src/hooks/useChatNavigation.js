import { useState, useEffect, useCallback } from "react";

export function useChatNavigation(messagesRef) {
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const updateScrollState = useCallback(() => {
        if (!messagesRef.current) return;

        const element = messagesRef.current;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;

        setCanScrollUp(scrollTop > 0);
        setCanScrollDown(scrollTop < scrollHeight - clientHeight);
    }, [messagesRef]);

    useEffect(() => {
        const element = messagesRef.current;
        if (!element) return;

        updateScrollState();
        element.addEventListener("scroll", updateScrollState);

        return () => {
            element.removeEventListener("scroll", updateScrollState);
        };
    }, [messagesRef, updateScrollState]);

    const scrollToTop = useCallback(() => {
        messagesRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [messagesRef]);

    const scrollToBottom = useCallback(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTo({
                top: messagesRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messagesRef]);

    return {
        canScrollUp,
        canScrollDown,
        scrollToTop,
        scrollToBottom,
    };
}
