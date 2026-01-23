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
import { ChatInterface, TopicList, ActivationOption, ConversationHeader } from '@/components/features/conversations';
import { Bot, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { Input } from '@/components/ui/input';
import { XiansTopicsResponse, XiansMessageHistoryResponse, XiansMessage } from '@/lib/xians/types';
import { showErrorToast } from '@/lib/utils/error-handler';
import { Button } from '@/components/ui/button';
import { useMessageListener } from '@/hooks/use-message-listener';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  // Agent activation selector state
  const [activations, setActivations] = useState<ActivationOption[]>([]);
  const [isLoadingActivations, setIsLoadingActivations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

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

  // Fetch available activations for the selector
  useEffect(() => {
    const fetchActivations = async () => {
      if (!currentTenantId) {
        return;
      }

      setIsLoadingActivations(true);
      try {
        // Fetch all activations (we'll filter client-side based on showActiveOnly)
        const response = await fetch(
          `/api/tenants/${currentTenantId}/agent-activations`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch activations');
        }

        const data = await response.json();
        const activationsList = Array.isArray(data) ? data : [];

        // Map to ActivationOption format
        const mappedActivations: ActivationOption[] = activationsList.map((activation: any) => ({
          id: activation.id,
          name: activation.name,
          agentName: activation.agentName,
          isActive: activation.isActive,
          description: activation.description,
        }));

        setActivations(mappedActivations);
      } catch (error) {
        console.error('[ConversationsPage] Error fetching activations:', error);
        // Don't show error toast - this is a secondary feature
        setActivations([]);
      } finally {
        setIsLoadingActivations(false);
      }
    };

    fetchActivations();
  }, [currentTenantId]);

  // Handle agent deployment change (filter)
  const handleAgentChange = useCallback((newAgentName: string | null) => {
    // When agent changes, we might want to clear or update the activation selection
    // For now, if the current activation is not from the new agent, clear it
    if (newAgentName && agentName !== newAgentName) {
      // Find first activation for this agent
      const firstActivation = activations.find(a => a.agentName === newAgentName);
      if (firstActivation) {
        handleActivationChange(firstActivation.name, firstActivation.agentName);
      }
    }
  }, [activations, agentName]);

  // Handle activation selection change
  const handleActivationChange = useCallback((newActivationName: string, newAgentName: string) => {
    // Update URL with new agent and activation
    const params = new URLSearchParams();
    params.set('agent-name', newAgentName);
    params.set('activation-name', newActivationName);
    // Reset topic to general when changing activation
    params.set('topic', 'general-discussions');
    
    router.push(`/conversations?${params.toString()}`, { scroll: false });
  }, [router]);

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

  // Get selected topic
  const selectedTopic = conversation?.topics.find(t => t.id === selectedTopicId);

  // Loading state
  if (isLoadingTopics) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gradient-to-b from-background via-muted/5 to-background">
        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center mb-6 shadow-xl border border-primary/20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
          Loading Conversation
        </h2>
        <p className="text-muted-foreground/90 max-w-md font-medium">
          Fetching topics for {activationName || 'agent'}...
        </p>
      </div>
    );
  }

  // No agent selected - show nicely styled agent selection view
  if (!agentName && !agentId) {
    return (
      <div className="flex h-full bg-gradient-to-br from-background via-muted/5 to-background">
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <div className="w-full max-w-4xl">
            {/* Header Section */}
            <div className="mb-4 mt-2">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Select an Agent
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Choose an activation to start chatting
              </p>
              
              {/* Search and Filter */}
              <div className="flex gap-2 items-center">
                {/* All/Active Switch */}
                <div className="inline-flex rounded-md border border-border bg-background p-0.5 flex-shrink-0">
                  <button
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      !showActiveOnly 
                        ? 'bg-accent text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setShowActiveOnly(false)}
                  >
                    <span className="flex items-center gap-1.5">
                      All
                      <span className="text-[10px] opacity-60">
                        ({activations.length})
                      </span>
                    </span>
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      showActiveOnly 
                        ? 'bg-accent text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setShowActiveOnly(true)}
                  >
                    <span className="flex items-center gap-1.5">
                      Active
                      <span className="text-[10px] opacity-60">
                        ({activations.filter(a => a.isActive).length})
                      </span>
                    </span>
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Agent Activation List */}
            <div>
            {isLoadingActivations ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground text-sm">Loading available agents...</p>
              </div>
            ) : activations.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-border">
                <Bot className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Agents</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  You need to activate an agent before you can start a conversation
                </p>
                <Button
                  onClick={() => router.push('/agents/running')}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Go to Agents
                </Button>
              </div>
            ) : (
              (() => {
                // Filter activations based on search query and active status
                const filteredActivations = activations.filter((a) => {
                  // Filter by active status
                  if (showActiveOnly && !a.isActive) {
                    return false;
                  }
                  
                  // Filter by search query
                  const query = searchQuery.toLowerCase();
                  return (
                    a.name.toLowerCase().includes(query) ||
                    a.agentName.toLowerCase().includes(query) ||
                    (a.description && a.description.toLowerCase().includes(query))
                  );
                });

                // Group by agent name
                const groupedActivations = filteredActivations.reduce((acc, a) => {
                  if (!acc[a.agentName]) acc[a.agentName] = [];
                  acc[a.agentName].push(a);
                  return acc;
                }, {} as Record<string, ActivationOption[]>);

                // Show no results message if search returned nothing
                if (searchQuery && filteredActivations.length === 0) {
                  return (
                    <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed border-border">
                      <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No agents found matching "{searchQuery}"
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {Object.entries(groupedActivations).map(([agentName, agentActivations]) => (
                  <div key={agentName} className="space-y-2">
                    {/* Agent Name Header */}
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <Bot className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">{agentName}</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Activation List Items */}
                    <div className="space-y-1.5">
                      {agentActivations.map((activation) => {
                        const isActive = activation.name === activationName && activation.agentName === agentName;
                        return (
                        <button
                          key={activation.id}
                          onClick={() => handleActivationChange(activation.name, activation.agentName)}
                          className={cn(
                            "group w-full border rounded-lg p-4 text-left transition-all duration-200",
                            isActive 
                              ? "bg-primary/10 border-primary shadow-md shadow-primary/10" 
                              : "bg-card hover:bg-accent/80 border-border hover:border-primary/60 hover:shadow-md hover:translate-x-1"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                              <Bot className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary-foreground truncate transition-colors">
                                  {activation.name}
                                </h4>
                                {activation.isActive && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 group-hover:text-emerald-300 flex-shrink-0 transition-colors">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors" />
                                    Active
                                  </span>
                                )}
                              </div>
                              {activation.description && (
                                <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 line-clamp-1 transition-colors">
                                  {activation.description}
                                </p>
                              )}
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  </div>
                    ))}
                  </div>
                );
              })()
            )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No conversation found
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gradient-to-b from-background via-muted/5 to-background">
        <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center mb-8 shadow-2xl border border-primary/20 animate-in fade-in zoom-in duration-500">
          <Bot className="h-14 w-14 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
          No Active Conversation
        </h2>
        <p className="text-muted-foreground/90 max-w-md text-base font-medium">
          {agentName && activationName 
            ? `No topics found for ${activationName}`
            : 'There are no active conversations with this agent'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/5">
      {/* Unified Header - Spans both columns */}
      <ConversationHeader
        activations={activations}
        selectedActivationName={activationName}
        onActivationChange={handleActivationChange}
        isLoadingActivations={isLoadingActivations}
        agentName={agentName || undefined}
        agentStatus={conversation?.agent.status || 'online'}
        selectedTopicName={selectedTopic?.name}
        selectedTopicCreatedAt={selectedTopic?.createdAt}
        selectedTopicMessageCount={selectedTopic?.messageCount ?? selectedTopic?.messages.length}
      />

      {/* Two Column Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Topics List - Left Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-border/20 shadow-lg">
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
          <div className="border-t border-border/30 p-4 flex items-center justify-between bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10 shadow-inner">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 px-3 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            
            <span className="text-xs font-bold text-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/30">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore}
              className="h-9 px-3 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}
        </div>

        {/* Chat Interface - Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedTopicId ? (
            <ChatInterface
              conversation={conversation}
              selectedTopicId={selectedTopicId}
              onSendMessage={handleSendMessage}
              isLoadingMessages={isLoadingMessages}
              onLoadMoreMessages={handleLoadMoreMessages}
              isLoadingMoreMessages={isLoadingMoreMessages}
              hasMoreMessages={hasMoreMessages[selectedTopicId] ?? false}
              activationName={activationName || undefined}
              hideHeader={true}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gradient-to-b from-background via-muted/5 to-background">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center mb-6 shadow-lg border border-border/30">
                <Bot className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
                No Topic Selected
              </h3>
              <p className="text-muted-foreground/90 text-base font-medium">
                Select a topic from the left to view messages
              </p>
            </div>
          )}
        </div>
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
