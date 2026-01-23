'use client';

import { useMemo } from 'react';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@radix-ui/react-select';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface ActivationOption {
  id: string;
  name: string;
  agentName: string;
  isActive: boolean;
  description?: string;
}

interface AgentActivationSelectorProps {
  activations: ActivationOption[];
  selectedActivationName: string | null;
  onActivationChange: (activationName: string, agentName: string) => void;
  isLoading?: boolean;
  // Legacy props kept for API compatibility
  defaultExpanded?: boolean;
  selectedAgentName?: string | null;
  onAgentChange?: (agentName: string | null) => void;
}

export function AgentActivationSelector({
  activations,
  selectedActivationName,
  onActivationChange,
  isLoading = false,
}: AgentActivationSelectorProps) {
  // Group activations by agent name (deployment)
  const groupedActivations = useMemo(() => {
    const groups: Record<string, ActivationOption[]> = {};
    activations.forEach((activation) => {
      if (!groups[activation.agentName]) {
        groups[activation.agentName] = [];
      }
      groups[activation.agentName].push(activation);
    });
    return groups;
  }, [activations]);

  // Get unique agent names (deployments)
  const agentNames = useMemo(() => {
    return Object.keys(groupedActivations).sort();
  }, [groupedActivations]);

  // Find the currently selected activation
  const selectedActivation = useMemo(() => {
    return activations.find((a) => a.name === selectedActivationName);
  }, [activations, selectedActivationName]);

  const handleActivationChange = (activationName: string) => {
    // Find the activation to get its agent name
    const activation = activations.find((a) => a.name === activationName);
    if (activation) {
      onActivationChange(activation.name, activation.agentName);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="border-b border-border/60 bg-primary/5 border-l-2 border-l-primary px-6 py-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
          <span className="text-sm text-muted-foreground">Loading agents...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (activations.length === 0) {
    return (
      <div className="border-b border-border/60 bg-primary/5 border-l-2 border-l-primary px-6 py-4">
        <p className="text-sm text-muted-foreground">No active agents found</p>
      </div>
    );
  }

  return (
    <div className="border-b border-border/60">
      <Select
        value={selectedActivationName || ''}
        onValueChange={handleActivationChange}
      >
        <SelectPrimitive.Trigger
          className={cn(
            'w-full flex items-center justify-between px-6 py-4',
            'bg-primary/5 border-l-2 border-l-primary',
            'hover:bg-primary/10 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            'data-[state=open]:bg-primary/10'
          )}
        >
          <div className="min-w-0 flex-1 text-left">
            {selectedActivation ? (
              <>
                <h2 className="text-sm font-semibold text-foreground leading-snug mb-1">
                  {selectedActivation.name}
                </h2>
                <Badge variant="outline" className="text-xs font-medium bg-primary/5 border-primary/20 text-primary">
                  {selectedActivation.agentName}
                </Badge>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-foreground">
                  Select an Agent
                </h2>
                <p className="text-xs text-muted-foreground">
                  Choose an activation to chat
                </p>
              </>
            )}
          </div>
          
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2 transition-transform data-[state=open]:rotate-180" />
        </SelectPrimitive.Trigger>

        <SelectContent className="max-h-[300px]" align="start" sideOffset={0}>
          {/* Group activations by agent deployment */}
          {agentNames.map((agentName, index) => (
            <SelectGroup key={agentName}>
              {index > 0 && <div className="my-1 h-px bg-border/50" />}
              <SelectLabel className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary/70 bg-muted/30">
                {agentName}
              </SelectLabel>
              {groupedActivations[agentName].map((activation) => (
                <SelectPrimitive.Item
                  key={activation.id}
                  value={activation.name}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center justify-between",
                    "rounded-sm py-2.5 pl-4 pr-8 text-sm outline-none",
                    "focus:bg-accent focus:text-accent-foreground",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                >
                  <SelectPrimitive.ItemText>
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full flex-shrink-0",
                        activation.isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
                      )} />
                      <span>{activation.name}</span>
                    </span>
                  </SelectPrimitive.ItemText>
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4 text-primary" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
