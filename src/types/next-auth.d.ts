/**
 * NextAuth Type Augmentation
 * 
 * This file extends the default NextAuth types to include custom fields.
 * Module augmentation ensures type safety across the entire application.
 * 
 * @see https://next-auth.js.org/getting-started/typescript
 */

import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

/**
 * Extend the default Session interface
 * Preserves all default fields (email, name, image) via DefaultSession
 */
declare module "next-auth" {
  interface Session {
    user: {
      /** User's unique identifier */
      id: string
      /** User's role in the system */
      role: string
      /** Whether user has access to at least one tenant */
      hasTenantAccess?: boolean
      /** Whether user is a system administrator */
      isSystemAdmin?: boolean
    } & DefaultSession["user"]
    /** OAuth access token for API calls */
    accessToken?: string
  }

  /**
   * Extend the default User interface
   * Used during sign-in callbacks
   */
  interface User extends DefaultUser {
    role?: string
    hasTenantAccess?: boolean
    isSystemAdmin?: boolean
  }
}

/**
 * Extend the default JWT interface
 * Used for token storage and retrieval
 */
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    /** User's unique identifier */
    id: string
    /** User's role in the system */
    role: string
    /** OAuth access token */
    accessToken?: string
    /** OAuth ID token */
    idToken?: string
    /** OAuth provider name */
    provider?: string
    /** Whether user has tenant access */
    hasTenantAccess?: boolean
    /** Whether user is a system administrator */
    isSystemAdmin?: boolean
  }
}
