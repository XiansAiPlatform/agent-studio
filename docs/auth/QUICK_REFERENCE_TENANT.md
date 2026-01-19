# Tenant System Quick Reference

## Client-Side (React Components)

### Get Current Tenant

```typescript
'use client'
import { useTenant } from '@/hooks/use-tenant'

const { currentTenant, currentTenantId } = useTenant()
```

### Access All Tenants

```typescript
const { tenants } = useTenant()

tenants.forEach(t => {
  console.log(t.tenant.name, t.role)
})
```

### Switch Tenant

```typescript
const { switchTenant } = useTenant()

switchTenant('xians-main')
```

### Check Loading State

```typescript
const { isLoading } = useTenant()

if (isLoading) return <Spinner />
```

## Server-Side (API Routes)

### Protected Tenant Route

```typescript
// app/api/tenants/[tenantId]/resource/route.ts
import { withTenant } from '@/lib/api/with-tenant'

export const GET = withTenant(async (request, { tenantContext }) => {
  // tenantContext.tenant - Tenant object
  // tenantContext.userRole - User's role
  // tenantContext.permissions - User's permissions
  
  return Response.json({ data: 'protected' })
})
```

### With Permission Check

```typescript
import { withTenantPermission } from '@/lib/api/with-tenant'

export const POST = withTenantPermission('write', 
  async (request, { tenantContext }) => {
    return Response.json({ success: true })
  }
)
```

## LocalStorage

Current tenant persisted automatically:

```javascript
localStorage.getItem('tenant-storage')
// {"state":{"currentTenantId":"xians-main"},"version":0}
```

## Available Tenants (Default)

| ID | Name | Default Role |
|----|------|--------------|
| `xians-main` | Xians Company | admin |
| `acme-corp` | Acme Corporation | member |
| `techstart` | TechStart Inc | viewer |

## Common Patterns

### Conditional Render by Tenant

```typescript
const { currentTenant } = useTenant()

{currentTenant?.role === 'admin' && (
  <AdminPanel />
)}
```

### Display Tenant Name

```typescript
const { currentTenant } = useTenant()

<h1>{currentTenant?.tenant.name || 'No tenant'}</h1>
```

### Make Tenant-Scoped API Call

```typescript
const { currentTenantId } = useTenant()

const response = await fetch(
  `/api/tenants/${currentTenantId}/agents`
)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/tenants` | GET | Get all user's tenants |
| `/api/tenants/{tenantId}/agents` | GET | Get tenant's agents |
| `/api/tenants/{tenantId}/agents` | POST | Create agent (requires 'write') |
