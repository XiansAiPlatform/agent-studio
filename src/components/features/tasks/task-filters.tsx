'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type TaskStatus = 'pending' | 'approved' | 'rejected' | 'obsolete';
export type TaskScope = 'my-tasks' | 'all-tasks';

export interface TaskFilters {
  scope: TaskScope;
  statuses: TaskStatus[];
  agents: string[];
}

interface TaskFiltersComponentProps {
  availableAgents: string[];
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  obsolete: 'Obsolete',
};

const SCOPE_LABELS: Record<TaskScope, string> = {
  'my-tasks': 'My Tasks',
  'all-tasks': 'All Tasks',
};

export function TaskFiltersComponent({
  availableAgents,
  filters,
  onFiltersChange,
}: TaskFiltersComponentProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleStatus = (status: TaskStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleAgent = (agent: string) => {
    const newAgents = filters.agents.includes(agent)
      ? filters.agents.filter((a) => a !== agent)
      : [...filters.agents, agent];
    onFiltersChange({ ...filters, agents: newAgents });
  };

  const setScope = (scope: TaskScope) => {
    onFiltersChange({ ...filters, scope });
  };

  const clearFilters = () => {
    onFiltersChange({ scope: 'all-tasks', statuses: [], agents: [] });
  };

  const hasActiveFilters = filters.scope === 'my-tasks' || filters.statuses.length > 0 || filters.agents.length > 0;
  const activeFilterCount = (filters.scope === 'my-tasks' ? 1 : 0) + filters.statuses.length + filters.agents.length;

  return (
    <div className="flex items-center gap-2 flex-1 justify-end">
      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.scope === 'my-tasks' && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => setScope('all-tasks')}
            >
              My Tasks
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.statuses.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleStatus(status)}
            >
              {STATUS_LABELS[status]}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {filters.agents.map((agent) => (
            <Badge
              key={agent}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleAgent(agent)}
            >
              {agent}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="relative shrink-0">
            <Filter className="mr-2 h-4 w-4" />
            Filter Tasks
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="ml-2 h-5 min-w-5 px-1.5 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Show Tasks</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={filters.scope} onValueChange={(value) => setScope(value as TaskScope)}>
            <DropdownMenuRadioItem value="all-tasks">
              All Tasks
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="my-tasks">
              My Tasks
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <div className="px-2 pb-2">
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.statuses.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              >
                {STATUS_LABELS[status]}
              </DropdownMenuCheckboxItem>
            ))}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Filter by Agent</DropdownMenuLabel>
          <div className="px-2 pb-2 max-h-60 overflow-y-auto">
            {availableAgents.map((agent) => (
              <DropdownMenuCheckboxItem
                key={agent}
                checked={filters.agents.includes(agent)}
                onCheckedChange={() => toggleAgent(agent)}
              >
                {agent}
              </DropdownMenuCheckboxItem>
            ))}
          </div>

          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full justify-start"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear all filters
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
