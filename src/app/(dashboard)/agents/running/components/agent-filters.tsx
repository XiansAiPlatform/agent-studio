import { Bot } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
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
        <div className="flex items-center gap-3 flex-wrap">
          {/* Everyone's/Mine Switch */}
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <Label 
              htmlFor="ownership-switch" 
              className={cn(
                "text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5",
                !showMyAgentsOnly ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Everyone&apos;s
              <span className="text-[10px] opacity-60">
                ({agents.length})
              </span>
            </Label>
            <Switch
              id="ownership-switch"
              checked={showMyAgentsOnly}
              onCheckedChange={onToggleMyAgentsOnly}
            />
            <Label 
              htmlFor="ownership-switch" 
              className={cn(
                "text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5",
                showMyAgentsOnly ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Mine
              <span className="text-[10px] opacity-60">
                ({agents.filter(a => a.participantId === currentUserEmail).length})
              </span>
            </Label>
          </div>

          {/* All/Active Switch */}
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <Label 
              htmlFor="status-switch" 
              className={cn(
                "text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5",
                !showActiveOnly ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              All
              <span className="text-[10px] opacity-60">
                ({agents.filter(a => !showMyAgentsOnly || a.participantId === currentUserEmail).length})
              </span>
            </Label>
            <Switch
              id="status-switch"
              checked={showActiveOnly}
              onCheckedChange={onToggleActiveOnly}
            />
            <Label 
              htmlFor="status-switch" 
              className={cn(
                "text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5",
                showActiveOnly ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Active
              <span className="text-[10px] opacity-60">
                ({agents.filter(a => a.status === 'active' && (!showMyAgentsOnly || a.participantId === currentUserEmail)).length})
              </span>
            </Label>
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
