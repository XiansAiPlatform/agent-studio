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
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type KnowledgeFormat = 'json' | 'markdown' | 'text';

export interface KnowledgeFilters {
  formats: KnowledgeFormat[];
  agents: string[];
}

interface KnowledgeFiltersComponentProps {
  availableAgents: string[];
  filters: KnowledgeFilters;
  onFiltersChange: (filters: KnowledgeFilters) => void;
}

const FORMAT_LABELS: Record<KnowledgeFormat, string> = {
  json: 'JSON',
  markdown: 'Markdown',
  text: 'Text',
};

export function KnowledgeFiltersComponent({
  availableAgents,
  filters,
  onFiltersChange,
}: KnowledgeFiltersComponentProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleFormat = (format: KnowledgeFormat) => {
    const newFormats = filters.formats.includes(format)
      ? filters.formats.filter((f) => f !== format)
      : [...filters.formats, format];
    onFiltersChange({ ...filters, formats: newFormats });
  };

  const toggleAgent = (agent: string) => {
    const newAgents = filters.agents.includes(agent)
      ? filters.agents.filter((a) => a !== agent)
      : [...filters.agents, agent];
    onFiltersChange({ ...filters, agents: newAgents });
  };

  const clearFilters = () => {
    onFiltersChange({ formats: [], agents: [] });
  };

  const hasActiveFilters = filters.formats.length > 0 || filters.agents.length > 0;
  const activeFilterCount = filters.formats.length + filters.agents.length;

  return (
    <div className="flex items-center gap-2 flex-1 justify-end">
      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.formats.map((format) => (
            <Badge
              key={format}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleFormat(format)}
            >
              {FORMAT_LABELS[format]}
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
            Filter Articles
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
          <DropdownMenuLabel>Filter by Format</DropdownMenuLabel>
          <div className="px-2 pb-2">
            {(Object.keys(FORMAT_LABELS) as KnowledgeFormat[]).map((format) => (
              <DropdownMenuCheckboxItem
                key={format}
                checked={filters.formats.includes(format)}
                onCheckedChange={() => toggleFormat(format)}
              >
                {FORMAT_LABELS[format]}
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
