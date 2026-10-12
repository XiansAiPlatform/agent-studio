'use client';

import { useEffect, useRef, useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, X } from 'lucide-react';
import type { AuditLogFilters } from '../types';
import { formatFilterDateTime, normalizeDateTimeLocal } from '../utils';

const ANY_VALUE = 'all';
/** Sentinel for entries recorded above the activation level (no activationName set). */
const NO_ACTIVATION_VALUE = 'none';
const NO_ACTIVATION_LABEL = 'Tenant-Level (No Activation)';

const DATE_COMMIT_DELAY_MS = 600;

interface DateTimeFilterInputProps {
  id: string;
  /** Committed value (local `YYYY-MM-DDTHH:mm`) or null. */
  value: string | null;
  min?: string;
  max?: string;
  onCommit: (value: string | null) => void;
}

/**
 * datetime-local emits a change as soon as each segment makes the value valid, which
 * would fire one list request per edit. Keep a draft and commit it once the user pauses
 * or leaves the field.
 */
function DateTimeFilterInput({ id, value, min, max, onCommit }: DateTimeFilterInputProps) {
  const [draft, setDraft] = useState(value ?? '');
  const [syncedValue, setSyncedValue] = useState(value);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  // Reset the draft when the committed value changes from outside (Clear all, chip removal).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value ?? '');
  }

  const isDirty = draft !== (value ?? '');

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => onCommitRef.current(draft || null), DATE_COMMIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, isDirty]);

  const commitNow = () => {
    if (isDirty) onCommit(draft || null);
  };

  return (
    <Input
      id={id}
      type="datetime-local"
      value={draft}
      min={min}
      max={max}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitNow}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitNow();
      }}
    />
  );
}

interface AuditLogFilterBarProps {
  filters: AuditLogFilters;
  performedByOptions: string[];
  actionOptions: string[];
  activationNameOptions: string[];
  onChange: (next: Partial<AuditLogFilters>) => void;
  onClearAll: () => void;
}

export function AuditLogFilterBar({
  filters,
  performedByOptions,
  actionOptions,
  activationNameOptions,
  onChange,
  onClearAll,
}: AuditLogFilterBarProps) {
  const hasActiveFilters =
    filters.performedBy !== null ||
    filters.actions.length > 0 ||
    filters.activationName !== null ||
    filters.onlyWithoutActivation ||
    filters.startDate !== null ||
    filters.endDate !== null;

  const startValue = normalizeDateTimeLocal(filters.startDate, 'start');
  const endValue = normalizeDateTimeLocal(filters.endDate, 'end');

  const toggleAction = (name: string) =>
    onChange({
      actions: filters.actions.includes(name)
        ? filters.actions.filter((a) => a !== name)
        : [...filters.actions, name],
    });
  const actionSummary =
    filters.actions.length === 0
      ? 'Any'
      : filters.actions.length === 1
        ? filters.actions[0]
        : `${filters.actions.length} selected`;
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Performed by */}
        <div className="space-y-1.5">
          <Label htmlFor="audit-performed-by" className="text-xs text-muted-foreground">
            Performed by
          </Label>
          <Select
            value={filters.performedBy ?? ANY_VALUE}
            onValueChange={(v) => onChange({ performedBy: v === ANY_VALUE ? null : v })}
          >
            <SelectTrigger id="audit-performed-by" className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any</SelectItem>
              {performedByOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action */}
        <div className="space-y-1.5">
          <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
            Action
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                id="audit-action"
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span
                  className={`line-clamp-1 text-left ${
                    filters.actions.length === 0 ? 'text-muted-foreground' : ''
                  }`}
                >
                  {actionSummary}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 w-(--radix-dropdown-menu-trigger-width) min-w-56"
            >
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onChange({ actions: [] });
                }}
              >
                <span className="flex-1">Any</span>
                {filters.actions.length === 0 && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {actionOptions.map((name) => (
                <DropdownMenuItem
                  key={name}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleAction(name);
                  }}
                >
                  <span className="flex-1 truncate">{name}</span>
                  {filters.actions.includes(name) && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Activation name */}
        <div className="space-y-1.5">
          <Label htmlFor="audit-activation-name" className="text-xs text-muted-foreground">
            Activation name
          </Label>
          <Select
            value={
              filters.onlyWithoutActivation
                ? NO_ACTIVATION_VALUE
                : (filters.activationName ?? ANY_VALUE)
            }
            onValueChange={(v) => {
              if (v === ANY_VALUE) {
                onChange({ activationName: null, onlyWithoutActivation: false });
              } else if (v === NO_ACTIVATION_VALUE) {
                onChange({ activationName: null, onlyWithoutActivation: true });
              } else {
                onChange({ activationName: v, onlyWithoutActivation: false });
              }
            }}
          >
            <SelectTrigger id="audit-activation-name" className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any</SelectItem>
              <SelectItem value={NO_ACTIVATION_VALUE}>{NO_ACTIVATION_LABEL}</SelectItem>
              {activationNameOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start date */}
        <div className="space-y-1.5">
          <Label htmlFor="audit-start-date" className="text-xs text-muted-foreground">
            From
          </Label>
          <DateTimeFilterInput
            id="audit-start-date"
            value={startValue}
            max={endValue ?? undefined}
            onCommit={(v) => onChange({ startDate: v })}
          />
        </div>

        {/* End date */}
        <div className="space-y-1.5">
          <Label htmlFor="audit-end-date" className="text-xs text-muted-foreground">
            To
          </Label>
          <DateTimeFilterInput
            id="audit-end-date"
            value={endValue}
            min={startValue ?? undefined}
            onCommit={(v) => onChange({ endDate: v })}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Active:</span>

          {filters.performedBy && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => onChange({ performedBy: null })}
            >
              {filters.performedBy}
              <X className="ml-1.5 h-3 w-3" />
            </Badge>
          )}

          {filters.actions.map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => toggleAction(name)}
            >
              {name}
              <X className="ml-1.5 h-3 w-3" />
            </Badge>
          ))}

          {filters.onlyWithoutActivation ? (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => onChange({ onlyWithoutActivation: false })}
            >
              {NO_ACTIVATION_LABEL}
              <X className="ml-1.5 h-3 w-3" />
            </Badge>
          ) : (
            filters.activationName && (
              <Badge
                variant="secondary"
                className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
                onClick={() => onChange({ activationName: null })}
              >
                {filters.activationName}
                <X className="ml-1.5 h-3 w-3" />
              </Badge>
            )
          )}

          {filters.startDate && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => onChange({ startDate: null })}
            >
              From: {formatFilterDateTime(filters.startDate, 'start')}
              <X className="ml-1.5 h-3 w-3" />
            </Badge>
          )}

          {filters.endDate && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-lg py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80"
              onClick={() => onChange({ endDate: null })}
            >
              To: {formatFilterDateTime(filters.endDate, 'end')}
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
