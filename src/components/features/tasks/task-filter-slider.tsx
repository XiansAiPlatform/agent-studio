'use client';

import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

type TaskStatusFilter = 'all' | 'pending';

const STATUS_LABELS: Record<TaskStatusFilter, string> = {
  all: 'All',
  pending: 'Pending',
};

interface ActivationWithAgent {
  activationName: string;
  agentName: string;
}

interface TaskFilterSliderProps {
  isOpen: boolean;
  onClose: () => void;
  activations: ActivationWithAgent[];
  statusFilter: TaskStatusFilter;
  selectedActivations: string[];
  onFiltersChange: (statusFilter: TaskStatusFilter, activations: string[]) => void;
}

export function TaskFilterSlider({
  isOpen,
  onClose,
  activations,
  statusFilter,
  selectedActivations,
  onFiltersChange,
}: TaskFilterSliderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);
  const [localSelectedActivations, setLocalSelectedActivations] = useState(selectedActivations);

  // Sync local state when props change
  useMemo(() => {
    setLocalStatusFilter(statusFilter);
    setLocalSelectedActivations(selectedActivations);
  }, [statusFilter, selectedActivations]);

  // Group activations by agent
  const groupedActivations = useMemo(() => {
    const groups = new Map<string, string[]>();
    
    activations.forEach(({ activationName, agentName }) => {
      if (!groups.has(agentName)) {
        groups.set(agentName, []);
      }
      const activationList = groups.get(agentName)!;
      if (!activationList.includes(activationName)) {
        activationList.push(activationName);
      }
    });

    // Sort agents and activations
    const sortedGroups = new Map(
      Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([agent, acts]) => [agent, acts.sort()])
    );

    return sortedGroups;
  }, [activations]);

  // Filter activations based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedActivations;
    }

    const query = searchQuery.toLowerCase();
    const filtered = new Map<string, string[]>();

    groupedActivations.forEach((activationList, agentName) => {
      const matchingActivations = activationList.filter(act =>
        act.toLowerCase().includes(query) || 
        agentName.toLowerCase().includes(query)
      );

      if (matchingActivations.length > 0) {
        filtered.set(agentName, matchingActivations);
      }
    });

    return filtered;
  }, [groupedActivations, searchQuery]);

  const toggleAgent = (agentName: string) => {
    const activationList = groupedActivations.get(agentName) || [];
    const allSelected = activationList.every(act => localSelectedActivations.includes(act));
    
    let newAgents: string[];
    if (allSelected) {
      // Deselect all activations from this agent
      newAgents = localSelectedActivations.filter(act => !activationList.includes(act));
    } else {
      // Select all activations from this agent
      const toAdd = activationList.filter(act => !localSelectedActivations.includes(act));
      newAgents = [...localSelectedActivations, ...toAdd];
    }
    
    setLocalSelectedActivations(newAgents);
  };

  const toggleActivation = (activationName: string) => {
    const newAgents = localSelectedActivations.includes(activationName)
      ? localSelectedActivations.filter((a) => a !== activationName)
      : [...localSelectedActivations, activationName];
    setLocalSelectedActivations(newAgents);
  };

  const toggleStatus = (status: TaskStatusFilter) => {
    setLocalStatusFilter(status);
  };

  const clearFilters = () => {
    setLocalStatusFilter('all');
    setLocalSelectedActivations([]);
    setSearchQuery('');
  };

  const applyFilters = () => {
    onFiltersChange(localStatusFilter, localSelectedActivations);
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
    localSelectedActivations.length > 0;

  const getAgentSelectionCount = (agentName: string) => {
    const activationList = groupedActivations.get(agentName) || [];
    return activationList.filter(act => localSelectedActivations.includes(act)).length;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Filter Tasks</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Status Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Status</h3>
              <div className="flex gap-2">
                {(Object.keys(STATUS_LABELS) as TaskStatusFilter[]).map((status) => (
                  <Button
                    key={status}
                    variant={localStatusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStatus(status)}
                    className="flex-1"
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Activation Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Activations
                {localSelectedActivations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {localSelectedActivations.length}
                  </Badge>
                )}
              </h3>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activations or agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Grouped Activations List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Array.from(filteredGroups.entries()).map(([agentName, activationList]) => {
                  const isExpanded = expandedAgents.has(agentName) || !!searchQuery;
                  const selectionCount = getAgentSelectionCount(agentName);
                  const allSelected = selectionCount === activationList.length;

                  return (
                    <div key={agentName} className="border rounded-lg">
                      {/* Agent Header */}
                      <button
                        onClick={() => toggleAgentExpanded(agentName)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{agentName}</span>
                          {selectionCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectionCount}/{activationList.length}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant={allSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAgent(agentName);
                          }}
                          className="h-7 px-3 text-xs"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      </button>

                      {/* Activation List */}
                      {isExpanded && (
                        <div className="border-t bg-muted/20">
                          {activationList.map((activationName) => {
                            const isSelected = localSelectedActivations.includes(activationName);
                            return (
                              <button
                                key={activationName}
                                onClick={() => toggleActivation(activationName)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                                  isSelected ? 'bg-primary/5' : ''
                                }`}
                              >
                                <span className={isSelected ? 'font-medium text-primary' : ''}>
                                  {activationName}
                                </span>
                                {isSelected && (
                                  <Badge variant="default" className="text-xs h-5">
                                    Selected
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredGroups.size === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No activations found matching "{searchQuery}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-muted/20 space-y-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Clear All Filters
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={applyFilters}
            className="w-full"
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
