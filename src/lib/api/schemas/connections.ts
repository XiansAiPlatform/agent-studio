/**
 * Zod schemas for OIDC connection API request bodies.
 *
 * Defense-in-depth at the API boundary: enforce types, lengths, and basic
 * format constraints before any payload reaches storage or is used to build
 * downstream URLs.
 */

import { z } from 'zod'

const PROVIDER_IDS = [
  'sharepoint',
  'outlook365',
  'google-workspace',
  'slack',
  'github',
  'notion',
  'generic-oidc',
  'oauth-mcp',
] as const

const externalUrlSchema = z
  .string()
  .url()
  .startsWith('https://', { message: 'URL must use https' })
  .max(2048)

const wellKnownUrlSchema = z
  .string()
  .url()
  .startsWith('https://', { message: 'wellKnownUrl must use https' })
  .max(2048)
  .endsWith('/.well-known/openid-configuration', {
    message:
      'wellKnownUrl must point to an OIDC discovery document (".well-known/openid-configuration")',
  })

const customScopesSchema = z
  .array(z.string().min(1).max(200))
  .max(50)
  .optional()

const baseConnectionFields = {
  name: z.string().min(1).max(255),
  providerId: z.union([z.enum(PROVIDER_IDS), z.string().min(1).max(100)]),
  description: z.string().max(2000).optional(),
  clientId: z.string().min(1).max(500),
  clientSecret: z.string().min(1).max(2000),
  customScopes: customScopesSchema,
  wellKnownUrl: wellKnownUrlSchema.optional(),
  mcpUrl: externalUrlSchema.optional(),
}

export const CreateConnectionSchema = z
  .object(baseConnectionFields)
  .strict()

export const InitiateConnectionSchema = z
  .object({
    ...baseConnectionFields,
    returnUrl: z.string().max(2048).optional(),
    agentName: z.string().min(1).max(100).optional(),
    activationName: z.string().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.providerId !== 'oauth-mcp') return
    if (!value.mcpUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mcpUrl'],
        message: 'mcpUrl is required for OAuth MCP connections',
      })
    }
  })

export const AuthorizeConnectionSchema = z
  .object({
    returnUrl: z.string().max(2048).optional(),
  })
  .strict()
  .partial()
