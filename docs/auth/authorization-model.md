# Authorization Model

> **Status**: Complete
> **Last Updated**: 2026-07-04
> **Audience**: Developers, DevOps

## Overview

Agent Studio is a **Backend-for-Frontend (BFF)**. The browser never talks to the
Xians platform (`XiansAi.Server`) directly. Every browser request hits a Next.js
API route, and that route calls the Xians **AdminApi** (`/api/v1/admin/...`) using
a single service credential, `XIANS_APIKEY`.

The single most important fact about this system's security:

> **The Next.js API routes are the sole and complete per-user authorization
> boundary. The Xians backend does not enforce the end user's role or tenant — it
> trusts the service API key.**

If a Next.js route forgets to check authorization, it exposes an admin-key-backed,
tenant-wide operation to whoever can reach the route. This document explains why,
and the invariants that keep it safe.

---

## The Trust Model

```
Browser ──(NextAuth session cookie)──▶ Next.js API route ──(XIANS_APIKEY)──▶ Xians AdminApi
   user identity + current tenant        AUTHORIZATION GATE        trusts the key, runs as
   (httpOnly cookies)                     (per-user checks)         the key creator's identity
```

### Why the backend is not a per-user gate

The Xians AdminApi authenticates the **API key**, not the Agent Studio end user.
When a request arrives with `Authorization: Bearer sk-Xnai-...`, the backend:

1. Looks up the key and reads its **creator** (`apiKey.CreatedBy`) and the key's
   own tenant (`apiKey.TenantId`).
2. Resolves roles for the **key creator**, not for the person using Agent Studio.
3. **Denies the request unless the key creator is `SysAdmin` or `TenantAdmin`.**

The end user's email and OAuth token are **never transmitted to the backend** and
play no part in backend authorization. (Agent Studio does pass an `authToken` into
its Xians client wrapper, but the AdminApi ignores it — it only reads the API key.)

### Consequence: `XIANS_APIKEY` is a platform superuser credential

Agent Studio needs cross-tenant reach — the tenant switcher lists every tenant, the
`/system-admin` area manages all tenants, and role lookups query arbitrary emails.
All of this only works if `XIANS_APIKEY` was created by a **`SysAdmin`**. For a
SysAdmin key, the backend allows targeting **any tenant** named in the request, and
every backend role/ownership check passes (they evaluate the SysAdmin key creator).

Treat `XIANS_APIKEY` accordingly:

- It grants **platform-wide SysAdmin** over every tenant.
- Keep it **server-only** — it must never be sent to the browser (it currently is
  read only in server code and never serialized into any client payload).
- Restrict who can read the environment/secret store, rotate it periodically, and
  alert on anomalous use.

---

## Roles and Capabilities

### Backend roles (source of truth)

Roles are **never trusted from the JWT**. They are fetched live from the backend
(`GET /api/v1/admin/participants/{email}` via `getParticipantTenants`) on sign-in,
on a 30-minute JWT refresh, and whenever a route resolves capabilities.

| Backend identifier | UI label | Scope |
|--------------------|----------|-------|
| `SysAdmin` | System Admin | Global flag (`isSystemAdmin`), not a tenant role |
| `TenantAdmin` | Tenant Admin | Per-tenant |
| `TenantUser` | Developer | Per-tenant |
| `TenantParticipantAdmin` | Participant Admin | Per-tenant |
| `TenantParticipant` | Participant | Per-tenant |

### Capabilities (what routes and UI actually check)

Backend roles are coarse. Agent Studio maps them **once**, in
`src/lib/auth/capabilities.ts`, into fine-grained capabilities. Every guard checks
a capability, not a role string. Capabilities are safe to send to the client; the
raw participant role is not (it stays server-side).

| Capability | Granted to |
|------------|-----------|
| `app:use-full-layout` | TenantUser, TenantParticipantAdmin, TenantAdmin, SysAdmin |
| `settings:view` | TenantUser, TenantParticipantAdmin, TenantAdmin, SysAdmin |
| `developer:access` | TenantUser, TenantParticipantAdmin, TenantAdmin, SysAdmin |
| `theme:customize` | TenantUser, TenantParticipantAdmin, TenantAdmin, SysAdmin |
| `tenant:manage-users` | TenantAdmin, SysAdmin |
| `system:admin` | SysAdmin |

