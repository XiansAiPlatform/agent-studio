'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, Search } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@/components/ui/button';
import { useActivations } from './hooks';
import { ActivationFilter, ActivationListItem } from './_components';

/**
 * Agent Selection Page
 * 
 * This is the main landing page for conversations. Users select an agent activation
 * to start chatting. Once selected, they are redirected to the conversation page.
 */
function AgentSelectionContent() {
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

  // Handle activation selection - navigate to conversation page
  const handleActivationSelect = (activationName: string, agentName: string) => {
    router.push(`/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?topic=general-discussions`);
  };

  return (
    <div className="flex h-full bg-card">
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="w-full max-w-3xl">
          {/* Header Section */}
          <div className="mb-6">
            <h2 className="text-base font-medium text-foreground mb-1">
              Select an Agent
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Choose an activation to start chatting
            </p>
            
            {/* Search and Filter */}
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
                  onClick={() => router.push('/agents/running')}
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
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <AgentSelectionContent />
      </Suspense>
    </div>
  );
}
