'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, Search, X } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@/components/ui/button';
import { useActivations } from '@/app/(dashboard)/conversations/hooks';
import { ActivationFilter, ActivationListItem } from '@/app/(dashboard)/conversations/_components';
import { cn } from '@/lib/utils';

interface AgentSelectionContentProps {
  onActivationSelect: (activationName: string, agentName: string) => void;
  /** Optional className for the outer wrapper (e.g. padding overrides). */
  className?: string;
}

/**
 * Reusable agent activation picker (search + grouped list).
 * Renders the body only — host components are responsible for layout chrome
 * (header, close/back button, container positioning).
 */
export function AgentSelectionContent({
  onActivationSelect,
  className,
}: AgentSelectionContentProps) {
  const router = useRouter();
  const { currentTenantId } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');

  const { activations, isLoading } = useActivations(currentTenantId);

  const activeActivations = activations.filter((a) => a.status === 'active');

  const filteredActivations = activeActivations.filter((activation) => {
    const query = searchQuery.toLowerCase();
    return (
      activation.name.toLowerCase().includes(query) ||
      activation.agentName.toLowerCase().includes(query)
    );
  });

  const groupedActivations = filteredActivations.reduce((acc, activation) => {
    if (!acc[activation.agentName]) {
      acc[activation.agentName] = [];
    }
    acc[activation.agentName].push(activation);
    return acc;
  }, {} as Record<string, typeof activations>);

  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-6', className)}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground text-sm">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (activeActivations.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="agent-icon-container h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bot className="h-8 w-8" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No Active Agents</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          You don&apos;t have any active agents yet. Activate one to start a conversation.
        </p>
        <Button
          onClick={() => router.push('/agents/running')}
          className="bg-primary hover:bg-primary/90 rounded-full"
        >
          Go to Agents
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <ActivationFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div>
        {searchQuery && filteredActivations.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No agents found matching &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivations).map(([agentName, agentActivations]) => (
              <div key={agentName} className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {agentName}
                  </h3>
                </div>
                <div className="space-y-1">
                  {agentActivations.map((activation) => (
                    <ActivationListItem
                      key={activation.id}
                      activation={activation}
                      isSelected={false}
                      onSelect={onActivationSelect}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentSelectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarCollapsed?: boolean;
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onActivationSelect?: (activationName: string, agentName: string) => void;
}

/**
 * Floating Agent Selection Panel
 * 
 * This panel appears when the user clicks on the Conversations menu item.
 * It allows users to select an agent activation to start chatting.
 */
export function AgentSelectionPanel({
  isOpen,
  onClose,
  sidebarCollapsed = false,
  title = 'Select an Agent',
  description = 'Choose an activation to start chatting',
  icon: Icon,
  onActivationSelect: externalOnActivationSelect,
}: AgentSelectionPanelProps) {
  const router = useRouter();

  const handleActivationSelect = (activationName: string, agentName: string) => {
    if (externalOnActivationSelect) {
      externalOnActivationSelect(activationName, agentName);
    } else {
      router.push(`/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?topic=general-discussions`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - Slides out from navigation sidebar, below header.
          On <md the navigation sidebar collapses into a drawer so the panel
          uses the full viewport width; on md+ it sits beside the sidebar. */}
      <div
        className={cn(
          "fixed top-14 bottom-0 z-40",
          "bg-background shadow-lg border-r border-border",
          "transition-all duration-300 ease-out animate-in slide-in-from-left",
          "left-0 right-0 max-w-full",
          "md:right-auto md:max-w-xl md:w-full",
          sidebarCollapsed ? "md:left-16" : "md:left-64"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              {title}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="p-6 overflow-y-auto h-[calc(100vh-56px-120px)]">
          <AgentSelectionContent onActivationSelect={handleActivationSelect} />
        </div>
      </div>
    </>
  );
}
