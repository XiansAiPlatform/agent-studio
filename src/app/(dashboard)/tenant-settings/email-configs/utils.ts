import { EmailConfigForm, EmailConfigStatus, EmailSource, SmtpSecurity } from './types'

export const SECURITY_OPTIONS: { value: SmtpSecurity; label: string; port: number }[] = [
  { value: 'StartTls', label: 'STARTTLS', port: 587 },
  { value: 'SslOnConnect', label: 'SSL/TLS', port: 465 },
  { value: 'None', label: 'None', port: 25 },
  { value: 'Auto', label: 'Auto', port: 587 },
]

const SOURCE_LABELS: Record<EmailSource, string> = {
  Tenant: 'Tenant SMTP',
  Server: 'Server default',
  None: 'Off',
}

const SOURCE_DESCRIPTIONS: Record<EmailSource, string> = {
  Tenant: "Emails are sent through this tenant's SMTP server.",
  Server:
    "Emails are sent through the platform's default email server. Save your own SMTP server below to override it.",
  None: 'Email is off — no email server is configured. Save an SMTP server below to turn it on.',
}

/** Badge text for the email server in use. */
export function usingLabel(status: EmailConfigStatus): string {
  return SOURCE_LABELS[status.source]
}

/** One-line description of the email server in use. */
export function describeStatus(status: EmailConfigStatus): string {
  return SOURCE_DESCRIPTIONS[status.source]
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

/**
 * Builds the form from the GET response. Server/None sources have no tenant
 * fields, so the form starts empty; the password is never pre-filled.
 */
export function toForm(status: EmailConfigStatus | null): EmailConfigForm {
  return {
    host: status?.host ?? '',
    port: String(status?.port ?? 587),
    security: status?.security ?? 'StartTls',
    username: status?.username ?? '',
    password: '',
    senderEmail: status?.senderEmail ?? '',
    senderName: status?.senderName ?? '',
  }
}

/**
 * Returns the first problem with the SMTP fields, or null when they can be
 * saved or tested.
 */
export function validateSmtp(form: EmailConfigForm): string | null {
  if (!form.host.trim()) return 'Host is required'
  const port = Number(form.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 'Port must be between 1 and 65535'
  if (!isValidEmail(form.senderEmail)) return 'Sender email must be a valid email address'
  if (form.password && !form.username.trim()) return 'Username is required when a password is set'
  return null
}

/** Request body for PUT and POST /test. Blank optional fields are left out. */
export function toRequest(form: EmailConfigForm) {
  return {
    host: form.host.trim() || undefined,
    port: Number(form.port) || 587,
    security: form.security,
    username: form.username.trim() || undefined,
    password: form.password || undefined,
    senderEmail: form.senderEmail.trim() || undefined,
    senderName: form.senderName.trim() || undefined,
  }
}

