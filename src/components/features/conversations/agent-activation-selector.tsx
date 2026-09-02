'use client';

import { useMemo } from 'react';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Select, SelectContent } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBuiltInWorkflows } from '@/app/(dashboard)/conversations/hooks/use-built-in-workflows';

export interface ActivationOption {
  id: string;
  name: string;
  agentName: string;
  status: 'active' | 'inactive';
  description?: string;
}

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
  selectedAgentName: selectedAgentNameProp,
}: AgentActivationSelectorProps) {
  const selectedActivation = useMemo(() => {
    return activations.find((a) => a.name === selectedActivationName);
  }, [activations, selectedActivationName]);

  const currentAgentName =
    selectedActivation?.agentName ?? selectedAgentNameProp ?? null;

  const agentNames = useMemo(
    () => (currentAgentName ? [currentAgentName] : []),
    [currentAgentName]
  );

  const { workflowsByAgent, isLoading: isLoadingWorkflows } =
    useBuiltInWorkflows(agentNames);

  const workflows = currentAgentName
    ? (workflowsByAgent[currentAgentName] ?? [])
    : [];
  const workflowsReady = Boolean(
    currentAgentName && currentAgentName in workflowsByAgent
  );

  const handleValueChange = (workflowName: string) => {
    if (!currentAgentName || !selectedActivationName) return;
    onActivationChange(selectedActivationName, currentAgentName, workflowName);
  };

  if (isLoading || isLoadingWorkflows || !workflowsReady) {
    return (
      <div className="border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
          <span className="text-sm text-muted-foreground">Loading workflows...</span>
        </div>
      </div>
    );
  }

  if (!currentAgentName) {
    return (
      <div className="border-b border-border/60 px-6 py-4">
        <p className="text-sm text-muted-foreground">No agent selected</p>
      </div>
    );
  }

  return (
    <div className="border-b border-border/60">
      <Select value={selectedWorkflow || ''} onValueChange={handleValueChange}>
        <SelectPrimitive.Trigger
          className={cn(
            'w-full flex items-center justify-between px-6 py-4',
            'hover:bg-muted/50 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            'data-[state=open]:bg-muted/50'
          )}
        >
          <div className="min-w-0 flex-1 text-left">
            <h2 className="text-sm font-semibold text-foreground leading-snug mb-1">
              {currentAgentName}
            </h2>
            {selectedWorkflow && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium bg-primary/5 border-primary/20 text-primary">
                  {selectedWorkflow}
                </Badge>
                {workflows.length > 1 && (
                  <span className="text-[11px] text-muted-foreground">
                    {workflows.length} workflows — click to switch
                  </span>
                )}
              </div>
            )}
          </div>

          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2 transition-transform data-[state=open]:rotate-180" />
        </SelectPrimitive.Trigger>

        <SelectContent className="max-h-[300px]" align="start" sideOffset={0}>
          {workflows.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No chat workflows for this agent
            </div>
          ) : (
            workflows.map((workflowName) => (
              <SelectPrimitive.Item
                key={workflowName}
                value={workflowName}
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
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
