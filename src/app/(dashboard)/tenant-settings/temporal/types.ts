/**
 * Input body for saving a tenant's Temporal connection override.
 */
export interface TemporalConfig {
  serverUrl: string
  namespace: string
  certificate?: string
  privateKey?: string
}

/**
 * Response shape for GET — null means the tenant has no override and uses
 * the default Temporal server. The backend currently returns
 * certificate/privateKey decrypted (not masked), so treat this as sensitive.
 */
export type TemporalConfigStatus = {
  tenantId: string
  serverUrl: string
  namespace: string
  certificate: string | null
  privateKey: string | null
} | null
