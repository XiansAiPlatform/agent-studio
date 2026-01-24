import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivationOption } from '../hooks';
import { ActivationFilter } from './activation-filter';
import { ActivationListItem } from './activation-list-item';

interface AgentSelectionViewProps {
  activations: ActivationOption[];
  isLoading: boolean;
  selectedActivationName: string | null;
  selectedAgentName: string | null;
  onActivationChange: (activationName: string, agentName: string) => void;
}

export function AgentSelectionView({
  activations,
  isLoading,
  selectedActivationName,
  selectedAgentName,
  onActivationChange,
}: AgentSelectionViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Filter activations
  const filteredActivations = activations.filter((a) => {
    if (showActiveOnly && a.status !== 'active') {
      return false;
    }
    
    const query = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.agentName.toLowerCase().includes(query) ||
      (a.description && a.description.toLowerCase().includes(query))
    );
  });

  // Group by agent name
  const groupedActivations = filteredActivations.reduce((acc, a) => {
    if (!acc[a.agentName]) acc[a.agentName] = [];
    acc[a.agentName].push(a);
    return acc;
  }, {} as Record<string, ActivationOption[]>);

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
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{agentName}</h3>
                    </div>

                    {/* Activation List Items */}
                    <div className="space-y-1">
                      {agentActivations.map((activation) => {
                        const isSelected = 
                          activation.name === selectedActivationName && 
                          activation.agentName === selectedAgentName;
                        
                        return (
                          <ActivationListItem
                            key={activation.id}
                            activation={activation}
                            isSelected={isSelected}
                            onSelect={onActivationChange}
                          />
                        );
                      })}
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
