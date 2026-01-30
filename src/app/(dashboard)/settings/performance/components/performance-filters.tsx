'use client';

import { X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activation } from '../hooks/use-activations';

interface PerformanceFiltersProps {
  availableAgents: string[];
  selectedAgent: string | null;
  selectedActivation: string | null;
  availableActivations: Activation[];
  isLoadingActivations: boolean;
  onAgentChange: (agent: string | null) => void;
  onActivationChange: (activation: string | null) => void;
  onClearFilters: () => void;
}

export function PerformanceFilters({
  availableAgents,
  selectedAgent,
  selectedActivation,
  availableActivations,
  isLoadingActivations,
  onAgentChange,
  onActivationChange,
  onClearFilters,
}: PerformanceFiltersProps) {
  const hasActiveFilters = selectedAgent !== null || selectedActivation !== null;

  // Filter activations by selected agent
  const filteredActivations = selectedAgent
    ? availableActivations.filter((activation) => activation.agentName === selectedAgent)
    : [];

  const isActivationSelectDisabled = !selectedAgent || isLoadingActivations || filteredActivations.length === 0;

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Agent Template Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Agent Template
          </label>
          <Select
            value={selectedAgent || 'all'}
            onValueChange={(value) => {
              onAgentChange(value === 'all' ? null : value);
              onActivationChange(null); // Reset activation when agent changes
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {availableAgents.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Agent Instance Filter */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${isActivationSelectDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
            Agent
          </label>
          <Select
            disabled={isActivationSelectDisabled}
            value={selectedActivation || 'all'}
            onValueChange={(value) => {
              onActivationChange(value === 'all' ? null : value);
            }}
          >
            <SelectTrigger className={isActivationSelectDisabled ? 'opacity-50' : ''}>
              {isLoadingActivations ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue 
                  placeholder={
                    !selectedAgent 
                      ? "Select agent template first" 
                      : filteredActivations.length === 0
                      ? "No instances available"
                      : "All instances"
                  } 
                />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All instances</SelectItem>
              {filteredActivations.map((activation) => (
                <SelectItem key={activation.id} value={activation.name}>
                  <div className="flex items-center gap-2">
                    <span>{activation.name}</span>
                    {activation.isActive && (
                      <span className="text-xs text-green-600 dark:text-green-400">●</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Active:</span>

            {selectedAgent && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-all rounded-lg pl-3 pr-2 py-1.5 group"
                onClick={() => onAgentChange(null)}
              >
                <span className="text-xs">{selectedAgent}</span>
                <X className="ml-2 h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Badge>
            )}

            {selectedActivation && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-all rounded-lg pl-3 pr-2 py-1.5 group"
                onClick={() => onActivationChange(null)}
              >
                <span className="text-xs">{selectedActivation}</span>
                <X className="ml-2 h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 px-3 text-xs hover:bg-muted/60 rounded-lg"
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
