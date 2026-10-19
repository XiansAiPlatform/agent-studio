import { TopicList } from '@/components/features/conversations';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { Topic } from '@/types/conversation';
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
  selectedAgentName?: string | null;
  selectedActivationName: string | null;
  onActivationChange: (activationName: string, agentName: string, workflowName: string) => void;
  isLoadingActivations: boolean;
  isLoadingTopics?: boolean;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  /**
   * When true, drop the fixed `w-96` rail chrome (host Sheet provides surface
   * + width). The host should also auto-close the Sheet on topic actions.
   */
  mobile?: boolean;
  selectedWorkflow?: string;
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
  selectedAgentName = null,
  selectedActivationName,
  onActivationChange,
  isLoadingActivations,
  isLoadingTopics = false,
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  mobile = false,
  selectedWorkflow,
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
          selectedAgentName={selectedAgentName}
          selectedActivationName={selectedActivationName}
          onActivationChange={onActivationChange}
          isLoadingActivations={isLoadingActivations}
          isLoadingTopics={isLoadingTopics}
          showAgentSelector={true}
          selectedWorkflow={selectedWorkflow}
        />
      </div>

      {!isLoadingTopics && (
        <PaginationBar
          variant="compact"
          attached
          page={currentPage}
          totalPages={totalPages}
          hasNext={hasMore}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
