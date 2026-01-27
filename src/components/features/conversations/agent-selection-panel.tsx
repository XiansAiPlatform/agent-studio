'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, Search, X } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@/components/ui/button';
import { useActivations } from '@/app/(dashboard)/conversations/hooks';
import { ActivationFilter, ActivationListItem } from '@/app/(dashboard)/conversations/_components';
import { cn } from '@/lib/utils';

interface AgentSelectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarCollapsed?: boolean;
  title?: string;
  description?: string;
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
  onActivationSelect: externalOnActivationSelect,
}: AgentSelectionPanelProps) {
  const router = useRouter();
  const { currentTenantId } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Fetch activations
  const { activations, isLoading } = useActivations(currentTenantId);

  // Filter activations based on search and status
  const filteredActivations = activations.filter((activation) => {
    if (showActiveOnly && activation.status !== 'active') {
      return false;
    }
    
    const query = searchQuery.toLowerCase();
    return (
      activation.name.toLowerCase().includes(query) ||
      activation.agentName.toLowerCase().includes(query) ||
      (activation.description && activation.description.toLowerCase().includes(query))
    );
  });

  // Group activations by agent name for better organization
  const groupedActivations = filteredActivations.reduce((acc, activation) => {
    if (!acc[activation.agentName]) {
      acc[activation.agentName] = [];
    }
    acc[activation.agentName].push(activation);
    return acc;
  }, {} as Record<string, typeof activations>);

  // Handle activation selection - use external handler if provided, otherwise default behavior
  const handleActivationSelect = (activationName: string, agentName: string) => {
    if (externalOnActivationSelect) {
      externalOnActivationSelect(activationName, agentName);
    } else {
      // Default behavior for backward compatibility
      router.push(`/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?topic=general-discussions`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop for click-outside */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - Slides out from navigation sidebar, below header */}
      <div
        className={cn(
          "fixed top-14 bottom-0 z-40",
          "w-full max-w-xl bg-background shadow-lg border-r border-border",
          "transition-all duration-300 ease-out animate-in slide-in-from-left",
          sidebarCollapsed ? "left-16" : "left-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
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

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-56px-120px)]">
          {/* Search and Filter */}
          <div className="mb-6">
            <ActivationFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              showActiveOnly={showActiveOnly}
              onShowActiveOnlyChange={setShowActiveOnly}
              totalCount={activations.length}
              activeCount={activations.filter(a => a.status === 'active').length}
            />
          </div>

          {/* Agent Activation List */}
          <div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground text-sm">Loading agents...</p>
              </div>
            ) : activations.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-base font-medium text-foreground mb-2">No Active Agents</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Activate an agent to start chatting
                </p>
                <Button
                  onClick={() => {
                    router.push('/agents/running');
                    onClose();
                  }}
                  className="bg-primary hover:bg-primary/90 rounded-full"
                >
                  Go to Agents
                </Button>
              </div>
            ) : searchQuery && filteredActivations.length === 0 ? (
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
                    {/* Agent Name Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {agentName}
                      </h3>
                    </div>

                    {/* Activation List Items */}
                    <div className="space-y-1">
                      {agentActivations.map((activation) => (
                        <ActivationListItem
                          key={activation.id}
                          activation={activation}
                          isSelected={false}
                          onSelect={handleActivationSelect}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
