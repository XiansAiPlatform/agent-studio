'use client';

import { useState, useRef, useEffect } from 'react';
import { Conversation, Topic } from '@/lib/data/dummy-conversations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, MoreVertical, Bot, Circle, Loader2, ArrowUp } from 'lucide-react';
import { MessageItem } from './message-item';
import { cn } from '@/lib/utils';
import { AGENT_STATUS_CONFIG } from '@/lib/conversation-status-config';

interface ChatInterfaceProps {
  conversation: Conversation;
  selectedTopicId: string;
  onSendMessage?: (content: string, topicId: string) => void;
  isLoadingMessages?: boolean;
  onLoadMoreMessages?: () => void;
  isLoadingMoreMessages?: boolean;
  hasMoreMessages?: boolean;
}

export function ChatInterface({
  conversation,
  selectedTopicId,
  onSendMessage,
  isLoadingMessages = false,
  onLoadMoreMessages,
  isLoadingMoreMessages = false,
  hasMoreMessages = false,
}: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const previousScrollHeightRef = useRef(0);
  const isRestoringScrollRef = useRef(false);
  const loadMoreCooldownRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const previousMessageCountRef = useRef(0);

  const selectedTopic = conversation.topics.find(t => t.id === selectedTopicId);

  // Reset flags when topic changes and set initial cooldown
  useEffect(() => {
    hasUserScrolledRef.current = false;
    loadMoreCooldownRef.current = true;
    
    // Enable loading after a delay to prevent immediate auto-load
    const timer = setTimeout(() => {
      loadMoreCooldownRef.current = false;
      hasUserScrolledRef.current = true; // Allow scrolling after initial delay
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [selectedTopicId]);

  // Handle scroll event to load more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Check if user is near the bottom (within 100px)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);

      // Load more messages when scrolled to top (within 50px from top)
      if (
        scrollTop < 50 && 
        hasMoreMessages && 
        !isLoadingMoreMessages && 
        !isRestoringScrollRef.current &&
        !loadMoreCooldownRef.current &&
        hasUserScrolledRef.current
      ) {
        // Store current scroll height before loading more
        previousScrollHeightRef.current = scrollHeight;
        loadMoreCooldownRef.current = true;
        onLoadMoreMessages?.();
        
        // Clear cooldown after a short delay
        setTimeout(() => {
          loadMoreCooldownRef.current = false;
        }, 300); // Reduced from 500ms for better responsiveness
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingMoreMessages, onLoadMoreMessages]);

  // Auto-scroll to bottom when new messages arrive (only if user was at bottom)
  useEffect(() => {
    const currentMessageCount = selectedTopic?.messages.length || 0;
    
    // Only auto-scroll if not restoring scroll position from loading more messages
    if (shouldAutoScroll && !isRestoringScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    previousMessageCountRef.current = currentMessageCount;
  }, [selectedTopic?.messages, shouldAutoScroll]);

  // Restore scroll position after loading more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    const currentMessageCount = selectedTopic?.messages.length || 0;
    
    // Only restore scroll if:
    // 1. Not currently loading more
    // 2. We have a previous scroll height stored (meaning we triggered a load)
    // 3. Message count increased (messages were actually loaded)
    if (!container || isLoadingMoreMessages || previousScrollHeightRef.current === 0) {
      return;
    }

    // Check if this is from loading more messages (prepending old messages)
    // vs new messages arriving (appending new messages)
    const messagesWereAdded = currentMessageCount > previousMessageCountRef.current;
    
    if (!messagesWereAdded) {
      return;
    }

    isRestoringScrollRef.current = true;

    // Wait for DOM to update
    const timer = setTimeout(() => {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
      
      // Maintain scroll position by adjusting for new content height
      // Only if scroll diff is significant (more than 100px, indicating old messages were loaded)
      if (scrollDiff > 100) {
        // Position scroll a bit below the top (70px offset) to allow easy scroll-up to load more
        container.scrollTop = scrollDiff - 70;
      }
      
      previousScrollHeightRef.current = 0;
      
      // Clear the restoring flag after a short delay to prevent immediate reload
      setTimeout(() => {
        isRestoringScrollRef.current = false;
      }, 100);
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedTopic?.messages, isLoadingMoreMessages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedTopicId) return;

    onSendMessage?.(messageInput, selectedTopicId);
    setMessageInput('');
    
    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedTopic) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No topic selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l shadow-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
        <div className="flex items-center gap-4">
          {/* Agent Avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          
          {/* Agent Info */}
          <div>
            <h2 className="font-medium text-foreground tracking-tight">
              {conversation.agent.name}
            </h2>
            <div className="flex items-center gap-1.5 text-sm">
              <Circle
                className={cn(
                  'h-2 w-2 fill-current',
                  AGENT_STATUS_CONFIG[conversation.agent.status].colors.dot
                )}
              />
              <span className={cn('text-xs', AGENT_STATUS_CONFIG[conversation.agent.status].colors.text)}>
                {AGENT_STATUS_CONFIG[conversation.agent.status].label}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border/50" />

          {/* Topic Info */}
          <div>
            <h3 className="font-medium text-sm text-foreground">
              {selectedTopic.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground/70">
                Created {new Date(selectedTopic.createdAt).toLocaleDateString()}
              </span>
              {selectedTopic.associatedTasks && selectedTopic.associatedTasks.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground/30">•</span>
                  <Badge variant="outline" className="h-5 px-1.5 text-xs font-normal">
                    {selectedTopic.associatedTasks.length} task{selectedTopic.associatedTasks.length !== 1 ? 's' : ''}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Conversation Status */}
          <Badge
            variant={conversation.status === 'active' ? 'default' : 'secondary'}
            className="ml-2 font-normal"
          >
            {conversation.status}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-sm transition-all hover:bg-primary/10 hover:text-primary">
            View Details
          </Button>
          <Button variant="ghost" size="icon" className="transition-all hover:bg-primary/10 hover:text-primary group">
            <MoreVertical className="h-4 w-4 transition-transform group-hover:rotate-90" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-6 bg-accent/5">
        <div className="space-y-4 max-w-5xl mx-auto">
          {/* Loading State */}
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                Loading message history...
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Fetching conversation for {selectedTopic.name}
              </p>
            </div>
          ) : (
            <>
              {/* Load More Indicator */}
              {isLoadingMoreMessages && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary/60 mr-2" />
                  <p className="text-xs text-muted-foreground">
                    Loading more messages...
                  </p>
                </div>
              )}

              {/* Load More Messages Button */}
              {!isLoadingMoreMessages && hasMoreMessages && selectedTopic.messages.length > 0 && (
                <div className="flex items-center justify-center py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoadMoreMessages}
                    className="gap-2 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
                  >
                    <ArrowUp className="h-3 w-3" />
                    Load More Messages
                  </Button>
                </div>
              )}

              {/* Messages */}
              {selectedTopic.messages.length > 0 ? (
                selectedTopic.messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    agentName={conversation.agent.name}
                    userName={conversation.user.name}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    No messages yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
                    Start a conversation by typing a message below
                  </p>
                </div>
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-card px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="icon" className="flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all group">
              <Paperclip className="h-4 w-4 transition-transform group-hover:rotate-12" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${conversation.agent.name}...`}
                className="pr-24 resize-none bg-background/50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">
                Press Enter
              </div>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="flex-shrink-0 group transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <Send className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-0.5" />
              Send
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-2.5 text-center">
            Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
