import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopicList } from '@/components/features/conversations';
import { Topic } from '@/lib/data/dummy-conversations';
import { ActivationOption } from '../../../hooks';
import { cn } from '@/lib/utils';

interface TopicSidebarProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCreateTopic?: (topicName: string) => void;
  onDeleteTopic?: (topicId: string, topicName: string) => Promise<void>;
  unreadCounts: Record<string, number>;
  activations: ActivationOption[];
  selectedActivationName: string | null;
  onActivationChange: (activationName: string, agentName: string) => void;
  isLoadingActivations: boolean;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  /**
   * When true, drop the fixed `w-96` rail chrome (host Sheet provides surface
   * + width). The host should also auto-close the Sheet on topic actions.
   */
  mobile?: boolean;
}

/**
 * Topic Sidebar Component
 *
 * Displays the list of conversation topics with pagination controls,
 * agent selector, and topic creation functionality.
 *
 * On mobile this same component is rendered inside a left `<Sheet>` from
 * `ConversationView` with `mobile` set, so the rail chrome is dropped.
 */
export function TopicSidebar({
  topics,
  selectedTopicId,
  onSelectTopic,
  onCreateTopic,
  onDeleteTopic,
  unreadCounts,
  activations,
  selectedActivationName,
  onActivationChange,
  isLoadingActivations,
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  mobile = false,
}: TopicSidebarProps) {
  return (
    <div
      className={cn(
        'conversation-topic-sidebar flex flex-col bg-background',
        mobile
          ? 'h-full w-full'
          : 'w-96 flex-shrink-0 border-r border-border/30 shadow-2xl'
      )}
    >
      {/* Topics List */}
      <div className="flex-1 overflow-hidden">
        <TopicList
          topics={topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={onSelectTopic}
          onCreateTopic={onCreateTopic}
          onDeleteTopic={onDeleteTopic}
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
  );
}
