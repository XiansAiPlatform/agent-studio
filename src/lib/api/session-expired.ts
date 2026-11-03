/**
 * Header that marks a 401 as "the user's session is gone". SessionGuard signs the
 * user out only for 401s carrying it, so a 401 for any other reason cannot log
 * everyone out. Non-session authorization failures should return 403 instead.
 *
 * Kept free of server-only imports because SessionGuard (a client component) uses the header name.
 */
export const SESSION_EXPIRED_HEADER = 'x-session-expired'

export function sessionExpiredResponse(body: Record<string, unknown> = { error: 'Unauthorized' }) {
  return Response.json(body, { status: 401, headers: { [SESSION_EXPIRED_HEADER]: '1' } })
}
