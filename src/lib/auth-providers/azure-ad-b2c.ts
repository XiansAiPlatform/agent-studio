import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth"

/**
 * Azure AD B2C OIDC provider for NextAuth.
 *
 * Supports custom-domain authorities (e.g. HappyInc's login-dev.happyinc.no) and
 * user-flow / custom policies, which the built-in next-auth azure-ad-b2c
 * provider does not handle well (it assumes {tenant}.b2clogin.com and
 * profile.emails[0]).
 *
 * Authority format (matches MSAL / HappyInc React app):
 *   https://{customDomain}/{tenantOrCustomDomain}/{policy}
 * Example:
 *   https://login-dev.happyinc.no/login-dev.happyinc.no/B2C_1A_SIGNUP_SIGNIN_AI
 *
 * Discovery URL:
 *   {authority}/v2.0/.well-known/openid-configuration
 */
export interface AzureADB2CProfile {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  email?: string
  emails?: string[]
  preferred_username?: string
  /** Custom B2C policies sometimes emit email under this nested claim */
  signInNames?: { emailAddress?: string }
  oid?: string
}

export type AzureADB2CProviderOptions = Omit<
  OAuthUserConfig<AzureADB2CProfile>,
  "clientSecret"
> & {
  /** Full authority including policy, without trailing slash or /v2.0 */
  authority: string
  clientSecret?: string
  /** Space-separated scopes; defaults to openid profile email offline_access */
  scopes?: string
  /** Button / provider display name (e.g. "HappyInc") */
  displayName?: string
}

function resolveEmail(profile: AzureADB2CProfile): string | null {
  if (typeof profile.email === "string" && profile.email.length > 0) {
    return profile.email
  }
  if (Array.isArray(profile.emails) && typeof profile.emails[0] === "string") {
    return profile.emails[0]
  }
  const signInEmail = profile.signInNames?.emailAddress
  if (typeof signInEmail === "string" && signInEmail.length > 0) {
    return signInEmail
  }
  if (
    typeof profile.preferred_username === "string" &&
    profile.preferred_username.includes("@")
  ) {
    return profile.preferred_username
  }
  return null
}

export function AzureADB2CProvider(
  options: AzureADB2CProviderOptions
): OAuthConfig<AzureADB2CProfile> {
  const authority = options.authority.replace(/\/$/, "")
  const scopes = options.scopes?.trim() || "openid profile email offline_access"
  const displayName = options.displayName?.trim() || "Microsoft (B2C)"
  const hasClientSecret =
    typeof options.clientSecret === "string" && options.clientSecret.length > 0

  const { authority: _authority, scopes: _scopes, displayName: _displayName, ...rest } =
    options

  return {
    id: "azure-ad-b2c",
    name: displayName,
    type: "oauth",
    wellKnown: `${authority}/v2.0/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: scopes,
      },
    },
    idToken: true,
    checks: ["pkce", "state"],
    // Confidential clients (server-side with a secret) use the default auth
    // method. Public clients (no secret, like the HappyInc SPA) must use PKCE
    // without client_secret at the token endpoint.
    ...(hasClientSecret
      ? {}
      : {
          client: {
            token_endpoint_auth_method: "none" as const,
          },
        }),
    profile(profile: AzureADB2CProfile) {
      const email = resolveEmail(profile)
      const fullName = [profile.given_name, profile.family_name]
        .filter(Boolean)
        .join(" ")
      const name = profile.name || fullName || email || "B2C User"

      return {
        id: profile.sub ?? profile.oid ?? email ?? "unknown",
        name,
        email,
        image: null,
      }
    },
    ...rest,
  }
}
