import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LogsPaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemNoun: 'log' | 'stream';
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function LogsPaginationBar({
  currentPage,
  totalPages,
  totalCount,
  itemNoun,
  isLoading,
  onPageChange,
}: LogsPaginationBarProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="!px-4 !py-3 sm:!px-5 sm:!py-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            Page {currentPage} of {Math.max(totalPages, 1)} • {totalCount.toLocaleString()} total{' '}
            {itemNoun}
            {totalCount !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="h-8 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="h-8 rounded-lg"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
