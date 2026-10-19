'use client';

import { Suspense, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, FileJson, FileCode, FileText, Search, X } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { KnowledgeGroupItem, KnowledgeItemDetail } from '@/components/features/knowledge';
import { KnowledgeScopeLevel, getEffectiveScopeLevel } from '@/lib/xians/knowledge';
import { cn } from '@/lib/utils';
import { useKnowledgePage } from './hooks/use-knowledge-page';
import {
  KnowledgePageHeader,
  KnowledgeEmptyState,
} from './components';

const FORMAT_ICONS = {
  json: FileJson,
  markdown: FileCode,
  text: FileText,
} as const;

const FORMAT_COLORS: Record<string, string> = {
  json: 'text-primary',
  markdown: 'text-primary',
  text: 'text-primary',
};

type ScopeFilter = 'all' | KnowledgeScopeLevel;

const SCOPE_FILTERS: { value: ScopeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'system', label: 'System' },
  { value: 'tenant', label: 'Organization' },
  { value: 'activation', label: 'Agent' },
];

function KnowledgeContent() {
  const {
    agentName,
    activationName,
    selectedGroupName,
    selectedItemId,
    lastFetchedParams,
    knowledgeGroups,
    selectedGroup,
    selectedItem,
    selectedItemLevel,
    isLoading,
    isLoadingItem,
    error,
    stats,
    handleRefresh,
    handleGroupClick,
    handleItemClick,
    handleCloseSlider,
    handleSave,
    handleDuplicate,
    handleDelete,
    handleDeleteVersion,
    handleDeleteAllVersions,
    handleOverride,
  } = useKnowledgePage();

  const sheetHeader = useMemo(() => {
    if (!selectedItem || !selectedItemLevel) {
      return { icon: null, title: 'Knowledge Item', description: null };
    }
    const FormatIcon = FORMAT_ICONS[selectedItem.type] ?? FileText;
    const colorClass = FORMAT_COLORS[selectedItem.type] ?? FORMAT_COLORS.text;
    return {
      icon: <FormatIcon className={cn('h-5 w-5', colorClass)} />,
      title: selectedGroup?.name ?? selectedItem.name,
      description: selectedItem.agent,
    };
  }, [selectedItem, selectedItemLevel, selectedGroup]);

  const [expandedGroupName, setExpandedGroupName] = useState<string | null>(selectedGroupName);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');

  const [prevSelectedGroupName, setPrevSelectedGroupName] = useState(selectedGroupName);
  if (selectedGroupName !== prevSelectedGroupName) {
    setPrevSelectedGroupName(selectedGroupName);
    if (selectedGroupName) setExpandedGroupName(selectedGroupName);
  }

  const scopeCounts: Record<ScopeFilter, number> = {
    all: knowledgeGroups.length,
    system: stats.systemCount,
    tenant: stats.tenantCount,
    activation: stats.activationCount,
  };

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return knowledgeGroups.filter(
      (group) =>
        (scopeFilter === 'all' || getEffectiveScopeLevel(group) === scopeFilter) &&
        (!query || group.name.toLowerCase().includes(query))
    );
  }, [knowledgeGroups, searchQuery, scopeFilter]);

  const isFiltering = searchQuery.trim() !== '' || scopeFilter !== 'all';
  const hasGroups = !isLoading && knowledgeGroups.length > 0;


  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <KnowledgePageHeader
          agentName={agentName}
          activationName={activationName}
          lastFetchedParams={lastFetchedParams}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {agentName && activationName ? (
          <Card
            className={cn(
              'overflow-visible',
              !isLoading && knowledgeGroups.length === 0 && 'border-border/50'
            )}
          >
            <CardHeader className="space-y-3">
              <div className="space-y-1.5">
                <CardTitle>
                  {hasGroups
                    ? `Knowledge Articles (${knowledgeGroups.length})`
                    : 'Knowledge Articles'}
                </CardTitle>
                <CardDescription>
                  {hasGroups
                    ? 'Select an article to see its override hierarchy. The highlighted level is the version in effect.'
                    : 'Knowledge articles configured for this agent and activation will appear here.'}
                </CardDescription>
              </div>

              {hasGroups && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search articles..."
                      aria-label="Search knowledge articles"
                      className="h-8 pl-8 pr-8"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Filter by active level"
                    className="inline-flex items-center gap-1 rounded-md bg-muted/50 p-0.5 self-start sm:self-auto overflow-x-auto"
                  >
                    {SCOPE_FILTERS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={scopeFilter === value}
                        onClick={() => setScopeFilter(value)}
                        disabled={value !== 'all' && scopeCounts[value] === 0}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                          scopeFilter === value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {label}
                        <span className="tabular-nums text-muted-foreground/70">
                          {scopeCounts[value]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="!px-0 !py-0 border-t border-border/40">
              {isLoading || !lastFetchedParams ? (
                <PageLoader label="Loading knowledge..." />
              ) : filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <KnowledgeGroupItem
                    key={group.name}
                    group={group}
                    onClick={handleGroupClick}
                    onItemClick={(item, level) =>
                      handleItemClick(item, level, group.name)
                    }
                    isSelected={group.name === selectedGroupName}
                    isExpanded={group.name === expandedGroupName}
                    onToggle={(g) =>
                      setExpandedGroupName((current) => (current === g.name ? null : g.name))
                    }
                    agentName={agentName}
                    activationName={activationName}
                  />
                ))
              ) : isFiltering && knowledgeGroups.length > 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                  <p className="text-sm font-medium text-foreground">No matching articles</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setScopeFilter('all');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <KnowledgeEmptyState variant="no-articles" />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <KnowledgeEmptyState variant="no-context" />
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet
        open={!!selectedItemId}
        onOpenChange={(open) => !open && handleCloseSlider()}
        headerIcon={sheetHeader.icon}
        headerTitle={sheetHeader.title}
        headerDescription={sheetHeader.description}
      >
        <SheetContent className="flex flex-col p-0 h-full">
          {isLoadingItem ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedItem && selectedItemLevel ? (
            <KnowledgeItemDetail
              item={selectedItem}
              level={selectedItemLevel}
              groupName={selectedGroup?.name ?? selectedItem.name}
              group={selectedGroup ?? undefined}
              agentName={agentName}
              activationName={activationName}
              onSave={handleSave}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onDeleteVersion={handleDeleteVersion}
              onDeleteAllVersions={handleDeleteAllVersions}
              onOverride={handleOverride}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 px-6">
              <p className="text-muted-foreground">
                Failed to load knowledge item
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading knowledge..." />}>
      <KnowledgeContent />
    </Suspense>
  );
}
