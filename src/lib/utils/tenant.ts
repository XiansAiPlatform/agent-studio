/**
 * Utility functions for tenant operations
 */

/**
 * Extract tenant ID from user's email domain
 * e.g., user@acme.com -> "acme"
 */
export function getTenantIdFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null
  }

  const domain = email.split('@')[1]
  if (!domain) {
    return null
  }

  // Extract the first part of the domain as tenant ID
  const tenantId = domain.split('.')[0]
  
  return tenantId || null
}

/**
 * Extract domain from user's email
 * e.g., user@acme.com -> "acme.com"
 */
export function getDomainFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null
  }

  const domain = email.split('@')[1]
  return domain || null
}

/**
 * Generate a default organization name from tenant ID
 * e.g., "acme" -> "Acme Organization"
 */
export function generateOrgName(tenantId: string): string {
  if (!tenantId) {
    return 'Organization'
  }

  const capitalized = tenantId.charAt(0).toUpperCase() + tenantId.slice(1)
  return `${capitalized} Organization`
}
