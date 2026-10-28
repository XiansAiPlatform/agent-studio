/**
 * Server-side lookups used when creating agent- and activation-scoped secrets.
 * The client is typed structurally so tests can pass a fake.
 */

export interface TenantGetClient {
  get<T>(path: string, options?: { headers?: Record<string, string> }): Promise<T>
}

const PAGE_SIZE = 100
// Upper bound on backend pages scanned per lookup, so a backend that always
// reports another page cannot loop forever.
export const MAX_PAGES = 50

/** Looks an agent deployment up by object id and returns its name (null if absent). */
export async function resolveAgentNameById(
  client: TenantGetClient,
  tenantId: string,
  agentId: string
): Promise<string | null> {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await client.get<{
      agents?: Array<{ id: string; name: string }>
      pagination?: { hasNext?: boolean }
    }>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentDeployments?page=${page}&pageSize=${PAGE_SIZE}`,
      { headers: { 'X-Tenant-Id': tenantId } }
    )
    const match = data?.agents?.find((a) => a.id === agentId)
    if (match) return match.name
    if (!data?.pagination?.hasNext) return null
  }
  return null
}

/** Activation rows from a list response: a bare array or an `activations` / `data` / `items` array. */
function extractRows(data: unknown): Array<{ name?: unknown }> {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of ['activations', 'data', 'items']) {
      const value = (data as Record<string, unknown>)[key]
      if (Array.isArray(value)) return value
    }
  }
  return []
}

/** True when `agentName` has an activation named `activationName` in the tenant. */
export async function agentHasActivation(
  client: TenantGetClient,
  tenantId: string,
  agentName: string,
  activationName: string
): Promise<boolean> {
  const wanted = activationName.trim()
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await client.get<unknown>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations?agentName=${encodeURIComponent(agentName)}&page=${page}&pageSize=${PAGE_SIZE}`,
      { headers: { 'X-Tenant-Id': tenantId } }
    )
    const rows = extractRows(data)
    if (rows.some((a) => typeof a?.name === 'string' && a.name.trim() === wanted)) return true
    const pagination = (data as { pagination?: { hasNext?: boolean; totalPages?: number } } | null)
      ?.pagination
    const hasNext =
      pagination?.hasNext ??
      (pagination?.totalPages != null ? pagination.totalPages > page : rows.length >= PAGE_SIZE)
    if (!hasNext || rows.length === 0) return false
  }
  return false
}
