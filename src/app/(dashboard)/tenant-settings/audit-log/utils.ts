import type { AuditLogFilters } from './types';

/** Serialize audit log filters into the query params understood by /api/audit-log. */
export function buildFilterQuery(filters: AuditLogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.performedBy) params.set('performedBy', filters.performedBy);
  if (filters.action) params.set('action', filters.action);
  if (filters.onlyWithoutActivation) {
    params.set('onlyWithoutActivation', 'true');
  } else if (filters.activationName) {
    params.set('activationName', filters.activationName);
  }
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return params;
}
