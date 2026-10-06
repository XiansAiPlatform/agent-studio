export function getOAuthCallbackUrl(): string {
  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) throw new Error('NEXTAUTH_URL is required for OAuth connections')
  return new URL('/api/connections/complete', baseUrl).toString()
}
