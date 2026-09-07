/**
 * Frontend mirrors of the server audit activity DTOs (see XiansAi.Server
 * AuditActivity model / AdminAuditActivityService).
 */

/** Filters applied to audit activity queries. All optional. */
export interface AuditActivityFilters {
  performedBy: string | null;
  /** Exact activation name to filter by. Ignored when onlyWithoutActivation is true. */
  activationName: string | null;
  /** When true, show only activities that have no associated activation. */
  onlyWithoutActivation: boolean;
  /** ISO date string (inclusive). */
  startDate: string | null;
  /** ISO date string (inclusive). */
  endDate: string | null;
}

/** A single recorded audit trail entry. */
export interface AuditActivityDocument {
  id: string;
  tenantId: string;
  performedBy: string;
  action: string;
  activationName?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

/** A page of audit activity entries. */
export interface AuditActivityListResponse {
  activities: AuditActivityDocument[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
