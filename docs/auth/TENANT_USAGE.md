# Tenant System Usage Guide

## Overview

The tenant system provides automatic tenant resolution and access control for your API routes.

## API Route Pattern

All tenant-scoped APIs follow this simple pattern:
```
/api/tenants/{tenantId}/resource
```

## Quick Start

### 1. Basic Usage

```typescript
import { withTenant } from "@/lib/api/with-tenant"

export const GET = withTenant(async (request, { tenantContext, session }) => {
  // tenantContext.tenant - The tenant object
  // tenantContext.userRole - User's role (owner/admin/member/viewer)
  // tenantContext.permissions - User's permissions array
  
  return Response.json({
    tenant: tenantContext.tenant.name,
    role: tenantContext.userRole
  })
})
```

### 2. With Permission Check

```typescript
import { withTenantPermission } from "@/lib/api/with-tenant"

export const POST = withTenantPermission('write', async (request, { tenantContext }) => {
  const data = await request.json()
  // Only users with 'write' permission can access this
  
  return Response.json({ success: true })
})
```

## Default Tenants (Xians Provider)

The system includes these hardcoded tenants:

| Tenant ID | Name | Default Role | Permissions |
|-----------|------|--------------|-------------|
| `xians-main` | Xians Company | admin | read, write, delete, admin |
| `acme-corp` | Acme Corporation | member | read, write |
| `techstart` | TechStart Inc | viewer | read |

## Testing

Test with curl:

```bash
# GET agents (requires authentication)
curl -X GET \
  http://localhost:3010/api/tenants/xians-main/agents \
  -H "Cookie: your-session-cookie"

# POST agent (requires 'write' permission)
curl -X POST \
  http://localhost:3010/api/tenants/xians-main/agents \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Agent"}'
```

## Custom Implementation

To implement your own tenant provider:

1. Create a new class implementing `TenantProvider` interface
2. Update `src/lib/tenant/index.ts` to return your provider

```typescript
// src/lib/tenant/custom-provider.ts
import { TenantProvider } from "./provider"

export class CustomProvider implements TenantProvider {
  async getTenantContext(userId, tenantId, authToken) {
    // Your implementation
  }
  
  async getTenant(tenantId, authToken) {
    // Your implementation
  }
  
  async getUserTenants(userId, authToken) {
    // Your implementation
  }
}

// src/lib/tenant/index.ts
export function getTenantProvider(): TenantProvider {
  return new CustomProvider()  // Change this line
}
```

## Error Responses

| Status | Error | Meaning |
|--------|-------|---------|
| 401 | Unauthorized | User not logged in |
| 400 | Tenant ID not found | Invalid URL format |
| 403 | Access denied to this tenant | User has no access |
| 403 | Permission denied | User lacks required permission |
