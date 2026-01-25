import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      hasTenantAccess?: boolean
    } & DefaultSession["user"]
    accessToken?: string
  }

  interface User extends DefaultUser {
    role?: string
    hasTenantAccess?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    accessToken?: string
    idToken?: string
    provider?: string
    hasTenantAccess?: boolean
  }
}
