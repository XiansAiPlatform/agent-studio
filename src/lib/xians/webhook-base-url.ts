/**
 * Public base URL for webhook links shown/copied in Studio.
 * Prefer XIANS_WEBHOOK_PUBLIC_URL (e.g. Cloudflare tunnel) over the
 * internal XIANS_SERVER_URL used for Studio → backend API calls.
 */
export function getWebhookBaseUrl(): string {
  const base =
    process.env.XIANS_WEBHOOK_PUBLIC_URL?.trim() ||
    process.env.XIANS_SERVER_URL?.trim() ||
    ''
  return base.replace(/\/$/, '')
}
