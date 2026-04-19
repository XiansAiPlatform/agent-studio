/**
 * Helpers for validating JSON request bodies with Zod at the API boundary.
 *
 * Returns either { data } on success or a `NextResponse` containing a
 * standardized validation error that the route can return directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ZodIssue, ZodType, z } from 'zod'

export interface ValidationFailure {
  ok: false
  response: NextResponse
}

export interface ValidationSuccess<T> {
  ok: true
  data: T
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

function formatIssues(issues: ZodIssue[]) {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))
}

/**
 * Parse a Next.js request body as JSON and validate it against a Zod schema.
 * On failure returns a 400 response with a sanitized list of issues (paths
 * and messages only — never raw input values).
 */
export async function parseJsonBody<S extends ZodType>(
  request: NextRequest,
  schema: S
): Promise<ValidationResult<z.infer<S>>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body', code: 'invalid_json' },
        { status: 400 }
      ),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Validation failed',
          code: 'validation_error',
          issues: formatIssues(result.error.issues),
        },
        { status: 400 }
      ),
    }
  }

  return { ok: true, data: result.data }
}
