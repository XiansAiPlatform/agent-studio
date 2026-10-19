export type SmtpSecurity = 'None' | 'StartTls' | 'SslOnConnect' | 'Auto'

/**
 * Where the tenant's email is sent from:
 * - Tenant: the tenant's own SMTP server (overrides the server default)
 * - Server: the platform's default email server (server env)
 * - None: nothing is configured, email is off
 */
export type EmailSource = 'Tenant' | 'Server' | 'None'

/**
 * Response shape for GET. The password is never returned; hasPassword says
 * whether one is saved. Connection fields are only set when source is Tenant.
 */
export interface EmailConfigStatus {
  source: EmailSource
  host: string | null
  port: number | null
  security: SmtpSecurity | null
  username: string | null
  hasPassword: boolean
  senderEmail: string | null
  senderName: string | null
  updatedAt: string | null
  updatedBy: string | null
}

/**
 * Body for saving (PUT) or testing (POST /test). A blank password keeps the
 * saved one.
 */
export interface EmailConfigForm {
  host: string
  port: string
  security: SmtpSecurity
  username: string
  password: string
  senderEmail: string
  senderName: string
}
