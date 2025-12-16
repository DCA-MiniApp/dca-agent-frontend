import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollBehavior(messages: any[], isLoading: boolean) {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesPinnedRef = useRef(true);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      } else {
        endOfMessagesRef.current?.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "end",
        });
      }
    },
    []
  );

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const threshold = 120;
    const isPinned = distanceFromBottom <= threshold;
    messagesPinnedRef.current = isPinned;
    setShowScrollToLatest(!isPinned);
  }, []);

  const handleJumpToLatest = useCallback(() => {
    messagesPinnedRef.current = true;
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Scroll on messages change
  useEffect(() => {
    if (messagesPinnedRef.current) {
      scrollToBottom(messages.length < 4);
    }
  }, [messages, scrollToBottom]);

  // Scroll when loading
  useEffect(() => {
    if (isLoading && messagesPinnedRef.current) {
      scrollToBottom(true);
    }
  }, [isLoading, scrollToBottom]);

  // Handle scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleMessagesScroll, {
      passive: true,
    });
    handleMessagesScroll();
    return () => container.removeEventListener("scroll", handleMessagesScroll);
  }, [handleMessagesScroll]);

  // Handle keyboard/viewport resize
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handler = () => {
      if (messagesPinnedRef.current) {
        setTimeout(() => scrollToBottom(false), 60);
      }
    };
    window.visualViewport.addEventListener("resize", handler);
    return () => {
      window.visualViewport?.removeEventListener("resize", handler);
    };
  }, [scrollToBottom]);

  return {
    endOfMessagesRef,
    messagesContainerRef,
    showScrollToLatest,
    scrollToBottom,
    handleJumpToLatest,
  };
}
