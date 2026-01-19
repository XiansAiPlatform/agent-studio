# Tenant System Implementation

## ✅ Implemented

A minimal, pluggable tenant access control system for API routes.

## Files Created

```
src/
├── types/
│   └── tenant.ts                   # Tenant type definitions
├── lib/
│   ├── tenant/
│   │   ├── index.ts                # Provider factory
│   │   ├── provider.ts             # Interface definition
│   │   └── xians-provider.ts       # Default hardcoded provider
│   └── api/
│       └── with-tenant.ts          # API route wrapper
└── app/api/tenants/
    └── [tenantId]/
        └── agents/
            └── route.ts            # Example usage
```

## How It Works

1. **URL Pattern**: `/api/tenants/{tenantId}/resource`
2. **Automatic extraction**: Tenant ID extracted from URL path
3. **Access validation**: User access checked via provider
4. **Auth token passed**: Session token passed to provider if available

## Usage

### Basic Route
```typescript
import { withTenant } from "@/lib/api/with-tenant"

export const GET = withTenant(async (request, { tenantContext }) => {
  return Response.json({ tenant: tenantContext.tenant })
})
```

### With Permission
```typescript
import { withTenantPermission } from "@/lib/api/with-tenant"

export const POST = withTenantPermission('write', async (request, { tenantContext }) => {
  return Response.json({ success: true })
})
```

## Default Tenants

- `xians-main` - Admin access (read, write, delete, admin)
- `acme-corp` - Member access (read, write)
- `techstart` - Viewer access (read)

## Switching Providers

Edit `src/lib/tenant/index.ts`:

```typescript
export function getTenantProvider(): TenantProvider {
  return new YourCustomProvider()  // Change here
}
```

## API Endpoints

### User Tenants
- `GET /api/user/tenants` - Get all tenants user has access to

### Tenant Resources
- Pattern: `/api/tenants/{tenantId}/{resource}`
- Example: `/api/tenants/xians-main/agents`

## Next Steps

See `docs/auth/TENANT_USAGE.md` for detailed usage guide.
