'use client';

import { useMemo } from 'react';
import { Bot, Circle, ChevronDown, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@radix-ui/react-select';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { AGENT_STATUS_CONFIG } from '@/lib/conversation-status-config';

export interface ActivationOption {
  id: string;
  name: string;
  agentName: string;
  isActive: boolean;
  description?: string;
}

interface ConversationHeaderProps {
  // Agent activation selector
  activations: ActivationOption[];
  selectedActivationName: string | null;
  onActivationChange: (activationName: string, agentName: string) => void;
  isLoadingActivations?: boolean;
  // Current conversation info
  agentName?: string;
  agentStatus?: 'online' | 'offline' | 'busy';
  // Topic info
  selectedTopicName?: string;
  selectedTopicCreatedAt?: string;
  selectedTopicMessageCount?: number;
}

export function ConversationHeader({
  activations,
  selectedActivationName,
  onActivationChange,
  isLoadingActivations = false,
  agentName,
  agentStatus = 'online',
  selectedTopicName,
  selectedTopicCreatedAt,
  selectedTopicMessageCount,
}: ConversationHeaderProps) {
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
    const activation = activations.find((a) => a.name === activationName);
    if (activation) {
      onActivationChange(activation.name, activation.agentName);
    }
  };

  // Loading state
  if (isLoadingActivations) {
    return (
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
            <span className="text-sm text-muted-foreground">Loading agents...</span>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (activations.length === 0) {
    return (
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">No Agents Available</h2>
            <p className="text-xs text-muted-foreground">Activate an agent to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-primary/20 bg-primary/[0.04] shadow-lg">
      <div className="flex items-center px-6 py-4">
        {/* Agent Selector - single unified component */}
        <div className="flex items-center">
          <Select
            value={selectedActivationName || ''}
            onValueChange={handleActivationChange}
          >
            <SelectPrimitive.Trigger
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'bg-primary/[0.08] border border-primary/20',
                'hover:bg-primary/[0.12]',
                'hover:border-primary/40 hover:shadow-lg transition-all duration-300',
                'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                'group'
              )}
            >
              {/* Agent Avatar - inside the dropdown */}
              <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-md border border-primary/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                {selectedActivation ? (
                  <>
                    <h2 className="text-base font-semibold text-foreground tracking-tight text-left">
                      {selectedActivation.name}
                    </h2>
                    <div className="flex items-center gap-1.5 text-sm mt-0.5">
                      <span className="text-xs text-muted-foreground font-medium">
                        {selectedActivation.agentName}
                      </span>
                      {agentName && (
                        <>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <Circle
                            className={cn(
                              'h-2 w-2 fill-current animate-pulse',
                              AGENT_STATUS_CONFIG[agentStatus].colors.dot
                            )}
                          />
                          <span className={cn('text-xs font-medium', AGENT_STATUS_CONFIG[agentStatus].colors.text)}>
                            {AGENT_STATUS_CONFIG[agentStatus].label}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-foreground text-left">Select an Agent</h2>
                    <p className="text-xs text-muted-foreground text-left mt-0.5">Choose an activation to chat</p>
                  </>
                )}
              </div>
              
              <ChevronDown className="h-5 w-5 text-primary flex-shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </SelectPrimitive.Trigger>

            <SelectContent className="max-h-[400px]" align="start" sideOffset={8}>
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

        {/* Topic Info */}
        {selectedTopicName && (
          <>
            {/* Divider */}
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent mx-5" />

            {/* Topic Info */}
            <div className="text-left px-4 py-2 rounded-lg bg-primary/[0.08] border border-primary/20 shadow-md">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
                {selectedTopicName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {selectedTopicCreatedAt && (
                  <span className="text-xs text-primary/70 font-medium">
                    Created {new Date(selectedTopicCreatedAt).toLocaleDateString()}
                  </span>
                )}
                {selectedTopicMessageCount !== undefined && (
                  <>
                    <span className="text-xs text-primary/30">•</span>
                    <span className="text-xs font-semibold text-primary/80">
                      {selectedTopicMessageCount} message{selectedTopicMessageCount !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
