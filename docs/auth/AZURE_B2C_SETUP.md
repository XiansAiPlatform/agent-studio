# Azure AD B2C Custom-Domain SSO Setup Guide

## Overview

This guide explains how to configure Agent Studio to sign users in via **Azure AD B2C** using a **custom domain** (for example Parkly's branded login at `login-dev.parkly.no`).

This is separate from the standard Microsoft Entra ID (Azure AD) provider documented in [MICROSOFT_SSO_SETUP.md](./MICROSOFT_SSO_SETUP.md). Both providers can be enabled at the same time.

## How it differs from Entra ID / the React SPA

| | Standard Entra ID (`azure-ad`) | Azure AD B2C (`azure-ad-b2c`) |
|---|---|---|
| Login host | `login.microsoftonline.com` | Custom domain, e.g. `login-dev.parkly.no` |
| Authority | Tenant GUID / `common` | `{customDomain}/{tenant}/{policy}` |
| Env vars | `AZURE_AD_*` | `AZURE_AD_B2C_*` |
| Callback path | `/api/auth/callback/azure-ad` | `/api/auth/callback/azure-ad-b2c` |

Parkly's React app uses MSAL as a **public SPA client**. Agent Studio is a **server-side** NextAuth app, so you must register a **Web** redirect URI (and preferably a client secret) even when reusing the same B2C application registration.

## Prerequisites

- Access to the Azure AD B2C tenant (or the custom-domain host that fronts it)
- An existing B2C app registration, **or** permission to create one
- The user-flow / custom policy name (e.g. `B2C_1A_SIGNUP_SIGNIN_AI`)

## Step 1: Register (or update) the B2C application

1. In the Azure Portal, open your **Azure AD B2C** tenant → **App registrations**.
2. Create a new registration, or open the existing Parkly AI app.
3. Under **Authentication**:
   - Add a platform of type **Web** (not SPA).
   - Redirect URI:
     - Development: `http://localhost:3010/api/auth/callback/azure-ad-b2c`
     - Production: `https://your-agent-studio-host/api/auth/callback/azure-ad-b2c`
   - Leave implicit grant / hybrid flows unchecked (authorization code + PKCE is used).
4. Under **Certificates & secrets** (recommended for server-side apps):
   - Create a new client secret and copy the **Value** immediately.
5. Copy the **Application (client) ID**.

> If you reuse the Parkly SPA registration, you still need the Web redirect URI above. SPA redirect URIs alone will not work with NextAuth's server-side token exchange.

## Step 2: Determine the authority URL

Authority format (matches MSAL / Parkly React config):

```text
https://{customDomain}/{tenantOrCustomDomain}/{policy}
```

Parkly **dev** example:

```text
https://login-dev.parkly.no/login-dev.parkly.no/B2C_1A_SIGNUP_SIGNIN_AI
```

OIDC discovery is resolved as:

```text
{authority}/v2.0/.well-known/openid-configuration
```

You can verify discovery in a browser; it should return `authorization_endpoint`, `token_endpoint`, and `jwks_uri`.

## Step 3: Environment variables

Add to `.env.local` (local) or your container / App Settings (deployed):

```env
# NextAuth (required)
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=your-nextauth-secret

# Azure AD B2C (custom domain)
AZURE_AD_B2C_CLIENT_ID=your-b2c-application-client-id
AZURE_AD_B2C_CLIENT_SECRET=your-b2c-client-secret
AZURE_AD_B2C_AUTHORITY=https://login-dev.parkly.no/login-dev.parkly.no/B2C_1A_SIGNUP_SIGNIN_AI
# Optional — button label; defaults to "Microsoft (B2C)"
AZURE_AD_B2C_DISPLAY_NAME=Parkly

# API / B2B resource scopes (recommended when the backend needs the user token).
# Prefer AZURE_AD_B2B_SCOPES (Parkly). Falls back to AZURE_AD_B2C_SCOPES.
# Accepts comma- or space-separated lists. Must include offline_access so the
# access token can be refreshed and forwarded on messaging send.
AZURE_AD_B2B_SCOPES=openid, profile, offline_access, https://b2cparklyidpdev.onmicrosoft.com/parkly-ai/api/read
# AZURE_AD_B2C_SCOPES=openid profile email offline_access
```

### API resource scopes (B2B)

If your B2C app exposes an API (as Parkly's React app does), include that scope so Agent Studio obtains an access token audienced for the API. That token is stored in the session and forwarded on every messaging send (`authorization` body field) for the Xians backend to use on the user's behalf.

```env
# Parkly-style (comma-separated) — preferred
AZURE_AD_B2B_SCOPES=openid, profile, offline_access, https://b2cparklyidpdev.onmicrosoft.com/parkly-ai/api/read

# Or space-separated via AZURE_AD_B2C_SCOPES
AZURE_AD_B2C_SCOPES=openid profile offline_access https://b2cparklyidpdev.onmicrosoft.com/parkly-ai/api/read
```

`AZURE_AD_B2B_SCOPES` takes precedence over `AZURE_AD_B2C_SCOPES`. After changing scopes, users must sign out and sign in again.

### Client secret vs public client

- **With `AZURE_AD_B2C_CLIENT_SECRET`** (recommended): confidential-client authorization code flow + PKCE.
- **Without a secret**: the provider falls back to a public client (`token_endpoint_auth_method: none`) with PKCE only. Prefer a secret for this server-side app when possible.

## Step 4: Parkly deployment example

Mapping from the Parkly React / Agent Studio container env style:

| Parkly / React | Agent Studio |
|---|---|
| `REACT_APP_ENTRA_ID_CLIENT_ID` | `AZURE_AD_B2C_CLIENT_ID` |
| (client secret from B2C app) | `AZURE_AD_B2C_CLIENT_SECRET` |
| `REACT_APP_ENTRA_ID_AUTHORITY` | `AZURE_AD_B2C_AUTHORITY` |
| `REACT_APP_ENTRA_ID_SCOPES` (comma-separated) | `AZURE_AD_B2B_SCOPES` (comma- or space-separated) |
| — | `AZURE_AD_B2C_DISPLAY_NAME=Parkly` |

Example Agent Studio values for Parkly **dev**:

```env
AZURE_AD_B2C_CLIENT_ID=f25932d1-413f-49b5-891c-0f331645caa1
AZURE_AD_B2C_CLIENT_SECRET=<create-web-client-secret-in-b2c>
AZURE_AD_B2C_AUTHORITY=https://login-dev.parkly.no/login-dev.parkly.no/B2C_1A_SIGNUP_SIGNIN_AI
AZURE_AD_B2B_SCOPES=openid, profile, offline_access, https://b2cparklyidpdev.onmicrosoft.com/parkly-ai/api/read
AZURE_AD_B2C_DISPLAY_NAME=Parkly
NEXTAUTH_URL=https://<your-agent-studio-host>
```

Also keep your existing Xians backend settings:

```env
XIANS_APIKEY=<service-key>
XIANS_SERVER_URL=https://<parkly-xians-server>
```

> Do **not** put the standard `AZURE_AD_*` (Entra ID) vars pointing at the B2C custom domain — those drive the built-in `azure-ad` provider against `login.microsoftonline.com`. Use `AZURE_AD_B2C_*` for Parkly B2C.

## Step 5: Test the flow

1. Start the app: `npm run dev`
2. Open `http://localhost:3010/login`
3. You should see **Sign in with Parkly** (or your `AZURE_AD_B2C_DISPLAY_NAME`)
4. Clicking it should redirect to `login-dev.parkly.no` (not `login.microsoftonline.com`)
5. After a successful B2C login you return to Agent Studio:
   - Users with Xians tenant membership → `/dashboard`
   - Users without tenant membership → `/no-access`

Microsoft OAuth sign-in always succeeds at the IdP level; Agent Studio still gates access afterward via the Xians tenant-membership check.

## Troubleshooting

### Redirect / reply URL mismatch (`AADSTS50011`)

- Ensure the Web redirect URI is exactly `{NEXTAUTH_URL}/api/auth/callback/azure-ad-b2c`
- Protocol (`http` vs `https`) and host must match `NEXTAUTH_URL`
- SPA-only redirect URIs are not enough for NextAuth

### Discovery / authority errors

- Confirm `AZURE_AD_B2C_AUTHORITY` has no trailing slash and includes the policy name
- Open `{authority}/v2.0/.well-known/openid-configuration` and verify it returns JSON

### Invalid client secret

- Create a new secret under the B2C app registration and update `AZURE_AD_B2C_CLIENT_SECRET`
- Or omit the secret to try public-client PKCE (only if the app registration allows public client flows)

### No email on the session / redirected to `/no-access`

- B2C custom policies must emit an email claim (`email`, `emails`, or `signInNames.emailAddress`)
- The signed-in email must exist as a Xians participant with tenant access

### Still landing on `login.microsoftonline.com`

- You still have only `AZURE_AD_*` configured (standard Entra provider)
- Set `AZURE_AD_B2C_CLIENT_ID` + `AZURE_AD_B2C_AUTHORITY` and use the B2C button

## Security notes

1. Prefer a client secret for Agent Studio (confidential client).
2. Use separate secrets (and ideally app registrations) for dev / staging / production.
3. Rotate secrets before they expire.
4. Never commit real client secrets or API keys to git.

## Related

- [Microsoft Entra ID (Azure AD) setup](./MICROSOFT_SSO_SETUP.md)
- [Microsoft Entra External ID / B2C custom domains](https://learn.microsoft.com/en-us/azure/active-directory-b2c/custom-domain)
- [NextAuth.js Azure AD B2C provider (built-in; we use a custom provider for custom domains)](https://next-auth.js.org/providers/azure-ad-b2c)
