'use client';

import { useState } from 'react';
import { ChevronRight, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCategory } from '../types';
import { MetricTypeItem } from './metric-type-item';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: MetricCategory;
  showViewTimeline?: boolean;
  onViewDetails?: (type: string, category: string) => void;
}

export function CategoryCard({
  category,
  showViewTimeline,
  onViewDetails,
}: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader
        className="!pb-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground tracking-tight">
                {category.category}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant="secondary"
              className="text-xs px-2.5 py-1 rounded-md font-normal"
            >
              {category.totalRecords} record{category.totalRecords !== 1 ? 's' : ''}
            </Badge>
            <ChevronRight
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="!pt-0 !pb-5 bg-muted/5">
          <div className="space-y-3">
            {category.types.map((metricType) => (
              <MetricTypeItem
                key={metricType.type}
                metricType={metricType}
                category={category.category}
                showViewTimeline={showViewTimeline}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
