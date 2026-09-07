'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/page-loader';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { AuditActivityFilterBar } from './components/audit-activity-filter-bar';
import { AuditActivityList } from './components/audit-activity-list';
import type { AuditActivityFilters, AuditActivityListResponse } from './types';

const PAGE_SIZE = 20;

function buildFilterQuery(filters: AuditActivityFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.performedBy) params.set('performedBy', filters.performedBy);
  if (filters.onlyWithoutActivation) {
    params.set('onlyWithoutActivation', 'true');
  } else if (filters.activationName) {
    params.set('activationName', filters.activationName);
  }
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return params;
}

function AuditActivitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();

  // Derive state from URL so the view is shareable / refresh-safe.
  const filters: AuditActivityFilters = useMemo(
    () => ({
      performedBy: searchParams.get('performedBy'),
      activationName: searchParams.get('activationName'),
      onlyWithoutActivation: searchParams.get('onlyWithoutActivation') === 'true',
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }),
    [searchParams]
  );
  const currentPage = useMemo(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return !Number.isNaN(p) && p > 0 ? p : 1;
  }, [searchParams]);

  const [list, setList] = useState<AuditActivityListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [performedByOptions, setPerformedByOptions] = useState<string[]>([]);
  const [activationNameOptions, setActivationNameOptions] = useState<string[]>([]);
  const hasFetchedOptionsRef = useRef(false);

  const listRequestIdRef = useRef(0);
  const shouldFetch = Boolean(currentTenantId) && Boolean(user);

  // URL writer: merge partial filter / page changes.
  const updateURL = useCallback(
    (next: { filters?: Partial<AuditActivityFilters>; page?: number }) => {
      const mergedFilters: AuditActivityFilters = {
        ...filters,
        ...(next.filters ?? {}),
      };
      const params = buildFilterQuery(mergedFilters);

      const nextPage = next.page !== undefined ? next.page : currentPage;
      if (nextPage > 1) params.set('page', String(nextPage));

      const qs = params.toString();
      router.push(qs ? `/settings/audit-activities?${qs}` : '/settings/audit-activities', {
        scroll: false,
      });
    },
    [router, filters, currentPage]
  );

  const handleFilterChange = useCallback(
    (partial: Partial<AuditActivityFilters>) => {
      // Any filter change resets pagination.
      updateURL({ filters: partial, page: 1 });
    },
    [updateURL]
  );

  const handleClearAll = useCallback(() => {
    updateURL({
      filters: {
        performedBy: null,
        activationName: null,
        onlyWithoutActivation: false,
        startDate: null,
        endDate: null,
      },
      page: 1,
    });
  }, [updateURL]);

  const handlePageChange = useCallback(
    (page: number) => updateURL({ page }),
    [updateURL]
  );

  // Fetch the distinct filter dropdown options (once).
  useEffect(() => {
    if (!shouldFetch || hasFetchedOptionsRef.current) return;
    const controller = new AbortController();

    (async () => {
      try {
        const [performedByRes, activationNamesRes] = await Promise.all([
          fetch('/api/audit-activities/performed-by', { signal: controller.signal }),
          fetch('/api/audit-activities/activation-names', { signal: controller.signal }),
        ]);

        if (performedByRes.ok) {
          const data = await performedByRes.json();
          setPerformedByOptions(Array.isArray(data) ? data : []);
        }
        if (activationNamesRes.ok) {
          const data = await activationNamesRes.json();
          setActivationNameOptions(Array.isArray(data) ? data : []);
        }
        hasFetchedOptionsRef.current = true;
      } catch {
        // Non-fatal: the filter dropdowns just stay empty (still usable with "Any").
      }
    })();

    return () => controller.abort();
  }, [shouldFetch]);

  // Fetch the audit activity list whenever filters or page change.
  useEffect(() => {
    if (!shouldFetch) return;
    const requestId = ++listRequestIdRef.current;
    const controller = new AbortController();

    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        const params = buildFilterQuery(filters);
        params.set('page', String(currentPage));
        params.set('pageSize', String(PAGE_SIZE));
        const res = await fetch(`/api/audit-activities?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as AuditActivityListResponse;
        if (requestId !== listRequestIdRef.current) return;
        setList(json);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        if (requestId !== listRequestIdRef.current) return;
        setListError(e instanceof Error ? e.message : 'Failed to load audit activities');
      } finally {
        if (requestId === listRequestIdRef.current) {
          setListLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [shouldFetch, filters, currentPage]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Audit Activities
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
          Review the audit trail of user and system actions across this tenant.
        </p>
      </div>

      <AuditActivityFilterBar
        filters={filters}
        performedByOptions={performedByOptions}
        activationNameOptions={activationNameOptions}
        onChange={handleFilterChange}
        onClearAll={handleClearAll}
      />

      {!list && !listError ? (
        <PageLoader label="Loading audit activities..." />
      ) : (
        <AuditActivityList
          data={list}
          loading={listLoading}
          error={listError}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

export default function AuditActivitiesPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading audit activities..." />}>
      <AuditActivitiesContent />
    </Suspense>
  );
}
