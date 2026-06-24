'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { FeedbackFilters } from '../types';

const ANY_VALUE = 'all';

interface FeedbackFilterBarProps {
  filters: FeedbackFilters;
  agentNames: string[];
  onChange: (next: Partial<FeedbackFilters>) => void;
  onClearAll: () => void;
}

export function FeedbackFilterBar({
  filters,
  agentNames,
  onChange,
  onClearAll,
}: FeedbackFilterBarProps) {
  const hasActiveFilters =
    filters.agentName !== null ||
    filters.rating !== null ||
    filters.startDate !== null ||
    filters.endDate !== null;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Agent */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Agent</Label>
          <Select
            value={filters.agentName ?? ANY_VALUE}
            onValueChange={(v) =>
              onChange({ agentName: v === ANY_VALUE ? null : v })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>All agents</SelectItem>
              {agentNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rating */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Rating</Label>
          <Select
            value={filters.rating !== null ? String(filters.rating) : ANY_VALUE}
            onValueChange={(v) =>
              onChange({ rating: v === ANY_VALUE ? null : Number(v) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any rating</SelectItem>
              {[5, 4, 3, 2, 1].map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r} star{r > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start date */}
        <div className="space-y-1.5">
          <Label htmlFor="feedback-start-date" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="feedback-start-date"
            type="date"
            value={filters.startDate ?? ''}
            max={filters.endDate ?? undefined}
            onChange={(e) => onChange({ startDate: e.target.value || null })}
          />
        </div>

        {/* End date */}
        <div className="space-y-1.5">
          <Label htmlFor="feedback-end-date" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="feedback-end-date"
            type="date"
            value={filters.endDate ?? ''}
            min={filters.startDate ?? undefined}
            onChange={(e) => onChange({ endDate: e.target.value || null })}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Active:</span>

          {filters.agentName && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => onChange({ agentName: null })}
            >
              {filters.agentName}
              <X className="ml-1.5 h-3 w-3" />
            </Badge>
          )}

          {filters.rating !== null && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => onChange({ rating: null })}
            >
              {filters.rating} star{filters.rating > 1 ? 's' : ''}
              <X className="ml-1.5 h-3 w-3" />
            </Badge>
          )}

          {(filters.startDate || filters.endDate) && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => onChange({ startDate: null, endDate: null })}
            >
              {filters.startDate || '…'} – {filters.endDate || '…'}
              <X className="ml-1.5 h-3 w-3" />
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs hover:bg-muted/60"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
