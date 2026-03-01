'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  KnowledgeGroup,
  KnowledgeApiResponse,
  KnowledgeItem,
  KnowledgeScopeLevel,
  getEffectiveScopeLevel,
  getEffectiveKnowledge,
} from '@/lib/xians/knowledge';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';

const KNOWLEDGE_API_LOG = '[KnowledgePage]';

export function useKnowledgePage(currentTenantId: string | undefined) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params
  const agentName = searchParams.get('agentName') || '';
  const activationName = searchParams.get('activationName') || '';
  const selectedGroupName = searchParams.get('selected') ?? null;
  const selectedItemId = searchParams.get('itemId') ?? null;

  // API state
  const [knowledgeGroups, setKnowledgeGroups] = useState<KnowledgeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedParams, setLastFetchedParams] = useState<{
    agent: string;
    activation: string;
  } | null>(null);

  // Selected item state
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [selectedItemLevel, setSelectedItemLevel] = useState<KnowledgeScopeLevel | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupName) return null;
    return knowledgeGroups.find((g) => g.name === selectedGroupName) ?? null;
  }, [selectedGroupName, knowledgeGroups]);

  const fetchKnowledge = useCallback(
    async (agent: string, activation: string) => {
      if (!currentTenantId || !agent || !activation) return;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ agentName: agent, activationName: activation });
        const response = await fetch(
          `/api/tenants/${currentTenantId}/knowledge?${params}`,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? 'Failed to fetch knowledge');
        }

        const data: KnowledgeApiResponse = await response.json();
        setKnowledgeGroups(data.groups ?? []);
        setLastFetchedParams({ agent, activation });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;

        const message = err instanceof Error ? err.message : 'Failed to fetch knowledge';
        console.error(`${KNOWLEDGE_API_LOG} Error fetching knowledge:`, err);
        setError(message);
        showErrorToast(err, 'Failed to load knowledge');
        setLastFetchedParams({ agent, activation });
      } finally {
        setIsLoading(false);
      }
    },
    [currentTenantId]
  );

  useEffect(() => {
    if (!currentTenantId || !agentName || !activationName) return;

    const paramsChanged =
      !lastFetchedParams ||
      lastFetchedParams.agent !== agentName ||
      lastFetchedParams.activation !== activationName;

    if (paramsChanged) {
      fetchKnowledge(agentName, activationName);
    }

    return () => abortControllerRef.current?.abort();
  }, [agentName, activationName, currentTenantId, fetchKnowledge]);

  const fetchKnowledgeItem = useCallback(
    async (itemId: string): Promise<KnowledgeItem | null> => {
      if (!currentTenantId) return null;

      setIsLoadingItem(true);
      try {
        const response = await fetch(`/api/tenants/${currentTenantId}/knowledge/${itemId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? 'Failed to fetch knowledge item');
        }
        return (await response.json()) as KnowledgeItem;
      } catch (err: unknown) {
        console.error(`${KNOWLEDGE_API_LOG} Error fetching knowledge item:`, err);
        showErrorToast(err, 'Failed to load knowledge item');
        return null;
      } finally {
        setIsLoadingItem(false);
      }
    },
    [currentTenantId]
  );

  useEffect(() => {
    if (!selectedItemId || !currentTenantId) {
      setSelectedItem(null);
      setSelectedItemLevel(null);
      return;
    }

    fetchKnowledgeItem(selectedItemId).then((item) => {
      if (!item) return;

      setSelectedItem(item);
      const level: KnowledgeScopeLevel = item.systemScoped
        ? 'system'
        : !item.activationName
          ? 'tenant'
          : 'activation';
      setSelectedItemLevel(level);
    });
  }, [selectedItemId, currentTenantId, fetchKnowledgeItem]);

  const refreshAndClose = useCallback(() => {
    if (agentName && activationName) fetchKnowledge(agentName, activationName);
    updateUrl({ selected: null, itemId: null });
  }, [agentName, activationName, fetchKnowledge]);

  const updateUrl = useCallback(
    (updates: { selected?: string | null; itemId?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.selected !== undefined) {
        updates.selected ? params.set('selected', updates.selected) : params.delete('selected');
      }
      if (updates.itemId !== undefined) {
        updates.itemId ? params.set('itemId', updates.itemId) : params.delete('itemId');
      }
      const query = params.toString();
      router.push(query ? `/knowledge?${query}` : '/knowledge', { scroll: false });
    },
    [router, searchParams]
  );

  const handleRefresh = useCallback(() => {
    if (agentName && activationName) fetchKnowledge(agentName, activationName);
  }, [agentName, activationName, fetchKnowledge]);

  const handleItemClick = useCallback(
    (item: KnowledgeItem, level: KnowledgeScopeLevel, groupName: string) => {
      updateUrl({ selected: groupName, itemId: item.id });
    },
    [updateUrl]
  );

  const handleGroupClick = useCallback(
    (group: KnowledgeGroup) => {
      const effectiveItem = getEffectiveKnowledge(group);
      if (effectiveItem) {
        handleItemClick(effectiveItem, getEffectiveScopeLevel(group), group.name);
      }
    },
    [handleItemClick]
  );

  const handleCloseSlider = useCallback(() => {
    updateUrl({ selected: null, itemId: null });
  }, [updateUrl]);

  const handleSave = useCallback(
    async (itemId: string, content: string, type: string, version: string) => {
      if (!currentTenantId) return;

      const response = await fetch(
        `/api/tenants/${currentTenantId}/knowledge/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, type, version }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Failed to update knowledge');
      }

      const updatedItem = (await response.json()) as KnowledgeItem;
      setSelectedItem((prev) => (prev?.id === itemId ? updatedItem : prev));

      if (agentName && activationName) fetchKnowledge(agentName, activationName);
      showSuccessToast('Knowledge updated successfully');
    },
    [currentTenantId, agentName, activationName, fetchKnowledge]
  );

  const handleDelete = useCallback(() => {
    refreshAndClose();
  }, [refreshAndClose]);

  const handleDeleteVersion = useCallback(() => {
    refreshAndClose();
  }, [refreshAndClose]);

  const handleDeleteAllVersions = useCallback(() => {
    refreshAndClose();
  }, [refreshAndClose]);

  const handleOverride = useCallback(
    async (item: KnowledgeItem, targetLevel: 'tenant' | 'activation') => {
      if (!currentTenantId) return;

      const response = await fetch(
        `/api/tenants/${currentTenantId}/knowledge/${item.id}/override`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetLevel,
            activationName: targetLevel === 'activation' ? activationName : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Failed to create override');
      }

      if (agentName && activationName) fetchKnowledge(agentName, activationName);
      handleCloseSlider();
      showSuccessToast(
        `Override created at ${targetLevel === 'tenant' ? 'Organization' : 'Agent'} level`
      );
    },
    [currentTenantId, agentName, activationName, fetchKnowledge, handleCloseSlider]
  );

  const stats = useMemo(() => {
    const systemCount = knowledgeGroups.filter(
      (g) => getEffectiveScopeLevel(g) === 'system'
    ).length;
    const tenantCount = knowledgeGroups.filter(
      (g) => getEffectiveScopeLevel(g) === 'tenant'
    ).length;
    const activationCount = knowledgeGroups.filter(
      (g) => getEffectiveScopeLevel(g) === 'activation'
    ).length;
    return { systemCount, tenantCount, activationCount };
  }, [knowledgeGroups]);

  return {
    // URL params
    agentName,
    activationName,
    selectedGroupName,
    selectedItemId,
    lastFetchedParams,

    // Data & loading
    knowledgeGroups,
    selectedGroup,
    selectedItem,
    selectedItemLevel,
    isLoading,
    isLoadingItem,
    error,
    stats,

    // Handlers
    handleRefresh,
    handleGroupClick,
    handleItemClick,
    handleCloseSlider,
    handleSave,
    handleDuplicate: () => {}, // TODO: Implement
    handleDelete,
    handleDeleteVersion,
    handleDeleteAllVersions,
    handleOverride,
  };
}
