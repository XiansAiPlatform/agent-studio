import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth"

/**
 * Visma Connect OIDC provider for NextAuth.
 *
 * Uses OIDC discovery via the provider's well-known document and follows the
 * authorization code flow with PKCE, mirroring the setup used by the
 * Compello onboarding-web reference app.
 */
export interface VismaConnectProfile {
  sub: string
  name?: string
  email?: string
  preferred_username?: string
  picture?: string
}

type VismaConnectProviderOptions = Omit<
  OAuthUserConfig<VismaConnectProfile>,
  "clientSecret"
> & {
  issuer: string
  clientSecret?: string
}

export function VismaConnectProvider(
  options: VismaConnectProviderOptions
): OAuthConfig<VismaConnectProfile> {
  return {
    id: "visma-connect",
    name: "Visma Connect",
    type: "oauth",
    wellKnown: `${options.issuer}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: "openid profile email offline_access",
        // Force interactive authentication so user can switch account
        // instead of silently reusing an existing Visma SSO session.
        prompt: "login",
      },
    },
    idToken: true,
    checks: ["pkce", "state"],
    // Visma SPA applications are public clients and must use PKCE without
    // client_secret authentication at the token endpoint.
    client: {
      token_endpoint_auth_method: "none",
    },
    profile(profile: VismaConnectProfile) {
      return {
        id: profile.sub,
        name: profile.name ?? profile.preferred_username ?? null,
        email: profile.email ?? null,
        image: profile.picture ?? null,
      }
    },
    ...options,
  }
}
