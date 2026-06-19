/**
 * Developer Secrets types — Agent Certificates and Admin API Keys.
 *
 * Agent Certificates: X.509 certs agents use to authenticate with the flow server.
 * Admin API Keys:     Named, revocable tokens for programmatic API access.
 */

// ─── Agent Certificates ───────────────────────────────────────────────────────

export interface AgentCertificate {
  id: string
  thumbprint: string
  /** User-supplied display label set at generation time */
  friendlyName: string | null
  subjectName: string
  issuedTo: string
  issuedAt: string
  expiresAt: string
}

export interface GenerateCertificateRequest {
  /** Required display label stored alongside the certificate */
  name: string
  revokePrevious: boolean
}

/** Response from the generate endpoint — a base64-encoded PFX certificate bundle */
export type GenerateCertificateResponse = string

// ─── Admin API Keys ───────────────────────────────────────────────────────────

export interface AdminApiKey {
  id: string
  name: string
  createdAt: string
  createdBy: string
  lastRotatedAt: string | null
}

export interface CreateAdminApiKeyRequest {
  name: string
}

export interface CreateAdminApiKeyResponse {
  /** The raw API key value — only returned once at creation time */
  apiKey: string
  id: string
  name: string
  createdAt: string
  createdBy: string
}

export interface RotateAdminApiKeyResponse {
  /** The new raw API key value — only returned once after rotation */
  apiKey: string
  id: string
  name: string
  createdAt: string
  createdBy: string
  lastRotatedAt: string | null
}
