'use client';

import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { DATE_RANGES, type DateRange } from '../types';
import { formatDateForInput } from '../utils';

interface FiltersSectionProps {
  selectedDateRange: DateRange;
  customStartDate: string;
  customEndDate: string;
  onDateRangeChange: (value: string) => void;
  onCustomDateChange: (startDate: string, endDate: string) => void;
}

export function FiltersSection({
  selectedDateRange,
  customStartDate,
  customEndDate,
  onDateRangeChange,
  onCustomDateChange,
}: FiltersSectionProps) {
  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-xl border shadow-sm">
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">Quick Select</label>
          <Select value={selectedDateRange.value} onValueChange={onDateRangeChange}>
            <SelectTrigger className="w-full h-8 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-primary" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">From</label>
            <Input
              type="date"
              value={formatDateForInput(customStartDate)}
              onChange={(e) => onCustomDateChange(e.target.value, formatDateForInput(customEndDate))}
              className="h-8 border-border/50 hover:border-primary/50 transition-colors text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">To</label>
            <Input
              type="date"
              value={formatDateForInput(customEndDate)}
              onChange={(e) => onCustomDateChange(formatDateForInput(customStartDate), e.target.value)}
              className="h-8 border-border/50 hover:border-primary/50 transition-colors text-xs"
            />
          </div>
        </div>

        <div className="bg-white/80 border border-border/30 rounded-lg p-2">
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Period:</strong>{' '}
            {new Date(customStartDate).toLocaleDateString()} to{' '}
            {new Date(customEndDate).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
