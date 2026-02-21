import { useState, useRef, useEffect } from 'react';

interface UseChatScrollOptions {
  messages: unknown[];
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
  onLoadMoreMessages?: () => void;
  selectedTopicId: string;
}

export function useChatScroll({
  messages,
  hasMoreMessages,
  isLoadingMoreMessages,
  onLoadMoreMessages,
  selectedTopicId,
}: UseChatScrollOptions) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const previousScrollHeightRef = useRef(0);
  const isRestoringScrollRef = useRef(false);
  const loadMoreCooldownRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const previousMessageCountRef = useRef(0);

  // Reset flags when topic changes and set initial cooldown
  useEffect(() => {
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const currentMessageCount = messages.length;
    const container = messagesContainerRef.current;

    if (shouldAutoScroll && !isRestoringScrollRef.current && container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;

      messagesEndRef.current?.scrollIntoView({
        behavior: isAtBottom ? 'auto' : 'smooth',
      });
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages, shouldAutoScroll]);

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