A plain **`TenantParticipant` has no capabilities** — they get the chat-only layout
and must never reach management operations.

Capability resolution is centralized in `src/lib/auth/server-capabilities.ts`
(`resolveCapabilities`). It **fails closed**: an unidentifiable user or a backend
error yields an empty capability set.

---

## The Route Wrapper Ladder

Every API route under `src/app/api/**` must use one of these wrappers (defined in
`src/lib/api/with-tenant.ts`), or perform an equivalent manual `getServerSession`
check. They form a strict ladder from least to most privileged.

| Wrapper | Allows | Use for |
|---------|--------|---------|
| `withTenantFromSession` | Any approved tenant member (**including `TenantParticipant`**) | Participant-facing routes that operate only on the caller's own data |
| `withParticipantAdmin` | `settings:view` (TenantUser / ParticipantAdmin / TenantAdmin / SysAdmin) | Agent Settings **and** tenant-wide workspace management (knowledge, schedules, webhooks, activation mutations, task review, stats) |
| `withTenantAdmin` | `tenant:manage-users` (TenantAdmin / SysAdmin) | Tenant user management, branding, OIDC |
| `withSystemAdmin` | `system:admin` (SysAdmin), verified by a fresh backend lookup | Everything under `/api/system-admin/*` |

### `withTenantFromSession` is member-level — guard the data, not just the door

Because `withTenantFromSession` admits a plain participant, any route using it
**must** confine the operation to the caller's own resources by deriving the
participant identity server-side from the session — never from a client parameter.

Correct pattern (participant can only touch their own messages/tasks):

```ts
const participantId = session.user?.email      // server-derived identity
// forward participantId to the backend; never read it from the query/body
```

If a route using `withTenantFromSession` needs a tenant-wide or another-user view,
it must add an explicit capability check before performing it. Example from
`src/app/api/tasks/route.ts` — "my tasks" is open, but the tenant-wide "everyone"
view and single-task-by-id fetch require `settings:view`:

```ts
const isOwnTasksView = viewType === 'my' && !taskId
if (!isOwnTasksView) {
  const authError = await requireParticipantAdmin(session, cookieTenantId)
  if (authError) return authError
}
```

---

## Tenant Resolution

The active tenant is **always resolved server-side** from the httpOnly
`current-tenant-id` cookie (set by `POST /api/user/current-tenant` after a
membership check). The client must never choose the tenant per request.

Two invariants enforce this:

1. **`rejectClientTenantId`** — cookie-scoped wrappers reject any request that
   carries a `tenantId` in the query string, an `x-tenant-id` header, or the
   request body (JSON **and** form-encoded, so it can't be smuggled by switching
   Content-Type). The client cannot supply a different tenant.
2. **Membership validation** — `getTenantContext` (in
   `src/lib/tenant/xians-provider.ts`) confirms the user is a member of (or a
   SysAdmin for) the resolved tenant before any data is returned.

### Path-based tenant IDs need an explicit membership check

The one route that reads a tenant ID from the URL path,
`GET /api/tenants/[tenantId]/logo`, cannot rely on the cookie, so it calls
`getTenantContext` itself and returns 403 for non-members. Any future route that
takes a tenant ID from the path must do the same — otherwise, because the service
key is a SysAdmin key, the backend will happily serve the other tenant.

### The backend will not save you from a wrong tenant ID

The AdminApi's `TenantRouteScopeFilter` rejects a request whose route `{tenantId}`
disagrees with the tenant resolved during authentication. But for a **SysAdmin
service key**, the resolved tenant is whatever the request supplied, so the route
tenant always "matches." That filter mainly blocks a mixed query-vs-route trick and
locks *TenantAdmin* keys to their own tenant; it provides **no cross-tenant
protection for our SysAdmin key**. Cross-tenant safety for end users therefore
rests entirely on the two invariants above.

---

## Middleware

`middleware.ts` gates page navigation (not API routes):

- All matched routes require a valid session.
- `/settings/*` and `/knowledge/*` require `settings:view`.
- `/system-admin/*` requires `system:admin`.

