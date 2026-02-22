'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  X,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogLevel, ActivationWithAgent, SelectedActivation } from '../types';

const LOG_LEVEL_OPTIONS: { value: LogLevel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'Error', label: 'Error', icon: AlertCircle },
  { value: 'Warning', label: 'Warning', icon: AlertTriangle },
  { value: 'Information', label: 'Information', icon: Info },
  { value: 'Debug', label: 'Debug', icon: Bug },
  { value: 'Trace', label: 'Trace', icon: FileText },
];

const DATE_PRESETS = [
  { label: 'Last hour', hours: 1 },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
  { label: 'Last 30 days', hours: 24 * 30 },
] as const;

interface LogFilterSliderProps {
  isOpen: boolean;
  onClose: () => void;
  activations: ActivationWithAgent[];
  selectedActivation: SelectedActivation | null;
  selectedLogLevels: LogLevel[];
  startDate: string | null;
  endDate: string | null;
  onFiltersChange: (
    activation: SelectedActivation | null,
    logLevels: LogLevel[],
    startDate: string | null,
    endDate: string | null
  ) => void;
}

export function LogFilterSlider({
  isOpen,
  onClose,
  activations,
  selectedActivation,
  selectedLogLevels,
  startDate,
  endDate,
  onFiltersChange,
}: LogFilterSliderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedActivation, setLocalSelectedActivation] = useState<SelectedActivation | null>(selectedActivation);
  const [localLogLevels, setLocalLogLevels] = useState<LogLevel[]>(selectedLogLevels);
  const [localStartDate, setLocalStartDate] = useState<string>(startDate || '');
  const [localEndDate, setLocalEndDate] = useState<string>(endDate || '');

  // Sync local state when props change
  useEffect(() => {
    setLocalSelectedActivation(selectedActivation);
    setLocalLogLevels(selectedLogLevels);
    setLocalStartDate(startDate || '');
    setLocalEndDate(endDate || '');
  }, [selectedActivation, selectedLogLevels, startDate, endDate]);

  // Helper function to check if an activation is selected
  const isActivationSelected = (activationName: string, agentName: string): boolean => {
    return localSelectedActivation?.activationName === activationName && 
           localSelectedActivation?.agentName === agentName;
  };

  // Group activations by agent
  const groupedActivations = useMemo(() => {
    const groups = new Map<string, Array<{ name: string; isActive: boolean }>>();
    
    activations.forEach(({ activationName, agentName, isActive }) => {
      if (!groups.has(agentName)) {
        groups.set(agentName, []);
      }
      const activationList = groups.get(agentName)!;
      if (!activationList.find(a => a.name === activationName)) {
        activationList.push({ name: activationName, isActive: isActive || false });
      }
    });

    // Sort agents and activations
    const sortedGroups = new Map(
      Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([agent, acts]) => [agent, acts.sort((a, b) => a.name.localeCompare(b.name))])
    );
    
    return sortedGroups;
  }, [activations]);

  // Initialize all agents as expanded
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(() => {
    return new Set(Array.from(groupedActivations.keys()));
  });

  // Update expanded agents when groupedActivations changes
  useMemo(() => {
    setExpandedAgents(new Set(Array.from(groupedActivations.keys())));
  }, [groupedActivations]);

  // Filter activations based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedActivations;
    }

    const query = searchQuery.toLowerCase();
    const filtered = new Map<string, Array<{ name: string; isActive: boolean }>>();

    groupedActivations.forEach((activationList, agentName) => {
      const matchingActivations = activationList.filter(act =>
        act.name.toLowerCase().includes(query) || 
        agentName.toLowerCase().includes(query)
      );

      if (matchingActivations.length > 0) {
        filtered.set(agentName, matchingActivations);
      }
    });

    return filtered;
  }, [groupedActivations, searchQuery]);

  const toggleActivation = (activationName: string, agentName: string) => {
    const isSelected = isActivationSelected(activationName, agentName);
    setLocalSelectedActivation(isSelected ? null : { activationName, agentName });
  };

  const toggleLogLevel = (level: LogLevel) => {
    setLocalLogLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleAllLogLevels = () => {
    if (localLogLevels.length === LOG_LEVEL_OPTIONS.length) {
      setLocalLogLevels([]);
    } else {
      setLocalLogLevels(LOG_LEVEL_OPTIONS.map(opt => opt.value));
    }
  };

  const applyDatePreset = (hours: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    setLocalStartDate(start.toISOString());
    setLocalEndDate(end.toISOString());
  };

  const clearDateRange = () => {
    setLocalStartDate('');
    setLocalEndDate('');
  };

  const clearFilters = () => {
    setLocalSelectedActivation(null);
    setLocalLogLevels([]);
    setLocalStartDate('');
    setLocalEndDate('');
    setSearchQuery('');
  };

  const applyFilters = () => {
    onFiltersChange(
      localSelectedActivation,
      localLogLevels,
      localStartDate || null,
      localEndDate || null
    );
    onClose();
  };

  const toggleAgentExpanded = (agentName: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentName)) {
      newExpanded.delete(agentName);
    } else {
      newExpanded.add(agentName);
    }
    setExpandedAgents(newExpanded);
  };

  const hasActiveFilters = 
    localSelectedActivation !== null ||
    localLogLevels.length > 0 ||
    localStartDate !== '' ||
    localEndDate !== '';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className="w-full sm:max-w-md flex flex-col p-0"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyFilters();
          }
        }}
      >
        <SheetHeader className="px-6 pt-6 pb-5 border-b border-border/50">
          <SheetTitle className="text-lg font-semibold">Filter Logs</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Log Level Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Log Level</Label>
                <button
                  onClick={toggleAllLogLevels}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {localLogLevels.length === LOG_LEVEL_OPTIONS.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {LOG_LEVEL_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`level-${option.value}`}
                        checked={localLogLevels.includes(option.value)}
                        onCheckedChange={() => toggleLogLevel(option.value)}
                      />
                      <label
                        htmlFor={`level-${option.value}`}
                        className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {option.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              
              {/* Date Presets */}
              <div className="grid grid-cols-2 gap-2">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => applyDatePreset(preset.hours)}
                    className="text-xs h-8"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={localStartDate ? new Date(localStartDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setLocalStartDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={localEndDate ? new Date(localEndDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setLocalEndDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {(localStartDate || localEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateRange}
                  className="text-xs h-7 w-full"
                >
                  Clear date range
                </Button>
              )}
            </div>

            {/* Activation Filter */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Agent Activation</Label>
                {localSelectedActivation && (
                  <button
                    onClick={() => setLocalSelectedActivation(null)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {localSelectedActivation.activationName}
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 border-dashed rounded-lg h-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Grouped Activations List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredGroups.size > 0 ? (
                  Array.from(filteredGroups.entries()).map(([agentName, activationList]) => {
                    const isExpanded = expandedAgents.has(agentName) || !!searchQuery;

                    return (
                      <div key={agentName} className="space-y-2">
                        {/* Agent Header */}
                        <button
                          onClick={() => toggleAgentExpanded(agentName)}
                          className="w-full flex items-center gap-2 group py-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                          )}
                          <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                            {agentName}
                          </span>
                        </button>

                        {/* Activation List */}
                        {isExpanded && (
                          <div className="ml-6 pl-3 border-l border-dashed border-border/60 space-y-1">
                            {activationList.map((activation) => {
                              const isSelected = isActivationSelected(activation.name, agentName);
                              return (
                                <button
                                  key={activation.name}
                                  onClick={() => toggleActivation(activation.name, agentName)}
                                  className={cn(
                                    'w-full text-left px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center justify-between gap-2',
                                    isSelected
                                      ? 'text-primary font-semibold bg-primary/10 shadow-sm'
                                      : 'text-foreground/70 hover:text-foreground hover:bg-muted/50 font-medium'
                                  )}
                                >
                                  <span className="flex-1 truncate">{activation.name}</span>
                                  {activation.isActive && (
                                    <Badge 
                                      variant="default" 
                                      className="text-[9px] h-4 px-1.5 bg-green-500 hover:bg-green-500 shrink-0 rounded-md"
                                    >
                                      Active
                                    </Badge>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : searchQuery ? (
                  <p className="text-xs text-muted-foreground/70 text-center py-10 italic">
                    No agents found matching "{searchQuery}"
                  </p>
                ) : groupedActivations.size === 0 ? (
                  <p className="text-xs text-muted-foreground/70 text-center py-10 italic">
                    No agents available
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 p-6 space-y-3">
          <div className="flex items-center justify-between">
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Clear filters
              </button>
            ) : (
              <span className="text-xs text-muted-foreground/50 italic">No filters applied</span>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={applyFilters}
              className="rounded-lg h-9 px-6"
            >
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
