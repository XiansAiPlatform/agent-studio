import { useState, useRef, useEffect, useCallback } from 'react';

interface UseChatScrollOptions {
  messages: unknown[];
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
  onLoadMoreMessages?: () => void;
  selectedTopicId: string;
  /** Typing indicator below messages changes layout; keep scrolled when it toggles. */
  isTyping?: boolean;
}

function scrollContainerToBottom(container: HTMLDivElement) {
  container.scrollTop = container.scrollHeight;
}

export function useChatScroll({
  messages,
  hasMoreMessages,
  isLoadingMoreMessages,
  onLoadMoreMessages,
  selectedTopicId,
  isTyping = false,
}: UseChatScrollOptions) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const previousScrollHeightRef = useRef(0);
  const isRestoringScrollRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const loadMoreCooldownRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const previousMessageCountRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    isProgrammaticScrollRef.current = true;
    scrollContainerToBottom(container);

    // Defer a second pass so multiline/markdown content can finish layout.
    requestAnimationFrame(() => {
      scrollContainerToBottom(container);
      requestAnimationFrame(() => {
        scrollContainerToBottom(container);
        window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 150);
      });
    });
  }, []);

  // Reset flags when topic changes and set initial cooldown
  useEffect(() => {
    setShouldAutoScroll(true);
    hasUserScrolledRef.current = false;
    loadMoreCooldownRef.current = true;

    const timer = setTimeout(() => {
      loadMoreCooldownRef.current = false;
      hasUserScrolledRef.current = true;
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedTopicId]);

  // Handle scroll event to load more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;

      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);

      if (
        scrollTop < 50 &&
        hasMoreMessages &&
        !isLoadingMoreMessages &&
        !isRestoringScrollRef.current &&
        !loadMoreCooldownRef.current &&
        hasUserScrolledRef.current
      ) {
        previousScrollHeightRef.current = scrollHeight;
        loadMoreCooldownRef.current = true;
        onLoadMoreMessages?.();

        setTimeout(() => {
          loadMoreCooldownRef.current = false;
        }, 300);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingMoreMessages, onLoadMoreMessages]);

  // Auto-scroll to bottom when new messages arrive or typing indicator toggles
  useEffect(() => {
    const currentMessageCount = messages.length;
    const isAppendingMessages =
      currentMessageCount > previousMessageCountRef.current &&
      previousScrollHeightRef.current === 0;

    if (
      shouldAutoScroll &&
      !isRestoringScrollRef.current &&
      (isAppendingMessages || isTyping)
    ) {
      scrollToBottom();
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages, shouldAutoScroll, isTyping, scrollToBottom]);

  // Keep pinned to bottom while message content height changes (multiline, markdown, etc.)
  useEffect(() => {
    const container = messagesContainerRef.current;
    const content = container?.firstElementChild;
    if (!container || !content) return;

    const observer = new ResizeObserver(() => {
      if (!shouldAutoScroll || isRestoringScrollRef.current || isProgrammaticScrollRef.current) {
        return;
      }
      scrollContainerToBottom(container);
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [shouldAutoScroll, selectedTopicId]);

  // Restore scroll position after loading more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    const currentMessageCount = messages.length;

    if (!container || isLoadingMoreMessages || previousScrollHeightRef.current === 0) {
      return;
    }

    const messagesWereAdded = currentMessageCount > previousMessageCountRef.current;

    if (!messagesWereAdded) {
      return;
    }

    isRestoringScrollRef.current = true;

    const timer = setTimeout(() => {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current;

      if (scrollDiff > 100) {
        container.scrollTop = scrollDiff - 70;
      }

      previousScrollHeightRef.current = 0;

      setTimeout(() => {
        isRestoringScrollRef.current = false;
      }, 100);
    }, 0);

    return () => clearTimeout(timer);
  }, [messages, isLoadingMoreMessages]);

  return {
    messagesEndRef,
    messagesContainerRef,
  };
}
