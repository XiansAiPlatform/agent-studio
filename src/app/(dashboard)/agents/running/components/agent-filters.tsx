import { Bot } from 'lucide-react';
import { Agent } from '../types';

interface AgentFiltersProps {
  agents: Agent[];
  uniqueTemplates: string[];
  selectedTemplate: string | null;
  showActiveOnly: boolean;
  showMyAgentsOnly: boolean;
  currentUserEmail?: string | null;
  onTemplateSelect: (template: string) => void;
  onClearFilters: () => void;
  onToggleActiveOnly: (showActive: boolean) => void;
  onToggleMyAgentsOnly: (showMyAgents: boolean) => void;
}

export function AgentFilters({
  agents,
  uniqueTemplates,
  selectedTemplate,
  showActiveOnly,
  showMyAgentsOnly,
  currentUserEmail,
  onTemplateSelect,
  onClearFilters,
  onToggleActiveOnly,
  onToggleMyAgentsOnly,
}: AgentFiltersProps) {
  return (
    <div className="p-4 rounded-xl border bg-background shadow-sm">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filters</span>
          {(selectedTemplate || showActiveOnly || showMyAgentsOnly) && (
            <button
              onClick={onClearFilters}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* My/Everyone's Switch */}
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                !showMyAgentsOnly 
                  ? 'bg-accent text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onToggleMyAgentsOnly(false)}
            >
              <span className="flex items-center gap-1.5">
                Everyone&apos;s
                <span className="text-[10px] opacity-60">
                  ({agents.length})
                </span>
              </span>
            </button>
            <button
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                showMyAgentsOnly 
                  ? 'bg-accent text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onToggleMyAgentsOnly(true)}
            >
              <span className="flex items-center gap-1.5">
                Mine
                <span className="text-[10px] opacity-60">
                  ({agents.filter(a => a.participantId === currentUserEmail).length})
                </span>
              </span>
            </button>
          </div>

          {/* All/Active Switch */}
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                !showActiveOnly 
                  ? 'bg-accent text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onToggleActiveOnly(false)}
            >
              <span className="flex items-center gap-1.5">
                All
                <span className="text-[10px] opacity-60">
                  ({agents.filter(a => !showMyAgentsOnly || a.participantId === currentUserEmail).length})
                </span>
              </span>
            </button>
            <button
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                showActiveOnly 
                  ? 'bg-accent text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onToggleActiveOnly(true)}
            >
              <span className="flex items-center gap-1.5">
                Active
                <span className="text-[10px] opacity-60">
                  ({agents.filter(a => a.status === 'active' && (!showMyAgentsOnly || a.participantId === currentUserEmail)).length})
                </span>
              </span>
            </button>
          </div>
          {uniqueTemplates.map((template) => {
            const count = agents.filter((agent) => 
              agent.template === template && 
              (!showActiveOnly || agent.status === 'active')
            ).length;
            const isSelected = selectedTemplate === template;
            
            return (
              <button
                key={template}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                  isSelected 
                    ? 'bg-accent border-border text-foreground' 
                    : 'bg-transparent border-dashed border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
                onClick={() => onTemplateSelect(template)}
              >
                <span className="flex items-center gap-1.5 whitespace-normal break-words text-left">
                  <Bot className="h-3 w-3 flex-shrink-0" />
                  <span className="whitespace-normal break-words">{template}</span>
                  <span className="text-[10px] opacity-60 flex-shrink-0">
                    ({count})
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
