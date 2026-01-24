import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import { Conversation } from '@/lib/data/dummy-conversations';
import { Button } from '@/components/ui/button';
import { ChatInterface, TopicList, ConversationHeader } from '@/components/features/conversations';
import { ActivationOption } from '../hooks';
import { cn } from '@/lib/utils';

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
}

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
}: ConversationViewProps) {
  const handleCreateTopic = useCallback(() => {
    console.log('Creating new topic');
    // TODO: Implement API call to create new topic
  }, []);

  const selectedTopic = conversation.topics.find(t => t.id === selectedTopicId);
  
  // Find the current activation to check if it's active
  const currentActivation = activations.find(
    a => a.name === selectedActivationName && a.agentName === agentName
  );
  const isAgentActive = currentActivation?.status === 'active';

  return (
    <div className="flex h-full bg-card">
      {/* Topics List - Left Column */}
      <div className="w-96 flex-shrink-0 flex flex-col border-r border-border/30 shadow-2xl">
        {/* Topics Column: Agent Selector + Topics List */}
        <div className="flex-1 overflow-hidden">
          <TopicList
            topics={conversation.topics}
            selectedTopicId={selectedTopicId}
            onSelectTopic={onTopicSelect}
            onCreateTopic={handleCreateTopic}
            unreadCounts={unreadCounts}
            activations={activations}
            selectedActivationName={selectedActivationName}
            onActivationChange={onActivationChange}
            isLoadingActivations={isLoadingActivations}
            showAgentSelector={true}
          />
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t border-primary/20 p-4 flex items-center justify-between bg-primary/[0.04] shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-9 px-3 rounded-lg bg-primary/5 hover:bg-primary/15 hover:text-primary transition-all duration-300 disabled:opacity-40 border border-primary/10"
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/30 shadow-md">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasMore}
              className="h-9 px-3 rounded-lg bg-primary/5 hover:bg-primary/15 hover:text-primary transition-all duration-300 disabled:opacity-40 border border-primary/10"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Chat Area - Right Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedTopicId && selectedTopic ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-border/50 bg-card px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                {/* Agent Icon + Activation & Topic Info */}
                <div className="flex items-center gap-3">
                  {/* Agent Avatar with Sonar Pulse (only when connected AND agent is active) */}
                  <div className="relative inline-flex">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative z-10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    {isConnected && isAgentActive && <div className="sonar-container absolute inset-0 rounded-full" />}
                  </div>
                  
                  {/* Activation & Topic Info */}
                  <div>
                    {/* Activation Name with Agent Badge */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-sm text-foreground">
                        {selectedActivationName || 'No Activation'}
                      </h3>
                    </div>
                    {/* Topic Name & Message Count */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">
                        {selectedTopic.name}
                      </span>
                      <span className="text-xs text-muted-foreground/60">•</span>
                      <span className="text-xs text-muted-foreground/60">
                        {selectedTopic.messageCount ?? selectedTopic.messages.length} messages
                      </span>
                    </div>
                  </div>
                </div>

                {/* SSE Connection Status */}
                {agentName && selectedActivationName && (
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs",
                      isConnected 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-muted-foreground"
                    )}>
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isConnected && "bg-emerald-500 animate-pulse"
                      )} />
                      {isConnected && 'Live'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 min-h-0">
              <ChatInterface
                conversation={conversation}
                selectedTopicId={selectedTopicId}
                onSendMessage={onSendMessage}
                isLoadingMessages={isLoadingMessages}
                onLoadMoreMessages={onLoadMoreMessages}
                isLoadingMoreMessages={isLoadingMoreMessages}
                hasMoreMessages={hasMoreMessages}
                activationName={selectedActivationName || undefined}
                hideHeader={true}
                isActivationActive={isAgentActive}
              />
            </div>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
