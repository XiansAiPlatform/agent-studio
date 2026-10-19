'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RangeCalendarProps {
  month: Date;
  start: Date | null;
  end: Date | null;
  maxDate: Date;
  onMonthChange: (month: Date) => void;
  onDayClick: (day: Date) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function RangeCalendar({ month, start, end, maxDate, onMonthChange, onDayClick }: RangeCalendarProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  const isEndpoint = (day: Date) =>
    (start !== null && isSameDay(day, start)) || (end !== null && isSameDay(day, end));
  const isInRange = (day: Date) =>
    start !== null && end !== null && isAfter(day, start) && isBefore(day, end);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onMonthChange(subMonths(month, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onMonthChange(addMonths(month, 1))}
            disabled={isSameMonth(month, maxDate) || isAfter(month, maxDate)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1 text-xs text-muted-foreground">
            {weekday}
          </span>
        ))}
        {days.map((day) => {
          const disabled = isAfter(day, maxDate);
          const endpoint = isEndpoint(day);
          const inRange = isInRange(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onDayClick(day)}
              aria-pressed={endpoint}
              className={cn(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !isSameMonth(day, month) && 'text-muted-foreground/50',
                inRange && 'rounded-md bg-accent text-accent-foreground',
                isToday(day) && !endpoint && 'ring-1 ring-primary',
                endpoint && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                disabled && 'pointer-events-none opacity-30'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
