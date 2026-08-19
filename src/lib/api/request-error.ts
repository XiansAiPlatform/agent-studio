/**
 * Client-side counterpart to `handleApiError`.
 *
 * The internal API routes forward upstream 4xx messages verbatim, and some of
 * those messages are only actionable together with their status — for example
 * the 409 returned when adding a user by email address, which means "an account
 * already holds this address, name it by user id instead". Callers need the
 * status to tell that apart from an ordinary failure, so it is carried here
 * rather than being flattened into a plain Error.
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/**
 * Read a failed `fetch` response and throw an ApiRequestError carrying the
 * server's message, falling back to `fallback` when the body has none.
 */
export async function throwApiRequestError(
  res: Response,
  fallback: string
): Promise<never> {
  const body = await res.json().catch(() => ({}))
  const message =
    typeof body?.error === 'string' && body.error
      ? body.error
      : typeof body?.message === 'string' && body.message
        ? body.message
        : `${fallback} (${res.status})`
  throw new ApiRequestError(message, res.status)
}