Page guards are a usability layer (they redirect early). They are **not** the
security boundary — the API route wrappers are. `/tenant-settings` and `/developer`
are guarded by their server layouts rather than middleware.

---

## Invariants (Do Not Break These)

1. **Every API route has an authorization gate.** No route under `src/app/api/**`
   may run without a wrapper or an equivalent manual session/capability check. The
   only exceptions are the public allowlist (`health`, `auth`).
2. **`withTenantFromSession` routes force server-derived participant identity** and
   never trust a client-supplied `participantId`, `viewType=all`, or arbitrary id
   for another user's resource.
3. **Tenant ID is server-resolved.** Never accept `tenantId` from the client for
   data operations; `rejectClientTenantId` must stay in the cookie-scoped wrappers.
   Path-based tenant routes must call `getTenantContext`.
4. **Capability resolution fails closed.** A backend error must never widen access.
5. **`XIANS_APIKEY` stays server-only** and is treated as a platform superuser
   secret.

### Automated guard

`npm run check:auth` (`scripts/check-route-auth.mjs`) fails the check if any API
route lacks a detectable authorization gate. It is a coarse guardrail — it confirms
a route has *some* gate, not that the gate is the correct strength; wrapper choice
still needs review. Run it in CI and before merging any change that adds routes.

### Review checklist for new API routes

- [ ] Picks the correct wrapper from the ladder (default to the **most** restrictive
      that still works).
- [ ] If using `withTenantFromSession`, the operation is limited to the caller's own
      resources via server-derived identity.
- [ ] Does not read `tenantId` (or `participantId`) from the client.
- [ ] `npm run check:auth` passes.

---

## Known Limitations

- **No backend *role* backstop for the end user.** The AdminApi authorizes the API
  **key creator** (a SysAdmin) and never resolves the Agent Studio end user's role,
  so the BFF remains the authoritative gate for *who may perform an operation*. A
  future improvement would have Agent Studio forward the authenticated end user's
  identity and the AdminApi resolve *that user's* role for the target tenant. This
  is an architectural change spanning both repositories.
- **Per-*resource*-owner checks DO exist on the backend for the credential
  endpoints** (verified in `XiansAi.Server` `Features/AdminApi`). This is a genuine
  second line of defense for those routes, so the BFF is not the *only* thing
  standing between a user and another user's credentials:
  - Admin API keys — `AdminApiKeyService` scopes get/revoke/rotate to keys whose
    `created_by` equals the `userId` the BFF sends.
  - Agent certificates — `CertificateService.RevokeCertificateAsync` requires the
    certificate's `IssuedTo` **and** `TenantId` to match.
  - `AdminApiKeyEndpoints.CanActOnBehalfOf` additionally forbids a non-SysAdmin
    caller from targeting another `userId`.

  Because the BFF forwards `userId = session.user.email` (server-derived, never
  from the client), these checks mean a tenant member cannot revoke/rotate/read
  another member's keys or certificates even by guessing an id. Any new route that
  forwards a resource id to these endpoints **must keep passing the session-derived
  `userId`** — the backend ownership check is keyed on it.
- **Secret values are never exposed through the AdminApi.** Every admin secret
  endpoint returns value-redacted metadata only (list/get/fetch return metadata;
  create/update responses are stripped via `RedactValue`). Only the cert-authenticated
  AgentApi returns secret values. So `settings:view` users managing secrets in the UI
  can see keys/metadata but never the stored secret material.
- **`messaging/files/[fileId]`** relies on the backend enforcing tenant isolation on
  stored files and is scoped to the current tenant, but has no per-participant
  ownership check. Enforcing per-participant access requires backend support.

---

## Related Documentation

- [Authentication Implementation](./AUTHENTICATION_IMPLEMENTATION.md) — NextAuth flow and code structure
- [Tenant Implementation](./TENANT_IMPLEMENTATION.md) — how tenant validation works
- [Tenant Id Use](../pr-review-tests/rule-tenantid-use.md) — the client-must-not-send-tenantId rule
- [Xians API Access](../pr-review-tests/rule-api-access.md) — presentation layer must call Next.js routes, not Xians directly
