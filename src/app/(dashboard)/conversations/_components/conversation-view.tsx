import { useCallback } from 'react';
import { Conversation } from '@/lib/data/dummy-conversations';
import { ActivationOption } from '../hooks';
import { 
  ConversationHeader, 
  TopicSidebar, 
  ChatPanel 
} from '../[agentName]/[activationName]/_components';

interface ConversationViewProps {
  conversation: Conversation;
  selectedTopicId: string;
  onTopicSelect: (topicId: string) => void;
  onSendMessage: (content: string, topicId: string) => void;
  isLoadingMessages: boolean;
  onLoadMoreMessages: () => void;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  unreadCounts: Record<string, number>;
  activations: ActivationOption[];
  selectedActivationName: string | null;
  onActivationChange: (activationName: string, agentName: string) => void;
  isLoadingActivations: boolean;
  agentName?: string;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  isConnected: boolean;
  sseError?: Error | null;
  onCreateTopic?: (topicName: string) => void;
  chatInputRef?: React.RefObject<HTMLInputElement>;
}

/**
 * Conversation View Component
 * 
 * Main layout component that displays:
 * - Left: Topic sidebar with agent selector and pagination
 * - Right: Chat header and chat panel
 */
export function ConversationView({
  conversation,
  selectedTopicId,
  onTopicSelect,
  onSendMessage,
  isLoadingMessages,
  onLoadMoreMessages,
  isLoadingMoreMessages,
  hasMoreMessages,
  unreadCounts,
  activations,
  selectedActivationName,
  onActivationChange,
  isLoadingActivations,
  agentName,
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  isConnected,
  sseError,
  onCreateTopic,
  chatInputRef,
}: ConversationViewProps) {
  const selectedTopic = conversation.topics.find(t => t.id === selectedTopicId);
  
  // Find the current activation to check if it's active
  const currentActivation = activations.find(
    a => a.name === selectedActivationName && a.agentName === agentName
  );
  const isAgentActive = currentActivation?.status === 'active';

  return (
    <div className="flex h-full bg-card">
      {/* Topics List - Left Sidebar */}
      <TopicSidebar
        topics={conversation.topics}
        selectedTopicId={selectedTopicId}
        onSelectTopic={onTopicSelect}
        onCreateTopic={onCreateTopic}
        unreadCounts={unreadCounts}
        activations={activations}
        selectedActivationName={selectedActivationName}
        onActivationChange={onActivationChange}
        isLoadingActivations={isLoadingActivations}
        currentPage={currentPage}
        totalPages={totalPages}
        hasMore={hasMore}
        onPageChange={onPageChange}
      />

      {/* Chat Area - Right Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedTopicId && selectedTopic ? (
          <>
            {/* Chat Header */}
            <ConversationHeader
              activationName={selectedActivationName || 'No Activation'}
              topic={selectedTopic}
              isConnected={isConnected}
              isAgentActive={isAgentActive}
            />

            {/* Chat Interface */}
            <ChatPanel
              conversation={conversation}
              selectedTopic={selectedTopic}
              selectedTopicId={selectedTopicId}
              onSendMessage={onSendMessage}
              isLoadingMessages={isLoadingMessages}
              onLoadMoreMessages={onLoadMoreMessages}
              isLoadingMoreMessages={isLoadingMoreMessages}
              hasMoreMessages={hasMoreMessages}
              activationName={selectedActivationName}
              isAgentActive={isAgentActive}
              chatInputRef={chatInputRef}
            />
          </>
        ) : (
          <ChatPanel
            conversation={conversation}
            selectedTopic={undefined}
            selectedTopicId={''}
            onSendMessage={onSendMessage}
            isLoadingMessages={isLoadingMessages}
            onLoadMoreMessages={onLoadMoreMessages}
            isLoadingMoreMessages={isLoadingMoreMessages}
            hasMoreMessages={hasMoreMessages}
            activationName={selectedActivationName}
            isAgentActive={isAgentActive}
            chatInputRef={chatInputRef}
          />
        )}
      </div>
    </div>
  );
}
