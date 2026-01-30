'use client';

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, AlertCircle, Globe, Building2, Zap, RefreshCw, Bot, FileJson, FileText, FileCode, BookOpen } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { KnowledgeGroup, KnowledgeApiResponse, KnowledgeItem, KnowledgeScopeLevel, getEffectiveScopeLevel } from '@/lib/xians/knowledge';
import { KnowledgeGroupItem, KnowledgeGroupDetail, KnowledgeItemDetail } from '@/components/features/knowledge';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { cn } from '@/lib/utils';

function KnowledgeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();

  // Agent and activation from URL params
  const agentName = searchParams.get('agentName') || '';
  const activationName = searchParams.get('activationName') || '';
  const selectedGroupName = searchParams.get('selected');
  const selectedItemId = searchParams.get('itemId');

  // API state
  const [knowledgeGroups, setKnowledgeGroups] = useState<KnowledgeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the last fetched params to detect URL changes
  const [lastFetchedParams, setLastFetchedParams] = useState<{ agent: string; activation: string } | null>(null);

  // Individual item state
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [selectedItemLevel, setSelectedItemLevel] = useState<KnowledgeScopeLevel | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  // Find selected group
  const selectedGroup = useMemo(() => {
    if (!selectedGroupName) return null;
    return knowledgeGroups.find((g) => g.name === selectedGroupName) || null;
  }, [selectedGroupName, knowledgeGroups]);

  // Fetch knowledge data
  const fetchKnowledge = useCallback(async (agent: string, activation: string) => {
    if (!currentTenantId || !agent || !activation) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        agentName: agent,
        activationName: activation,
      });

      const response = await fetch(
        `/api/tenants/${currentTenantId}/knowledge?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch knowledge');
      }

      const data: KnowledgeApiResponse = await response.json();
      setKnowledgeGroups(data.groups || []);
      setLastFetchedParams({ agent, activation });
    } catch (err: any) {
      console.error('[KnowledgePage] Error fetching knowledge:', err);
      setError(err.message || 'Failed to fetch knowledge');
      showErrorToast(err, 'Failed to load knowledge');
      // Set lastFetchedParams even on error to prevent infinite retry loop
      setLastFetchedParams({ agent, activation });
    } finally {
      setIsLoading(false);
    }
  }, [currentTenantId]);

  // Auto-fetch when URL params are present and have changed
  useEffect(() => {
    if (!currentTenantId || !agentName || !activationName) {
      return;
    }

    // Check if params have changed since last fetch
    const paramsChanged = 
      !lastFetchedParams ||
      lastFetchedParams.agent !== agentName ||
      lastFetchedParams.activation !== activationName;

    if (paramsChanged && !isLoading) {
      console.log('[KnowledgePage] Auto-fetching knowledge for:', { agentName, activationName });
      fetchKnowledge(agentName, activationName);
    }
  }, [agentName, activationName, currentTenantId, lastFetchedParams, isLoading, fetchKnowledge]);

  const handleRefresh = () => {
    if (agentName && activationName) {
      // Reset last fetched params to force a refetch
      setLastFetchedParams(null);
    }
  };

  // Fetch individual knowledge item
  const fetchKnowledgeItem = useCallback(async (itemId: string) => {
    if (!currentTenantId) return;

    setIsLoadingItem(true);
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/knowledge/${itemId}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch knowledge item');
      }

      const data: KnowledgeItem = await response.json();
      return data;
    } catch (err: any) {
      console.error('[KnowledgePage] Error fetching knowledge item:', err);
      showErrorToast(err, 'Failed to load knowledge item');
      return null;
    } finally {
      setIsLoadingItem(false);
    }
  }, [currentTenantId]);

  // Handle fetching item when itemId param changes
  useEffect(() => {
    if (selectedItemId && currentTenantId) {
      fetchKnowledgeItem(selectedItemId).then((item) => {
        if (item) {
          setSelectedItem(item);
          // Determine the level based on item properties
          if (item.systemScoped) {
            setSelectedItemLevel('system');
          } else if (!item.activationName) {
            setSelectedItemLevel('tenant');
          } else {
            setSelectedItemLevel('activation');
          }
        }
      });
    } else {
      setSelectedItem(null);
      setSelectedItemLevel(null);
    }
  }, [selectedItemId, currentTenantId, fetchKnowledgeItem]);

  const handleGroupClick = (group: KnowledgeGroup) => {
    // When clicking on the row, show the effective (leaf node) knowledge item
    const effectiveItem = group.activations.length > 0 
      ? group.activations[0] 
      : group.tenant_default 
      ? group.tenant_default 
      : group.system_scoped;
    
    if (effectiveItem) {
      handleItemClick(effectiveItem, getEffectiveScopeLevel(group), group.name);
    }
  };

  const handleItemClick = (item: KnowledgeItem, level: KnowledgeScopeLevel, groupName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('selected', groupName);
    params.set('itemId', item.id);
    router.push(`/knowledge?${params.toString()}`, { scroll: false });
  };

  const handleCloseSlider = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('selected');
    params.delete('itemId');
    const newURL = params.toString() ? `/knowledge?${params.toString()}` : '/knowledge';
    router.push(newURL, { scroll: false });
  };

  const handleSave = async (itemId: string, content: string, type: string, version: string) => {
    if (!currentTenantId) return;

    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/knowledge/${itemId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content, type, version }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update knowledge');
      }

      const updatedItem: KnowledgeItem = await response.json();
      
      // Update the selected item if it's the one we just edited
      if (selectedItem?.id === itemId) {
        setSelectedItem(updatedItem);
      }

      // Refresh the knowledge list
      if (agentName && activationName) {
        setLastFetchedParams(null);
      }

      showSuccessToast('Knowledge updated successfully');
    } catch (err: any) {
      console.error('[KnowledgePage] Error updating knowledge:', err);
      showErrorToast(err, 'Failed to update knowledge');
      throw err; // Re-throw to let the dialog handle it
    }
  };

  const handleDuplicate = (item: KnowledgeItem) => {
    console.log('Duplicating knowledge item:', item);
    // TODO: Implement duplicate logic
  };

  const handleDelete = (itemId: string) => {
    console.log('Deleting knowledge item:', itemId);
    // TODO: Implement delete logic
    handleCloseSlider();
  };

  const handleDeleteVersion = () => {
    console.log('[KnowledgePage] Knowledge version deleted');
    
    // Refresh the knowledge list to show the reverted version
    if (agentName && activationName) {
      setLastFetchedParams(null);
    }

    // Close the detail slider since the current version no longer exists
    handleCloseSlider();
  };

  const handleDeleteAllVersions = () => {
    console.log('[KnowledgePage] All knowledge versions deleted');
    
    // Refresh the knowledge list to show the updated state
    if (agentName && activationName) {
      setLastFetchedParams(null);
    }

    // Close the detail slider since all versions have been deleted
    handleCloseSlider();
  };

  const handleOverride = async (item: KnowledgeItem, targetLevel: 'tenant' | 'activation') => {
    if (!currentTenantId) return;

    try {
      console.log('[KnowledgePage] Creating override at', targetLevel, 'level for item:', item);

      const response = await fetch(
        `/api/tenants/${currentTenantId}/knowledge/${item.id}/override`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetLevel,
            activationName: targetLevel === 'activation' ? activationName : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create override');
      }

      const newItem: KnowledgeItem = await response.json();
      
      console.log('[KnowledgePage] Override created successfully:', newItem);

      // Refresh the knowledge list to show the new override
      if (agentName && activationName) {
        setLastFetchedParams(null);
      }

      // Close the detail slider since we'll want to see the updated list
      handleCloseSlider();

      showSuccessToast(`Override created at ${targetLevel === 'tenant' ? 'Organization' : 'Agent'} level`);
    } catch (err: any) {
      console.error('[KnowledgePage] Error creating override:', err);
      showErrorToast(err, 'Failed to create override');
    }
  };

  // Get header content for slider
  const getHeaderContent = () => {
    if (!selectedItem || !selectedItemLevel) {
      return { icon: null, title: 'Knowledge Item', description: null };
    }

    const formatIcons = {
      json: FileJson,
      markdown: FileCode,
      text: FileText,
    };

    const formatColors = {
      json: 'text-blue-600 dark:text-blue-400',
      markdown: 'text-purple-600 dark:text-purple-400',
      text: 'text-gray-600 dark:text-gray-400',
    };

    const FormatIcon = formatIcons[selectedItem.type] || FileText;
    
    return {
      icon: <FormatIcon className={cn('h-5 w-5', formatColors[selectedItem.type])} />,
      title: selectedGroup?.name || selectedItem.name,
      description: selectedItem.agent,
    };
  };

  const headerContent = getHeaderContent();

  // Calculate stats
  const stats = useMemo(() => {
    const systemCount = knowledgeGroups.filter((g) => getEffectiveScopeLevel(g) === 'system').length;
    const tenantCount = knowledgeGroups.filter((g) => getEffectiveScopeLevel(g) === 'tenant').length;
    const activationCount = knowledgeGroups.filter((g) => getEffectiveScopeLevel(g) === 'activation').length;
    return { systemCount, tenantCount, activationCount };
  }, [knowledgeGroups]);

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        {agentName && activationName ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl font-semibold text-foreground truncate">
                    {activationName}
                    </h1>
                    <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                      <Bot className="h-3.5 w-3.5" />
                      {agentName}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Agent knowledge and the levels of overriding
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lastFetchedParams && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleRefresh} 
                    disabled={isLoading}
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="shrink-0">
              <h1 className="text-3xl font-semibold text-foreground">Knowledge Base</h1>
              <p className="text-muted-foreground mt-1">
                Select an agent and activation to view knowledge configuration
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
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

        {/* Stats - Only show when we have data */}
        {lastFetchedParams && knowledgeGroups.length > 0 && (
          <div className="grid gap-8 md:grid-cols-3 py-4">
            {/* System Level */}
            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {stats.systemCount}
                </div>
                <div className="h-8 w-0.5 bg-blue-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  System Level
                </div>
                <div className="text-xs text-muted-foreground">Base knowledge used</div>
              </div>
            </div>

            {/* Organization Level */}
            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {stats.tenantCount}
                </div>
                <div className="h-8 w-0.5 bg-amber-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Organization Level
                </div>
                <div className="text-xs text-muted-foreground">Organization knowledge used</div>
              </div>
            </div>

            {/* Activation Level */}
            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {stats.activationCount}
                </div>
                <div className="h-8 w-0.5 bg-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  Agent Level
                </div>
                <div className="text-xs text-muted-foreground">Agent specific knowledge used</div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Groups List */}
        {lastFetchedParams && (
          <Card className={cn("overflow-visible", knowledgeGroups.length === 0 && "border-border/50")}>
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
                    onItemClick={(item, level) => handleItemClick(item, level, group.name)}
                    isSelected={group.name === selectedGroupName}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 space-y-3">
                  <div className="rounded-full bg-muted/50 p-4">
                    <BookOpen className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      No knowledge articles found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      This agent and activation don't have any knowledge articles configured
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State - Before any fetch */}
        {!lastFetchedParams && !isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <div className="flex justify-center gap-3">
                  <Globe className="h-8 w-8 text-blue-500/50" />
                  <Building2 className="h-8 w-8 text-amber-500/50" />
                  <Zap className="h-8 w-8 text-emerald-500/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  View Knowledge Hierarchy
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Enter an agent name and activation name above to see how knowledge
                  articles are configured across system, tenant, and activation levels.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Knowledge Detail Slider */}
      <Sheet 
        open={!!selectedItemId} 
        onOpenChange={handleCloseSlider}
        headerIcon={headerContent.icon}
        headerTitle={headerContent.title}
        headerDescription={headerContent.description}
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
              groupName={selectedGroup?.name || selectedItem.name}
              group={selectedGroup || undefined}
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
              <p className="text-muted-foreground">Failed to load knowledge item</p>
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
