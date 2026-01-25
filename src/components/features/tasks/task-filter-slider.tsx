'use client';

import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TaskStatusFilter = 'all' | 'pending';

const STATUS_LABELS: Record<TaskStatusFilter, string> = {
  all: 'All',
  pending: 'Pending',
};

interface ActivationWithAgent {
  activationName: string;
  agentName: string;
  isActive?: boolean;
}

export interface SelectedActivation {
  activationName: string;
  agentName: string;
}

interface TaskFilterSliderProps {
  isOpen: boolean;
  onClose: () => void;
  activations: ActivationWithAgent[];
  statusFilter: TaskStatusFilter;
  selectedActivation: SelectedActivation | null;
  onFiltersChange: (statusFilter: TaskStatusFilter, activation: SelectedActivation | null) => void;
}

export function TaskFilterSlider({
  isOpen,
  onClose,
  activations,
  statusFilter,
  selectedActivation,
  onFiltersChange,
}: TaskFilterSliderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);
  const [localSelectedActivation, setLocalSelectedActivation] = useState<SelectedActivation | null>(selectedActivation);

  // Sync local state when props change
  useMemo(() => {
    setLocalStatusFilter(statusFilter);
    setLocalSelectedActivation(selectedActivation);
  }, [statusFilter, selectedActivation]);

  // Helper function to check if an activation is selected
  const isActivationSelected = (activationName: string, agentName: string): boolean => {
    return localSelectedActivation?.activationName === activationName && 
           localSelectedActivation?.agentName === agentName;
  };

  // Group activations by agent with their active status
  const groupedActivations = useMemo(() => {
    const groups = new Map<string, Array<{ name: string; isActive: boolean }>>();
    
    console.log('[TaskFilterSlider] Processing activations:', activations);
    
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

    console.log('[TaskFilterSlider] Grouped activations:', sortedGroups);
    
    return sortedGroups;
  }, [activations]);

  // Initialize all agents as expanded by default
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
    // Toggle: if already selected, deselect; otherwise select this one
    setLocalSelectedActivation(isSelected ? null : { activationName, agentName });
  };

  const toggleStatus = (status: TaskStatusFilter) => {
    setLocalStatusFilter(status);
  };

  const clearFilters = () => {
    setLocalStatusFilter('all');
    setLocalSelectedActivation(null);
    setSearchQuery('');
  };

  const applyFilters = () => {
    onFiltersChange(localStatusFilter, localSelectedActivation);
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
    localStatusFilter !== 'all' || 
    localSelectedActivation !== null;

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
          <SheetTitle className="text-lg font-semibold">Filter Tasks</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-7 flex-1 flex flex-col">
            {/* Status Filter */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground font-medium">Show me</p>
                <div className="inline-flex items-center gap-2">
                  {(Object.keys(STATUS_LABELS) as TaskStatusFilter[]).map((status, index) => (
                    <span key={status} className="inline-flex items-center gap-2">
                      <button
                        onClick={() => toggleStatus(status)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                          localStatusFilter === status
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/50 text-foreground hover:bg-muted hover:shadow-sm'
                        )}
                      >
                        {STATUS_LABELS[status].toLowerCase()}
                      </button>
                      {index < Object.keys(STATUS_LABELS).length - 1 && (
                        <span className="text-muted-foreground text-sm">or</span>
                      )}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground font-medium">tasks</p>
              </div>
            </div>

            {/* Activation Filter */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground font-medium">from</p>
                {!localSelectedActivation ? (
                  <span className="text-sm text-muted-foreground italic">any agent</span>
                ) : (
                  <button
                    onClick={() => toggleActivation(localSelectedActivation.activationName, localSelectedActivation.agentName)}
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
              <div className="space-y-3 flex-1 overflow-y-auto">
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
