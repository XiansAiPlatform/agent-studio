import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopicList } from '@/components/features/conversations';
import { Topic } from '@/lib/data/dummy-conversations';
import { ActivationOption } from '../../../hooks';

interface TopicSidebarProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCreateTopic?: (topicName: string) => void;
  unreadCounts: Record<string, number>;
  activations: ActivationOption[];
  selectedActivationName: string | null;
  onActivationChange: (activationName: string, agentName: string) => void;
  isLoadingActivations: boolean;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Topic Sidebar Component
 * 
 * Displays the list of conversation topics with pagination controls,
 * agent selector, and topic creation functionality.
 */
export function TopicSidebar({
  topics,
  selectedTopicId,
  onSelectTopic,
  onCreateTopic,
  unreadCounts,
  activations,
  selectedActivationName,
  onActivationChange,
  isLoadingActivations,
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
}: TopicSidebarProps) {
  return (
    <div className="w-96 flex-shrink-0 flex flex-col border-r border-border/30 shadow-2xl">
      {/* Topics List */}
      <div className="flex-1 overflow-hidden">
        <TopicList
          topics={topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={onSelectTopic}
          onCreateTopic={onCreateTopic}
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
