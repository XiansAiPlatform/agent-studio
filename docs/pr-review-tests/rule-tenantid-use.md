# Tenant Id Use

Presentation layer must not pass the tenant id to Next.js api routes. Instead the next js routes should inject the tenant id into xians api by taking it from the serverside auth context.

---

## Why

1. **Security**: A malicious client could spoof `tenantId` in query params or body and attempt to access another tenant's data.
2. **Single source of truth**: The server (session + cookie) decides which tenant is active; the client should not choose per-request.
3. **Xians API**: When calling Xians (e.g. `/api/v1/admin/tenants/{tenantId}/tasks`), the tenant ID must come from validated server-side context, not from the client.

## Correct Flow

1. User selects tenant in UI → `switchTenant('tenant-id')` → `POST /api/user/current-tenant` with body `{ tenantId }`.
2. Server validates access and sets an **httpOnly** cookie (`current-tenant-id`).
3. Subsequent API calls (e.g. `GET /api/tasks`) do **not** include `tenantId` from the frontend.
4. Route uses `withTenantFromSession`, which reads tenant from the cookie, validates, and injects it when calling Xians.

## Implementation Patterns

- **`withTenantFromSession`** — reads tenant from httpOnly cookie (set by `POST /api/user/current-tenant`). Use for most tenant-scoped routes. Admits any tenant member (including plain participants), so the handler must confine work to the caller's own data or add a capability check.
- **`withParticipantAdmin` / `withTenantAdmin` / `withSystemAdmin`** — same cookie-based tenant resolution plus a capability gate. Use for management routes. See [Authorization Model](../auth/authorization-model.md#the-route-wrapper-ladder).
- **Path-based tenant routes** (e.g. `/api/tenants/[tenantId]/...`) — read the tenant from the URL path and **must** call `getTenantContext` to verify membership before serving data, because the backend service key is a SysAdmin key and will not reject a foreign tenant. Example: `src/app/api/tenants/[tenantId]/logo/route.ts`.

## Avoid

- Passing `tenantId` in query params (e.g. `GET /api/tasks?tenantId=xyz`)
- Passing `tenantId` in request body for normal data operations

## Exceptions

These endpoints legitimately accept `tenantId` in the body:

- `POST /api/user/current-tenant` — sets the current-tenant cookie
- `POST /api/tenants/validate` — validates before switching tenant

Routes under `/api/tenants/[tenantId]/...` read the tenant from the path and must validate membership with `getTenantContext`; this is a documented pattern.

## Quick Reference

- Use `withTenantFromSession` for routes that rely on the "current tenant" concept
- Get tenant ID from `tenantContext.tenant.id` or `tenantId` in the handler context
- Do not accept tenant ID from query/body/headers and trust it blindly
