/**
 * The tenant OIDC configuration is an open-ended JSON object whose schema is
 * owned by the backend (TenantOidcRules). The management UI treats it as an
 * arbitrary JSON document so it stays in sync as the backend schema evolves.
 */
export type OidcConfig = Record<string, unknown>
