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
  /** Conversation-participant identity of the actor; what the performedBy filter matches against. */
  participantId: string;
  /** The actor's logged-in user identity. */
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
