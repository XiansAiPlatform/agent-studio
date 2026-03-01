'use client';

import { Suspense, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2, AlertCircle, FileJson, FileCode, FileText } from 'lucide-react';
import { KnowledgeGroupItem, KnowledgeItemDetail } from '@/components/features/knowledge';
import { cn } from '@/lib/utils';
import { useKnowledgePage } from './hooks/use-knowledge-page';
import {
  KnowledgePageHeader,
  KnowledgeStatsCards,
  KnowledgeEmptyState,
} from './components';

const FORMAT_ICONS = {
  json: FileJson,
  markdown: FileCode,
  text: FileText,
} as const;

const FORMAT_COLORS: Record<string, string> = {
  json: 'text-blue-600 dark:text-blue-400',
  markdown: 'text-purple-600 dark:text-purple-400',
  text: 'text-gray-600 dark:text-gray-400',
};

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


  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
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

        {lastFetchedParams && knowledgeGroups.length > 0 && (
          <KnowledgeStatsCards
            systemCount={stats.systemCount}
            tenantCount={stats.tenantCount}
            activationCount={stats.activationCount}
          />
        )}

        {lastFetchedParams && (
          <Card
            className={cn(
              'overflow-visible',
              knowledgeGroups.length === 0 && 'border-border/50'
            )}
          >
            <CardHeader>
              <CardTitle>
                {knowledgeGroups.length > 0
                  ? `Knowledge Articles (${knowledgeGroups.length})`
                  : 'Knowledge Articles'}
              </CardTitle>
              <CardDescription>
                {knowledgeGroups.length > 0
                  ? 'Click on a knowledge article to view the content'
                  : 'Knowledge articles configured for this agent and activation'}
              </CardDescription>
            </CardHeader>
            <CardContent className="!px-0 !py-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : knowledgeGroups.length > 0 ? (
                knowledgeGroups.map((group) => (
                  <KnowledgeGroupItem
                    key={group.name}
                    group={group}
                    onClick={handleGroupClick}
                    onItemClick={(item, level) =>
                      handleItemClick(item, level, group.name)
                    }
                    isSelected={group.name === selectedGroupName}
                  />
                ))
              ) : (
                <KnowledgeEmptyState variant="no-articles" />
              )}
            </CardContent>
          </Card>
        )}

        {!lastFetchedParams && !isLoading && (
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
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <KnowledgeContent />
    </Suspense>
  );
}
