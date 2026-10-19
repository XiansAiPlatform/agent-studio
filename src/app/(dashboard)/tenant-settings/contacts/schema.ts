import { z } from 'zod'

/**
 * Shared by the contact dialog (client) and the /api/settings/contacts routes (server),
 * so the API layer enforces the same rules even when called directly.
 * Limits match the backend's ContactService.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  // An empty phone clears it.
  phone: z.string().trim().max(30, 'Phone is too long').optional(),
})

/** PATCH: every field is optional; fields left out keep their current value. */
export const contactPatchSchema = contactSchema.partial()

/** First validation message, for a 400 response body. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request body'
}
