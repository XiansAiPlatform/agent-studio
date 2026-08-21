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
import { useBuiltInWorkflows } from '@/app/(dashboard)/conversations/hooks/use-built-in-workflows';

export interface ActivationOption {
  id: string;
  name: string;
  agentName: string;
  status: 'active' | 'inactive';
  description?: string;
}

type WorkflowSelectOption = {
  id: string;
  agentName: string;
  workflowName: string;
};

interface AgentActivationSelectorProps {
  activations: ActivationOption[];
  selectedActivationName: string | null;
  selectedWorkflow?: string;
  onActivationChange: (
    activationName: string,
    agentName: string,
    workflowName: string
  ) => void;
  isLoading?: boolean;
  // Legacy props kept for API compatibility
  defaultExpanded?: boolean;
  selectedAgentName?: string | null;
  onAgentChange?: (agentName: string | null) => void;
}

export function AgentActivationSelector({
  activations,
  selectedActivationName,
  selectedWorkflow,
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

  const selectedAgentName = selectedActivation?.agentName ?? null;

  const { workflowsByAgent, isLoading: isLoadingWorkflows } = useBuiltInWorkflows(agentNames);

  const { optionGroups, optionById } = useMemo(() => {
    const optionById = new Map<string, WorkflowSelectOption>();
    const optionGroups: {
      agentName: string;
      items: { id: string; workflowName: string }[];
    }[] = [];
    let nextId = 0;

    for (const agentName of agentNames) {
      // Only list workflows after definitions have been typed as built-in.
      if (!(agentName in workflowsByAgent)) continue;
      const workflows = workflowsByAgent[agentName] ?? [];
      if (workflows.length === 0) continue;

      const items = workflows.map((workflowName) => {
        const id = String(nextId++);
        const option: WorkflowSelectOption = { id, agentName, workflowName };
        optionById.set(id, option);
        return { id, workflowName };
      });

      optionGroups.push({ agentName, items });
    }

    return { optionGroups, optionById };
  }, [agentNames, workflowsByAgent]);

  const selectedValue = useMemo(() => {
    if (!selectedAgentName) return '';
    if (!selectedWorkflow) return '';
    for (const option of optionById.values()) {
      if (
        option.agentName === selectedAgentName &&
        option.workflowName === selectedWorkflow
      ) {
        return option.id;
      }
    }
    return '';
  }, [optionById, selectedAgentName, selectedWorkflow]);

  const resolveActivation = (agentName: string): ActivationOption | undefined => {
    const agentActivations = groupedActivations[agentName] ?? [];
    if (selectedActivation?.agentName === agentName) {
      return selectedActivation;
    }
    return (
      agentActivations.find((a) => a.status === 'active') ?? agentActivations[0]
    );
  };

  const handleValueChange = (value: string) => {
    const option = optionById.get(value);
    if (!option) return;
    const activation = resolveActivation(option.agentName);
    if (!activation) return;
    onActivationChange(activation.name, option.agentName, option.workflowName);
  };

  // Wait for activations and built-in workflow types before listing options.
  if (isLoading || isLoadingWorkflows) {
    return (
      <div className="border-b border-border/60 px-6 py-4">
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
      <div className="border-b border-border/60 px-6 py-4">
        <p className="text-sm text-muted-foreground">No active agents found</p>
      </div>
    );
  }

  return (
    <div className="border-b border-border/60">
      <Select value={selectedValue} onValueChange={handleValueChange}>
        <SelectPrimitive.Trigger
          className={cn(
            'w-full flex items-center justify-between px-6 py-4',
            'hover:bg-muted/50 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            'data-[state=open]:bg-muted/50'
          )}
        >
          <div className="min-w-0 flex-1 text-left">
            {selectedActivation ? (
              <>
                <h2 className="text-sm font-semibold text-foreground leading-snug mb-1">
                  {selectedActivation.agentName}
                </h2>
                {selectedWorkflow && (
                  <Badge variant="outline" className="text-xs font-medium bg-primary/5 border-primary/20 text-primary">
                    {selectedWorkflow}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-foreground">
                  Select an Agent
                </h2>
                <p className="text-xs text-muted-foreground">
                  Choose a workflow to chat
                </p>
              </>
            )}
          </div>

          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2 transition-transform data-[state=open]:rotate-180" />
        </SelectPrimitive.Trigger>

        <SelectContent className="max-h-[300px]" align="start" sideOffset={0}>
          {optionGroups.map(({ agentName, items }, index) => (
            <SelectGroup key={agentName}>
              {index > 0 && <div className="my-1 h-px bg-border/50" />}
              <SelectLabel className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary/70 bg-muted/30">
                {agentName}
              </SelectLabel>
              {items.map(({ id, workflowName }) => (
                <SelectPrimitive.Item
                  key={id}
                  value={id}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center justify-between',
                    'rounded-sm py-2.5 pl-8 pr-8 text-sm outline-none',
                    'focus:bg-accent focus:text-accent-foreground',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                  )}
                >
                  <SelectPrimitive.ItemText>
                    <span>{workflowName}</span>
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
