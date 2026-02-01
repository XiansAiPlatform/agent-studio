import { Bot } from 'lucide-react';
import { ChatInterface } from '@/components/features/conversations';
import { Conversation, Topic } from '@/lib/data/dummy-conversations';

interface ChatPanelProps {
  conversation: Conversation;
  selectedTopic: Topic | undefined;
  selectedTopicId: string;
  onSendMessage: (content: string, topicId: string) => void;
  isLoadingMessages: boolean;
  onLoadMoreMessages: () => void;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  activationName: string | null;
  isAgentActive: boolean;
  chatInputRef?: React.RefObject<HTMLInputElement | null>;
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
  isLoadingMessages,
  onLoadMoreMessages,
  isLoadingMoreMessages,
  hasMoreMessages,
  activationName,
  isAgentActive,
  chatInputRef,
}: ChatPanelProps) {
  if (!selectedTopicId || !selectedTopic) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-card">
        <div className="h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center mb-6 shadow-xl border border-primary/30">
          <Bot className="h-10 w-10 text-primary" />
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
        isLoadingMessages={isLoadingMessages}
        onLoadMoreMessages={onLoadMoreMessages}
        isLoadingMoreMessages={isLoadingMoreMessages}
        hasMoreMessages={hasMoreMessages}
        activationName={activationName || undefined}
        hideHeader={true}
        isActivationActive={isAgentActive}
        inputRef={chatInputRef}
      />
    </div>
  );
}
