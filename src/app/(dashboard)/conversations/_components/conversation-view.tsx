'use client';

import { useState } from 'react';
import { Conversation, Message } from '@/lib/data/dummy-conversations';
import { ActivationOption } from '../hooks';
import { useParticipantLayout } from '@/contexts/participant-layout-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  ConversationHeader,
  TopicSidebar,
  ChatPanel
} from '../[agentName]/[activationName]/_components';

interface ConversationViewProps {
  conversation: Conversation;
  selectedTopicId: string;
  onTopicSelect: (topicId: string) => void;
  onSendMessage: (content: string, topicId: string, files?: import('@/components/features/conversations').FileUploadPayload[]) => void;
  allowFileUpload?: boolean;
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
  /** Agent worker liveness from heartbeat. null = checking. */
  workerAvailable?: boolean | null;
  /** true when API/server unreachable (distinct from worker unavailable) */
  serverUnavailable?: boolean;
  /** Whether heartbeat check is in progress */
  isHeartbeatLoading?: boolean;
  /** Called when user clicks status (Live or Worker/Server unavailable) to re-check heartbeat */
  onRetryHeartbeat?: () => void;
  onCreateTopic?: (topicName: string) => void;
  onDeleteTopic?: (topicId: string, topicName: string) => Promise<void>;
  chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Agent info from deployment - shown in empty state when no messages */
  agentInfo?: { summary: string | null; description: string | null; category: string | null; samplePrompts: string[] | null } | null;
  onMessageFeedbackSubmitted?: (
    messageId: string,
    feedback: NonNullable<Message['feedback']>
  ) => void;
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
  allowFileUpload,
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
  workerAvailable = null,
  serverUnavailable = false,
  isHeartbeatLoading = false,
  onRetryHeartbeat,
  onCreateTopic,
  onDeleteTopic,
  chatInputRef,
  agentInfo,
  onMessageFeedbackSubmitted,
}: ConversationViewProps) {
  const { isParticipantMode } = useParticipantLayout();
  const isMobile = useIsMobile();
  const [topicsDrawerOpen, setTopicsDrawerOpen] = useState(false);
  const selectedTopic = conversation.topics.find(t => t.id === selectedTopicId);

  // Find the current activation to check if it's active
  const currentActivation = activations.find(
    a => a.name === selectedActivationName && a.agentName === agentName
  );
  const isAgentActive = currentActivation?.status === 'active';

  // Admin mode + mobile: TopicSidebar lives inside a left Sheet that the
  // conversation header opens. Desktop and participant flows are unchanged.
  const showTopicSidebarInline = !isParticipantMode && !isMobile;
  const showTopicsDrawerOnMobile = !isParticipantMode && isMobile;

  // Auto-close the drawer when a topic is picked / created / deleted on mobile.
  const handleTopicSelectMobile = (id: string) => {
    onTopicSelect(id);
    setTopicsDrawerOpen(false);
  };
  const handleCreateTopicMobile = onCreateTopic
    ? (name: string) => {
        onCreateTopic(name);
        setTopicsDrawerOpen(false);
      }
    : undefined;
  const handleDeleteTopicMobile = onDeleteTopic
    ? async (id: string, name: string) => {
        await onDeleteTopic(id, name);
      }
    : undefined;

  return (
    <div className="flex h-full bg-card">
      {/* Topics List - Left Sidebar (desktop admin only) */}
      {showTopicSidebarInline && (
        <TopicSidebar
          topics={conversation.topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={onTopicSelect}
          onCreateTopic={onCreateTopic}
          onDeleteTopic={onDeleteTopic}
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
      )}

      {/* Topics Drawer - admin mobile only */}
      {showTopicsDrawerOnMobile && (
        <Sheet open={topicsDrawerOpen} onOpenChange={setTopicsDrawerOpen}>
          <SheetContent
            side="left"
            className="w-[85%] max-w-[360px] p-0 md:hidden flex flex-col"
          >
            <SheetTitle className="sr-only">Topics</SheetTitle>
            <TopicSidebar
              mobile
              topics={conversation.topics}
              selectedTopicId={selectedTopicId}
              onSelectTopic={handleTopicSelectMobile}
              onCreateTopic={handleCreateTopicMobile}
              onDeleteTopic={handleDeleteTopicMobile}
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
          </SheetContent>
        </Sheet>
      )}

      {/* Chat Area - Right Column */}
      <div className="chat-conversation flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedTopicId && selectedTopic ? (
          <>
            {/* Chat Header */}
            <ConversationHeader
              activationName={selectedActivationName || 'No Activation'}
              topic={selectedTopic}
              isConnected={isConnected}
              isAgentActive={isAgentActive}
              workerAvailable={workerAvailable}
              serverUnavailable={serverUnavailable}
              isHeartbeatLoading={isHeartbeatLoading}
              onRetryHeartbeat={onRetryHeartbeat}
              onOpenTopics={
                showTopicsDrawerOnMobile
                  ? () => setTopicsDrawerOpen(true)
                  : undefined
              }
            />

            {/* Chat Interface */}
            <ChatPanel
              conversation={conversation}
              selectedTopic={selectedTopic}
              selectedTopicId={selectedTopicId}
              onSendMessage={onSendMessage}
              allowFileUpload={allowFileUpload}
              isLoadingMessages={isLoadingMessages}
              onLoadMoreMessages={onLoadMoreMessages}
              isLoadingMoreMessages={isLoadingMoreMessages}
              hasMoreMessages={hasMoreMessages}
              activationName={selectedActivationName}
              isAgentActive={isAgentActive}
              chatInputRef={chatInputRef}
              agentInfo={agentInfo}
              onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
            />
          </>
        ) : (
          <ChatPanel
            conversation={conversation}
            selectedTopic={undefined}
            selectedTopicId={''}
            onSendMessage={onSendMessage}
            allowFileUpload={allowFileUpload}
            isLoadingMessages={isLoadingMessages}
            onLoadMoreMessages={onLoadMoreMessages}
            isLoadingMoreMessages={isLoadingMoreMessages}
            hasMoreMessages={hasMoreMessages}
            activationName={selectedActivationName}
            isAgentActive={isAgentActive}
            chatInputRef={chatInputRef}
            agentInfo={agentInfo}
            onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
          />
        )}
      </div>
    </div>
  );
}
