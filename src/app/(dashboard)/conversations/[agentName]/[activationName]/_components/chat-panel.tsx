import { Bot, Loader2 } from 'lucide-react';
import { ChatInterface, FileUploadPayload } from '@/components/features/conversations';
import { Conversation, Topic, Message } from '@/types/conversation';

interface ChatPanelProps {
  conversation: Conversation;
  selectedTopic: Topic | undefined;
  selectedTopicId: string;
  onSendMessage: (content: string, topicId: string, files?: FileUploadPayload[]) => void;
  allowFileUpload?: boolean;
  isLoadingMessages: boolean;
  onLoadMoreMessages: () => void;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  activationName: string | null;
  isAgentActive: boolean;
  chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Agent info from deployment - shown in empty state when no messages */
  agentInfo?: { summary: string | null; description: string | null; category: string | null; samplePrompts: string[] | null } | null;
  onMessageFeedbackSubmitted?: (
    messageId: string,
    feedback: NonNullable<Message['feedback']>
  ) => void;
  /** Workflow has no OnUserChatMessage (or is not registered for messaging). */
  noConversationalCapability?: boolean;
}

/**
 * Chat Panel Component
 * 
 * Displays the chat interface or an empty state when no topic is selected.
 */
export function ChatPanel({
  conversation,
  selectedTopic,
  selectedTopicId,
  onSendMessage,
  allowFileUpload,
  isLoadingMessages,
  onLoadMoreMessages,
  isLoadingMoreMessages,
  hasMoreMessages,
  activationName,
  isAgentActive,
  chatInputRef,
  agentInfo,
  onMessageFeedbackSubmitted,
  noConversationalCapability = false,
}: ChatPanelProps) {
  if (noConversationalCapability) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center p-12 bg-card">
        <div className="h-28 w-28 rounded-3xl bg-muted flex items-center justify-center mb-8 shadow-sm border border-border">
          <Bot className="h-14 w-14 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
          No Conversational Capability
        </h2>
        <p className="text-muted-foreground max-w-md text-sm">
          This workflow does not support conversations.
        </p>
        <p className="text-muted-foreground/80 max-w-md text-xs mt-2">
          Try selecting a different workflow, or contact your administrator to request conversation support.
        </p>
      </div>
    );
  }

  if (isLoadingMessages && (!selectedTopicId || !selectedTopic)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-card">
        <div className="chat-icon-container h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 shadow-2xl border border-primary/30">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <p className="text-sm text-foreground font-medium">
          Loading conversation...
        </p>
      </div>
    );
  }

  if (!selectedTopicId || !selectedTopic) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-card">
        <div className="chat-icon-container h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center mb-6 shadow-xl border border-primary/30">
          <Bot className="h-10 w-10" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
          No Topic Selected
        </h3>
        <p className="text-primary/70 text-base font-medium">
          Select a topic from the left to view messages
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <ChatInterface
        conversation={conversation}
        selectedTopicId={selectedTopicId}
        onSendMessage={onSendMessage}
        allowFileUpload={allowFileUpload}
        isLoadingMessages={isLoadingMessages}
        onLoadMoreMessages={onLoadMoreMessages}
        isLoadingMoreMessages={isLoadingMoreMessages}
        hasMoreMessages={hasMoreMessages}
        activationName={activationName || undefined}
        hideHeader={true}
        isActivationActive={isAgentActive}
        inputRef={chatInputRef}
        agentInfo={agentInfo}
        onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
      />
    </div>
  );
}
