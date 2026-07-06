# Local Mode Authentication Setup

> **⚠️ Development only.** Local mode enables a simple email/password login intended for quick local deployments where configuring a full OAuth provider (Google, Microsoft, Keycloak, Visma Connect) is impractical. **Never enable it in a production deployment.**

## Overview

By default, Agent Studio authenticates users through OAuth providers. Setting these up requires provider consoles, client IDs/secrets, and callback URLs, which is overkill when you just want to run the app locally or in a throwaway container.

Local mode adds a NextAuth [`CredentialsProvider`](https://next-auth.js.org/providers/credentials) that authenticates against a static list of email/password pairs supplied via environment variables. It is **off by default** and only registers when explicitly enabled, so normal deployments are unaffected.

Key properties:

- **Env-gated** — the provider only exists when `LOCAL_AUTH_ENABLED=true` and at least one valid user is configured.
- **Multi-user** — configure any number of users in a single variable.
- **No code changes at runtime** — the same production image supports it; you just set env vars.
- **Reuses existing tenant checks** — each configured email still goes through the normal Xians tenant-access validation.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LOCAL_AUTH_ENABLED` | Yes | Must be exactly `true` to enable local login. Any other value keeps it disabled. |
| `LOCAL_AUTH_USERS` | Yes | Comma-separated list of `email:password` pairs. |
| `NEXTAUTH_URL` | Yes | Base URL of the app, e.g. `http://localhost:3000`. |
| `NEXTAUTH_SECRET` | Yes | Session signing secret. Generate with `openssl rand -base64 32`. |
| `XIANS_APIKEY` | Yes | Service API key used for tenant lookups. |
| `XIANS_SERVER_URL` | Yes | Xians backend URL. |

### `LOCAL_AUTH_USERS` format

```env
LOCAL_AUTH_USERS=alice@example.com:password1,bob@example.com:password2
```

- Each entry is `email:password`, entries separated by commas.
- Emails are matched case-insensitively.
- The password may contain any character except a comma (commas separate entries).
- Malformed entries (missing `:`, empty email, or empty password) are skipped with a warning at startup.

## Setup

### Step 1: Add the variables to your environment

For local `npm run dev`, add them to `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Xians backend
XIANS_APIKEY=<your-service-api-key>
XIANS_SERVER_URL=http://localhost:5005

# Local development login (NEVER enable in production)
LOCAL_AUTH_ENABLED=true
LOCAL_AUTH_USERS=admin@example.com:change-me,dev@example.com:change-me-too
```

### Step 2: Start the app

```bash
npm run dev
```

Watch the startup logs for confirmation:

```
[Auth] WARNING: Local credentials login is ENABLED for 2 user(s). Never use this in production.
```

### Step 3: Sign in

1. Navigate to `http://localhost:3010/login`.
2. Below any OAuth buttons you'll see a **Local Development** section with email and password fields.
3. Enter one of the configured email/password pairs and click **Sign in**.
4. You'll be redirected to `/dashboard` (assuming the email has tenant access — see [Tenant access](#tenant-access) below).

## Running via the Docker image

Local mode is read at runtime, so the published `99xio/agent-studio` image supports it with no rebuild — just pass the env vars:

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=<generated-secret> \
  -e XIANS_APIKEY=<your-service-api-key> \
  -e XIANS_SERVER_URL=http://host.docker.internal:5005 \
  -e LOCAL_AUTH_ENABLED=true \
  -e LOCAL_AUTH_USERS=admin@example.com:change-me,dev@example.com:change-me-too \
  99xio/agent-studio:latest
```

Notes:

- Use `host.docker.internal` (instead of `localhost`) in `XIANS_SERVER_URL` when the Xians backend runs on the host machine.
- Production cookies use the `__Secure-` prefix, which browsers accept over `http://localhost`, so no cookie changes are needed for local use.

## Tenant access

Local login only handles *authentication* (proving who you are). *Authorization* is still enforced by the normal tenant-access check:

- On sign-in, the app calls the Xians API (`getParticipantTenants(email)`) using `XIANS_APIKEY`.
- Each configured email **must be a Xians participant with tenant access**, otherwise the user is redirected to `/no-access` or `/enable-tenant`.
- If the tenant check fails because the backend is unreachable, the app falls back to allowing sign-in (so you can still work locally), and re-validates on the next refresh cycle.

The signed-in identity is derived per user: `id` and `email` are set to the login email, and the display `name` is the email's local part (e.g. `admin@example.com` → `admin`).

## Security & limitations

- ⚠️ **Never set `LOCAL_AUTH_ENABLED=true` in production.** Passwords are plaintext env values and there is no rate limiting or account lockout.
- ⚠️ Keep `.env.local` out of version control (it already is via `.gitignore`).
- Local login produces **no OAuth `access_token`**, so `session.accessToken` is `undefined`. Tenant checks and most API routes use `XIANS_APIKEY` + email and are unaffected, but messaging routes that forward `session.accessToken` will send it as undefined.
- Because the provider is omitted entirely when the flag is off, there is no attack surface in a standard deployment — the credentials endpoint simply doesn't exist.

## How it works

- **Provider registration** — `src/app/api/auth/[...nextauth]/route.ts` parses `LOCAL_AUTH_USERS` once at module load into an email→password map and pushes a `CredentialsProvider` (id `local`) only when `LOCAL_AUTH_ENABLED=true` and the map is non-empty.
- **Login UI** — `src/app/(auth)/login/sign-in-form.tsx` fetches available providers via `getProviders()` and renders the email/password form only when the `local` provider is present.

## Troubleshooting

### The Local Development form doesn't appear

- Confirm `LOCAL_AUTH_ENABLED=true` (exact string) and restart the app.
- Confirm `LOCAL_AUTH_USERS` has at least one valid `email:password` entry.
- Check startup logs for `Local credentials login is ENABLED for N user(s)`. If you see `LOCAL_AUTH_ENABLED is true but LOCAL_AUTH_USERS is empty or invalid`, your entries were malformed.

### "Invalid email or password"

- Verify the exact email and password from `LOCAL_AUTH_USERS`. The email is case-insensitive; the password is not.
- Ensure the password contains no commas.

### Signs in but lands on `/no-access`

- The email authenticated but has no tenant access. Add the email as a participant with tenant access in Xians, then sign out and back in. See [Tenant Usage](./TENANT_USAGE.md).

## Related documentation

- [SSO Quick Reference](./SSO_QUICK_REFERENCE.md)
- [Authentication Implementation](./AUTHENTICATION_IMPLEMENTATION.md)
- [Tenant Usage Guide](./TENANT_USAGE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
