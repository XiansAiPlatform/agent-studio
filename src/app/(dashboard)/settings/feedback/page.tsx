'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { FeedbackFilterBar } from './components/feedback-filter-bar';
import { FeedbackStats } from './components/feedback-stats';
import { FeedbackList } from './components/feedback-list';
import { FeedbackDetail } from './components/feedback-detail';
import type {
  FeedbackFilters,
  FeedbackListResponse,
  FeedbackStatsResponse,
} from './types';

const PAGE_SIZE = 20;

function buildFilterQuery(filters: FeedbackFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.agentName) params.set('agentName', filters.agentName);
  if (filters.rating !== null) params.set('rating', String(filters.rating));
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return params;
}

function FeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();

  // Derive state from URL so the view is shareable / refresh-safe.
  const filters: FeedbackFilters = useMemo(
    () => ({
      agentName: searchParams.get('agentName'),
      rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : null,
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }),
    [searchParams]
  );
  const currentPage = useMemo(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return !Number.isNaN(p) && p > 0 ? p : 1;
  }, [searchParams]);
  const selectedFeedbackId = searchParams.get('feedbackId');

  const [stats, setStats] = useState<FeedbackStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [list, setList] = useState<FeedbackListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [agentNames, setAgentNames] = useState<string[]>([]);
  const hasFetchedAgentsRef = useRef(false);

  const shouldFetch = Boolean(currentTenantId) && Boolean(user);

  // URL writer: merge partial filter / page / drill-down changes.
  const updateURL = useCallback(
    (next: {
      filters?: Partial<FeedbackFilters>;
      page?: number;
      feedbackId?: string | null;
    }) => {
      const mergedFilters: FeedbackFilters = {
        ...filters,
        ...(next.filters ?? {}),
      };
      const params = buildFilterQuery(mergedFilters);

      const nextPage = next.page !== undefined ? next.page : currentPage;
      if (nextPage > 1) params.set('page', String(nextPage));

      const nextFeedbackId =
        next.feedbackId !== undefined ? next.feedbackId : selectedFeedbackId;
      if (nextFeedbackId) params.set('feedbackId', nextFeedbackId);

      const qs = params.toString();
      router.push(qs ? `/settings/feedback?${qs}` : '/settings/feedback', {
        scroll: false,
      });
    },
    [router, filters, currentPage, selectedFeedbackId]
  );

  const handleFilterChange = useCallback(
    (partial: Partial<FeedbackFilters>) => {
      // Any filter change resets pagination.
      updateURL({ filters: partial, page: 1 });
    },
    [updateURL]
  );

  const handleClearAll = useCallback(() => {
    updateURL({
      filters: { agentName: null, rating: null, startDate: null, endDate: null },
      page: 1,
    });
  }, [updateURL]);

  const handlePageChange = useCallback(
    (page: number) => updateURL({ page }),
    [updateURL]
  );

  const handleSelect = useCallback(
    (feedbackId: string) => updateURL({ feedbackId }),
    [updateURL]
  );

  const handleBack = useCallback(
    () => updateURL({ feedbackId: null }),
    [updateURL]
  );

  // Fetch distinct agent names for the filter dropdown (once).
  useEffect(() => {
    if (!shouldFetch || hasFetchedAgentsRef.current) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/agent-activations', { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const activations = Array.isArray(data) ? data : data.activations || [];
        const names = Array.from(
          new Set(
            activations
              .map((a: { agentName?: string }) => a.agentName)
              .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)
          )
        ).sort((a, b) => (a as string).localeCompare(b as string)) as string[];
        setAgentNames(names);
        hasFetchedAgentsRef.current = true;
      } catch {
        // Non-fatal: the agent filter just stays empty.
      }
    })();

    return () => controller.abort();
  }, [shouldFetch]);

  // Fetch stats whenever filters change (not affected by pagination/drill-down).
  useEffect(() => {
    if (!shouldFetch) return;
    const controller = new AbortController();

    (async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const qs = buildFilterQuery(filters).toString();
        const res = await fetch(`/api/messaging/feedback/stats${qs ? `?${qs}` : ''}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as FeedbackStatsResponse;
        setStats(json);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setStatsError(e instanceof Error ? e.message : 'Failed to load statistics');
      } finally {
        setStatsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [shouldFetch, filters]);

  // Fetch the feedback list whenever filters or page change.
  useEffect(() => {
    if (!shouldFetch) return;
    const controller = new AbortController();

    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        const params = buildFilterQuery(filters);
        params.set('page', String(currentPage));
        params.set('pageSize', String(PAGE_SIZE));
        const res = await fetch(`/api/messaging/feedback?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as FeedbackListResponse;
        setList(json);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setListError(e instanceof Error ? e.message : 'Failed to load feedback');
      } finally {
        setListLoading(false);
      }
    })();

    return () => controller.abort();
  }, [shouldFetch, filters, currentPage]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Feedback Analytics
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
          Review agent message feedback, analyze ratings, and drill into the
          conversation behind each rating.
        </p>
      </div>

      {selectedFeedbackId ? (
        <FeedbackDetail feedbackId={selectedFeedbackId} onBack={handleBack} />
      ) : (
        <>
          <FeedbackFilterBar
            filters={filters}
            agentNames={agentNames}
            onChange={handleFilterChange}
            onClearAll={handleClearAll}
          />

          <FeedbackStats stats={stats} loading={statsLoading} error={statsError} />

          <FeedbackList
            data={list}
            loading={listLoading}
            error={listError}
            onSelect={handleSelect}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={<div className="container mx-auto max-w-7xl p-6">Loading…</div>}
    >
      <FeedbackContent />
    </Suspense>
  );
}
