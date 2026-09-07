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
import type { AuditActivityFilters } from '../types';

const ANY_VALUE = 'all';
/** Sentinel for activities recorded above the activation level (no activationName set). */
const NO_ACTIVATION_VALUE = 'none';
const NO_ACTIVATION_LABEL = 'Tenant-Level (No Activation)';

interface AuditActivityFilterBarProps {
  filters: AuditActivityFilters;
  performedByOptions: string[];
  activationNameOptions: string[];
  onChange: (next: Partial<AuditActivityFilters>) => void;
  onClearAll: () => void;
}

export function AuditActivityFilterBar({
  filters,
  performedByOptions,
  activationNameOptions,
  onChange,
  onClearAll,
}: AuditActivityFilterBarProps) {
  const hasActiveFilters =
    filters.performedBy !== null ||
    filters.activationName !== null ||
    filters.onlyWithoutActivation ||
    filters.startDate !== null ||
    filters.endDate !== null;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <Input
            id="audit-start-date"
            type="date"
            value={filters.startDate ?? ''}
            max={filters.endDate ?? undefined}
            onChange={(e) => onChange({ startDate: e.target.value || null })}
          />
        </div>

        {/* End date */}
        <div className="space-y-1.5">
          <Label htmlFor="audit-end-date" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="audit-end-date"
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
