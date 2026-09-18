/**
 * Frontend mirrors of the server audit log DTOs (see XiansAi.Server
 * AuditLogEntry model / AdminAuditLogService).
 */

/** Filters applied to audit log queries. All optional. */
export interface AuditLogFilters {
  performedBy: string | null;
  /** Exact activation name to filter by. Ignored when onlyWithoutActivation is true. */
  activationName: string | null;
  /** When true, show only entries that have no associated activation. */
  onlyWithoutActivation: boolean;
  /** ISO date string (inclusive). */
  startDate: string | null;
  /** ISO date string (inclusive). */
  endDate: string | null;
}

/** A single recorded audit log entry. */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  /**
   * Who performed the action. On Admin API calls this is the Studio UI user asserted via
   * `X-On-Behalf-Of`; it falls back to the key owner when that header is absent. This is what
   * the performedBy filter matches against.
   */
  participantId: string;
  /**
   * The authenticated caller the server authorized the request as — for Agent Studio traffic
   * that is the owner of the shared `XIANS_APIKEY`, not the person in the UI. Differs from
   * `participantId` whenever attribution was asserted.
   */
  loggedInUser: string;
  action: string;
  activationName?: string | null;
  description?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

/** A page of audit log entries. */
export interface AuditLogListResponse {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
