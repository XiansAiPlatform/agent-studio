'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRangePreset } from '../types';
import { formatDateRangeDisplay } from '../utils/date-helpers';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (preset: DateRangePreset) => void;
}

const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last90days', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
];

export function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last30days');

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    onDateRangeChange(preset);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">
            {formatDateRangeDisplay(startDate, endDate)}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {PRESET_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handlePresetChange(option.value)}
            className={selectedPreset === option.value ? 'bg-accent' : ''}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
