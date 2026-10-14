'use client';

import { useState } from 'react';
import { format, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateRange, DateRangePreset } from '../types';
import {
  MAX_RANGE_DAYS,
  detectPreset,
  formatDateRangeDisplay,
  getDateRangeFromPreset,
  isRangeTooLong,
  toDateRange,
} from '../utils/date-helpers';
import { RangeCalendar } from './range-calendar';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (range: DateRange) => void;
}

const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last1month', label: 'Last 1 month' },
  { value: 'last3months', label: 'Last 3 months' },
  { value: 'last6months', label: 'Last 6 months' },
  { value: 'last1year', label: 'Last year' },
];

export function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date(endDate)));

  const today = startOfDay(new Date());
  const pendingRange = start && end ? toDateRange(start, end) : null;
  const selectedPreset = pendingRange ? detectPreset(pendingRange.startDate, pendingRange.endDate) : 'custom';
  const tooLong = start !== null && end !== null && isRangeTooLong(start, end);
  const canApply = start !== null && end !== null && !tooLong;

  // Pending dates are kept at midnight, like calendar clicks, so the last day
  // isn't both an endpoint and in-range. toDateRange() expands it on Apply.
  const selectRange = (range: DateRange) => {
    setStart(startOfDay(new Date(range.startDate)));
    setEnd(startOfDay(new Date(range.endDate)));
    setMonth(startOfMonth(new Date(range.endDate)));
  };

  // Reset the pending selection from props every time the picker opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      selectRange({ startDate, endDate });
    }
    setOpen(nextOpen);
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    selectRange(getDateRangeFromPreset(preset));
  };

  // First click starts a new range, second click closes it
  const handleDayClick = (day: Date) => {
    if (!start || end) {
      setStart(day);
      setEnd(null);
    } else if (isBefore(day, start)) {
      setStart(day);
      setEnd(start);
    } else {
      setEnd(day);
    }
  };

  const handleApply = () => {
    if (!start || !end) return;
    onDateRangeChange(toDateRange(start, end));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">
            {formatDateRangeDisplay(startDate, endDate)}
          </span>
          <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] p-0 sm:w-auto">
        <div className="flex flex-col sm:flex-row">
          {/* Relative range */}
          <div className="border-b p-3 sm:w-48 sm:border-b-0 sm:border-r">
            <p className="mb-2 px-2 text-sm font-medium">Relative range</p>
            <div className="space-y-0.5">
              {PRESET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePresetClick(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                    selectedPreset === option.value && 'bg-accent text-accent-foreground'
                  )}
                >
                  {option.label}
                  {selectedPreset === option.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Absolute range */}
          <div className="space-y-3 p-4 sm:w-80">
            <p className="text-sm font-medium">Absolute range</p>
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Start date" value={start} />
              <DateField label="End date" value={end} />
            </div>
            <RangeCalendar
              month={month}
              start={start}
              end={end}
              maxDate={today}
              onMonthChange={setMonth}
              onDayClick={handleDayClick}
            />
            {tooLong && (
              <p className="text-xs text-destructive">Range cannot exceed {MAX_RANGE_DAYS} days</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t p-3">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} disabled={!canApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DateField({ label, value }: { label: string; value: Date | null }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex h-9 items-center gap-2 rounded-md border px-2 text-sm">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value ? format(value, 'MMM d, yyyy') : 'Select date'}
        </span>
      </div>
    </div>
  );
}
