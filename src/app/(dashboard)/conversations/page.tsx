'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  DUMMY_CONVERSATIONS,
  Conversation,
  Topic,
  Message,
} from '@/lib/data/dummy-conversations';
import { ChatInterface, TopicList } from '@/components/features/conversations';
import { Bot, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { XiansTopicsResponse, XiansMessageHistoryResponse, XiansMessage } from '@/lib/xians/types';
import { showErrorToast } from '@/lib/utils/error-handler';
import { Button } from '@/components/ui/button';
import { useMessageListener } from '@/hooks/use-message-listener';
import { toast } from 'sonner';

function ConversationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentTenantId } = useTenant();
  const { data: session } = useSession();
  
  // Get query parameters
  const agentName = searchParams.get('agent-name');
  const activationName = searchParams.get('activation-name');
  const agentId = searchParams.get('agent'); // Legacy support
  const topicParam = searchParams.get('topic');

  // State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Message pagination state per topic
  const [messagePages, setMessagePages] = useState<Record<string, number>>({});
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({});
  const [initialLoadComplete, setInitialLoadComplete] = useState<Record<string, boolean>>({});

  // Handle incoming SSE messages
  const handleIncomingMessage = useCallback((xiansMessage: XiansMessage) => {
    console.log('[ConversationsPage] Received SSE message:', xiansMessage);
    console.log('[ConversationsPage] Message direction:', xiansMessage.direction);
    console.log('[ConversationsPage] Message text:', xiansMessage.text);
    console.log('[ConversationsPage] Message scope:', xiansMessage.scope);

    // Only process outgoing messages (from the agent)
    if (xiansMessage.direction !== 'Outgoing') {
      console.log('[ConversationsPage] Skipping message - not outgoing (direction:', xiansMessage.direction, ')');
      return;
    }

    // Convert XiansMessage to our Message format
    const message: Message = {
      id: xiansMessage.id,
      content: xiansMessage.text,
      role: 'agent',
      timestamp: xiansMessage.createdAt,
      status: 'delivered',
    };

    // Determine which topic this message belongs to
    // scope: null means "General Discussions"
    const topicId = xiansMessage.scope ?? 'general-discussions';

    // Add message to the appropriate topic and increment messageCount
    setTopics((prev) => 
      prev.map((topic) => {
        if (topic.id === topicId) {
          return {
            ...topic,
            messages: [...topic.messages, message],
            messageCount: (topic.messageCount ?? 0) + 1, // Increment count for new message
            lastMessageAt: message.timestamp, // Update last message time
          };
        }
        return topic;
      })
    );

    // Update conversation state
    setConversation((prev) => {
      if (!prev) return null;

      const updatedTopics = prev.topics.map((topic) => {
        if (topic.id === topicId) {
          return {
            ...topic,
            messages: [...topic.messages, message],
            messageCount: (topic.messageCount ?? 0) + 1, // Increment count for new message
            lastMessageAt: message.timestamp, // Update last message time
          };
        }
        return topic;
      });

      return {
        ...prev,
        topics: updatedTopics,
      };
    });

    // If the message is for a topic that's not currently selected, increment unread count
    if (topicId !== selectedTopicId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [topicId]: (prev[topicId] || 0) + 1,
      }));

      // Show a toast notification
      const topicName = topicId === 'general-discussions' ? 'General Discussions' : topicId;
      toast.info(`New message in ${topicName}`, {
        description: xiansMessage.text.substring(0, 100) + (xiansMessage.text.length > 100 ? '...' : ''),
        duration: 3000,
      });
    }
  }, [selectedTopicId]);

  // SSE error handler
  const handleSSEError = useCallback((error: Error) => {
    console.error('[SSE] Connection error:', error.message);
  }, []);

  // SSE connect handler
  const handleSSEConnect = useCallback(() => {
    // Connection established - silent success
  }, []);

  // SSE disconnect handler
  const handleSSEDisconnect = useCallback(() => {
    // Disconnected - silent
  }, []);

  // Set up SSE connection for real-time messages
  // participantId is now obtained from session on the backend for security
  const { isConnected, error: sseError } = useMessageListener({
    tenantId: currentTenantId,
    agentName,
    activationName,
    enabled: !!(currentTenantId && agentName && activationName && session?.user?.email),
    onMessage: handleIncomingMessage,
    onError: handleSSEError,
    onConnect: handleSSEConnect,
    onDisconnect: handleSSEDisconnect,
  });

  // Update URL when topic is selected
  const updateTopicInURL = useCallback((topicId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (topicId) {
      params.set('topic', topicId);
    } else {
      params.delete('topic');
    }
    router.push(`/conversations?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Handle topic selection with URL update
  const handleTopicSelect = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    updateTopicInURL(topicId);
  }, [updateTopicInURL]);

  // Sync selected topic from URL on mount and when URL changes
  useEffect(() => {
    if (topicParam && topics.length > 0) {
      // Check if the topic from URL exists in the topics list
      const topicExists = topics.some(topic => topic.id === topicParam);
      if (topicExists && topicParam !== selectedTopicId) {
        setSelectedTopicId(topicParam);
      }
    }
  }, [topicParam, topics]);

  // Clear unread count when topic is selected
  useEffect(() => {
    if (selectedTopicId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [selectedTopicId]: 0,
      }));
    }
  }, [selectedTopicId]);

  // Fetch topics from API
  useEffect(() => {
    const fetchTopics = async () => {
      if (!currentTenantId || !agentName || !activationName) {
        return;
      }

      setIsLoadingTopics(true);
      try {
        const queryParams = new URLSearchParams({
          agentName,
          activationName,
          page: currentPage.toString(),
          pageSize: '20',
        });

        const response = await fetch(
          `/api/tenants/${currentTenantId}/messaging/topics?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch topics');
        }

        const data: XiansTopicsResponse = await response.json();
        
        // Update pagination state
        const calculatedTotalPages = Math.ceil(data.pagination.total / data.pagination.pageSize);
        setTotalPages(calculatedTotalPages);
        setHasMore(data.pagination.hasMore);
        
        // Map Xians topics to our Topic format
        // The topic with scope: null is the "General Discussions" topic
        const mappedTopics: Topic[] = data.topics.map((topic, index) => {
          // Use "General Discussions" for null scope, provide fallback for safety
          const isGeneralTopic = topic.scope === null;
          const topicId = topic.scope ?? 'general-discussions';
          const topicName = topic.scope ?? 'General Discussions';
          
          return {
            id: topicId,
            name: topicName,
            createdAt: topic.lastMessageAt || new Date().toISOString(),
            status: 'active' as const,
            messages: [], // Messages will be loaded when topic is selected
            associatedTasks: [],
            isDefault: isGeneralTopic,
            messageCount: topic.messageCount ?? 0, // Store the total message count from API
            lastMessageAt: topic.lastMessageAt, // Store last message timestamp
          };
        });

        // Ensure General Discussions topic exists if topics array is empty or doesn't include it
        const hasGeneralTopic = mappedTopics.some(t => t.isDefault);
        let allTopics = [...mappedTopics];
        
        if (!hasGeneralTopic) {
          // Create default General Discussions topic
          const generalTopic: Topic = {
            id: 'general-discussions',
            name: 'General Discussions',
            createdAt: new Date().toISOString(),
            status: 'active' as const,
            messages: [],
            associatedTasks: [],
            isDefault: true,
            messageCount: 0,
            lastMessageAt: undefined,
          };
          allTopics = [generalTopic, ...mappedTopics];
        } else {
          // Sort topics to ensure General Discussions (scope: null) is first
          allTopics = mappedTopics.sort((a, b) => {
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return 0;
          });
        }
        
        setTopics(allTopics);

        // Create a conversation object for the chat interface
        setConversation({
          id: `${agentName}-${activationName}`,
          tenantId: currentTenantId,
          user: {
            id: 'current-user',
            name: 'You',
          },
          agent: {
            id: agentName,
            name: agentName,
            status: 'online',
            avatar: undefined,
          },
          startTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          status: 'active',
          topics: allTopics,
        });

        // Auto-select topic based on URL parameter or default to General Discussions
        const initialTopicId = topicParam && allTopics.some(t => t.id === topicParam) 
          ? topicParam 
          : 'general-discussions';
        
        setSelectedTopicId(initialTopicId);
        
        // Update URL if no topic parameter exists
        if (!topicParam) {
          updateTopicInURL(initialTopicId);
        }
      } catch (error) {
        console.error('[ConversationsPage] Error fetching topics:', error);
        showErrorToast(error, 'Failed to load conversation topics');
        setTopics([]);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [currentTenantId, agentName, activationName, currentPage]);

  // Fetch messages for selected topic
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentTenantId || !agentName || !activationName || !selectedTopicId || !session?.user?.email) {
        return;
      }

      setIsLoadingMessages(true);
      try {
        // Determine the topic parameter for the API call
        // General Discussions (id: 'general-discussions') should use empty string
        // Other topics should use their name (same as id)
        const topicParam = selectedTopicId === 'general-discussions' ? '' : selectedTopicId;

        // participantId is now obtained from session on the backend for security
        const queryParams = new URLSearchParams({
          agentName,
          activationName,
          topic: topicParam,
          page: '1',
          pageSize: '10', // Load only 10 messages initially
          chatOnly: 'true',
          sortOrder: 'desc', // Changed to desc to get most recent messages first
        });

        const response = await fetch(
          `/api/tenants/${currentTenantId}/messaging/history?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch message history');
        }

        const data: XiansMessageHistoryResponse = await response.json();

        // Validate response
        if (!Array.isArray(data)) {
          console.warn('[ConversationsPage] Invalid response format:', data);
          throw new Error('Invalid response format from server');
        }

        // Map Xians messages to our Message format and reverse to show chronologically
        const messages: Message[] = data.map((xiansMsg) => ({
          id: xiansMsg.id,
          content: xiansMsg.text,
          role: xiansMsg.direction === 'Incoming' ? 'user' as const : 'agent' as const,
          timestamp: xiansMsg.createdAt,
          status: 'delivered' as const,
        })).reverse(); // Reverse to show oldest to newest

        // Update the topic's messages in the conversation
        setConversation((prev) => {
          if (!prev) return null;

          const updatedTopics = prev.topics.map((topic) => {
            if (topic.id === selectedTopicId) {
              return {
                ...topic,
                messages,
              };
            }
            return topic;
          });

          return {
            ...prev,
            topics: updatedTopics,
          };
        });

        // Also update the topics state
        setTopics((prev) => 
          prev.map((topic) => {
            if (topic.id === selectedTopicId) {
              return {
                ...topic,
                messages,
              };
            }
            return topic;
          })
        );

        // Initialize pagination state for this topic
        setMessagePages((prev) => ({ ...prev, [selectedTopicId]: 1 }));
        setHasMoreMessages((prev) => ({ ...prev, [selectedTopicId]: data.length === 10 }));

        console.log(`[ConversationsPage] Loaded ${messages.length} messages for topic:`, selectedTopicId);
        
        // Mark initial load as complete after a short delay
        setTimeout(() => {
          setInitialLoadComplete((prev) => ({ ...prev, [selectedTopicId]: true }));
          console.log('[ConversationsPage] Initial load complete for topic:', selectedTopicId);
        }, 1500);
      } catch (error) {
        console.error('[ConversationsPage] Error fetching messages:', error);
        showErrorToast(error, 'Failed to load messages');
      } finally {
        setIsLoadingMessages(false);
      }
    };

    // Reset initial load flag when topic changes
    setInitialLoadComplete((prev) => ({ ...prev, [selectedTopicId]: false }));
    
    fetchMessages();
  }, [currentTenantId, agentName, activationName, selectedTopicId, session?.user?.email]);

  const handleSendMessage = async (content: string, topicId: string) => {
    if (!currentTenantId || !agentName || !activationName || !session?.user?.email) {
      console.error('[ConversationsPage] Missing required parameters for sending message');
      showErrorToast(new Error('Missing required parameters'), 'Unable to send message');
      return;
    }

    try {
      // Determine the topic parameter for the API call
      // General Discussions (id: 'general-discussions') should use empty string or undefined
      // Other topics should use their name (same as id)
      const topicParam = topicId === 'general-discussions' ? undefined : topicId;

      // participantId is now obtained from session on the backend for security
      const requestBody = {
        agentName,
        activationName,
        text: content,
        topic: topicParam,
      };

      const response = await fetch(
        `/api/tenants/${currentTenantId}/messaging/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Optimistically add the message to the UI
      const newMessage = {
        id: `temp-${Date.now()}`, // Temporary ID until we refresh
        content,
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        status: 'delivered' as const,
      };

      // Update the conversation with the new message
      setConversation((prev) => {
        if (!prev) return null;

        const updatedTopics = prev.topics.map((topic) => {
          if (topic.id === topicId) {
            return {
              ...topic,
              messages: [...topic.messages, newMessage],
              messageCount: (topic.messageCount ?? 0) + 1, // Increment count for sent message
              lastMessageAt: newMessage.timestamp, // Update last message time
            };
          }
          return topic;
        });

        return {
          ...prev,
          topics: updatedTopics,
        };
      });

      // Also update the topics state
      setTopics((prev) => 
        prev.map((topic) => {
          if (topic.id === topicId) {
            return {
              ...topic,
              messages: [...topic.messages, newMessage],
              messageCount: (topic.messageCount ?? 0) + 1, // Increment count for sent message
              lastMessageAt: newMessage.timestamp, // Update last message time
            };
          }
          return topic;
        })
      );

      console.log('[ConversationsPage] Message sent successfully');
    } catch (error) {
      console.error('[ConversationsPage] Error sending message:', error);
      showErrorToast(error, 'Failed to send message');
    }
  };

  const handleLoadMoreMessages = useCallback(async () => {
    if (!currentTenantId || !agentName || !activationName || !selectedTopicId || !session?.user?.email) {
      return;
    }

    // Prevent loading more messages if initial load hasn't completed yet
    if (!initialLoadComplete[selectedTopicId]) {
      console.log('[ConversationsPage] Skipping load more - initial load not complete for topic:', selectedTopicId);
      return;
    }

    const currentPage = messagePages[selectedTopicId] || 1;
    const nextPage = currentPage + 1;

    setIsLoadingMoreMessages(true);
    try {
      // Determine the topic parameter for the API call
      const topicParam = selectedTopicId === 'general-discussions' ? '' : selectedTopicId;

      // participantId is now obtained from session on the backend for security
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        topic: topicParam,
        page: nextPage.toString(),
        pageSize: '10',
        chatOnly: 'true',
        sortOrder: 'desc',
      });

      const response = await fetch(
        `/api/tenants/${currentTenantId}/messaging/history?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch more messages');
      }

      const data: XiansMessageHistoryResponse = await response.json();

      if (!Array.isArray(data)) {
        console.warn('[ConversationsPage] Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      // Map new messages and reverse to show chronologically
      const newMessages: Message[] = data.map((xiansMsg) => ({
        id: xiansMsg.id,
        content: xiansMsg.text,
        role: xiansMsg.direction === 'Incoming' ? 'user' as const : 'agent' as const,
        timestamp: xiansMsg.createdAt,
        status: 'delivered' as const,
      })).reverse();

      // Prepend new messages to existing messages, filtering out duplicates
      setConversation((prev) => {
        if (!prev) return null;

        const updatedTopics = prev.topics.map((topic) => {
          if (topic.id === selectedTopicId) {
            // Get existing message IDs to avoid duplicates
            const existingMessageIds = new Set(topic.messages.map(m => m.id));
            // Filter out messages that already exist
            const uniqueNewMessages = newMessages.filter(m => !existingMessageIds.has(m.id));
            
            return {
              ...topic,
              messages: [...uniqueNewMessages, ...topic.messages],
            };
          }
          return topic;
        });

        return {
          ...prev,
          topics: updatedTopics,
        };
      });

      // Also update the topics state
      setTopics((prev) => 
        prev.map((topic) => {
          if (topic.id === selectedTopicId) {
            // Get existing message IDs to avoid duplicates
            const existingMessageIds = new Set(topic.messages.map(m => m.id));
            // Filter out messages that already exist
            const uniqueNewMessages = newMessages.filter(m => !existingMessageIds.has(m.id));
            
            return {
              ...topic,
              messages: [...uniqueNewMessages, ...topic.messages],
            };
          }
          return topic;
        })
      );

      // Get the count of unique new messages that were actually added
      const topic = conversation?.topics.find(t => t.id === selectedTopicId);
      const existingMessageIds = new Set(topic?.messages.map(m => m.id) || []);
      const uniqueNewMessages = newMessages.filter(m => !existingMessageIds.has(m.id));

      // Update pagination state
      setMessagePages((prev) => ({ ...prev, [selectedTopicId]: nextPage }));
      // Only set hasMoreMessages to true if we got a full page of results
      setHasMoreMessages((prev) => ({ ...prev, [selectedTopicId]: data.length === 10 }));

      console.log(`[ConversationsPage] Loaded ${uniqueNewMessages.length} more unique messages (${newMessages.length} total fetched) for topic:`, selectedTopicId);
    } catch (error) {
      console.error('[ConversationsPage] Error fetching more messages:', error);
      showErrorToast(error, 'Failed to load more messages');
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [currentTenantId, agentName, activationName, selectedTopicId, session?.user?.email, messagePages, initialLoadComplete, conversation]);

  const handleCreateTopic = () => {
    console.log('Creating new topic');
    // TODO: Implement API call to create new topic
  };

  // Loading state
  if (isLoadingTopics) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Loading Conversation
        </h2>
        <p className="text-muted-foreground max-w-md">
          Fetching topics for {activationName || 'agent'}...
        </p>
      </div>
    );
  }

  // No agent selected
  if (!agentName && !agentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Bot className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Select an Agent
        </h2>
        <p className="text-muted-foreground max-w-md">
          Choose an agent to view conversations and start chatting
        </p>
      </div>
    );
  }

  // No conversation found
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Bot className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          No Active Conversation
        </h2>
        <p className="text-muted-foreground max-w-md">
          {agentName && activationName 
            ? `No topics found for ${activationName}`
            : 'There are no active conversations with this agent'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Topics List - Left Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r">
        <div className="flex-1 overflow-hidden">
          <TopicList
            topics={conversation.topics}
            selectedTopicId={selectedTopicId}
            onSelectTopic={handleTopicSelect}
            onCreateTopic={handleCreateTopic}
            unreadCounts={unreadCounts}
          />
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t p-3 flex items-center justify-between bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <span className="text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore}
              className="h-8 px-2"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Chat Interface - Main Area */}
      <div className="flex-1 flex flex-col">
        {selectedTopicId ? (
          <ChatInterface
            conversation={conversation}
            selectedTopicId={selectedTopicId}
            onSendMessage={handleSendMessage}
            isLoadingMessages={isLoadingMessages}
            onLoadMoreMessages={handleLoadMoreMessages}
            isLoadingMoreMessages={isLoadingMoreMessages}
            hasMoreMessages={hasMoreMessages[selectedTopicId] ?? false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Topic Selected
            </h3>
            <p className="text-muted-foreground">
              Select a topic from the left to view messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <ConversationsContent />
    </Suspense>
  );
}
