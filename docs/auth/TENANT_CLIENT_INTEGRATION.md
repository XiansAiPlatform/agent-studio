# Tenant Client Integration

## Overview

The tenant system is now integrated with the user interface with localStorage persistence for the selected tenant.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Menu UI                          │
│                   (user-menu.tsx)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   useTenant() Hook                           │
│                (hooks/use-tenant.ts)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ manages
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Zustand Tenant Store                          │
│              (store/tenant-store.ts)                        │
│                                                             │
│  - Persists currentTenantId to localStorage                │
│  - Holds tenants array in memory                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ fetches from
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            GET /api/v1/user/tenants                          │
│         (api/v1/user/tenants/route.ts)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Tenant Provider                             │
│              (lib/tenant/xians-provider.ts)                 │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### Created Files

1. **`src/store/tenant-store.ts`**
   - Zustand store for tenant state management
   - Persists `currentTenantId` to localStorage
   - Auto-selects first tenant if none selected

2. **`src/app/api/v1/user/tenants/route.ts`**
   - API endpoint to fetch user's tenants
   - Returns list of tenants with user's role in each

3. **`src/hooks/use-tenant.ts`**
   - Client-side hook for tenant management
   - Auto-fetches tenants on authentication
   - Provides tenant switching functionality

### Modified Files

4. **`src/components/layout/user-menu.tsx`**
   - Replaced mock data with real tenant data
   - Integrated with `useTenant()` hook
   - Shows loading state while fetching

## Usage

### Access Current Tenant Anywhere

```typescript
'use client'
import { useTenant } from '@/hooks/use-tenant'

export function MyComponent() {
  const { currentTenant, currentTenantId, tenants } = useTenant()
  
  if (!currentTenant) {
    return <div>No tenant selected</div>
  }
  
  return (
    <div>
      <h1>{currentTenant.tenant.name}</h1>
      <p>Your role: {currentTenant.role}</p>
    </div>
  )
}
```

### Switch Tenant Programmatically

```typescript
'use client'
import { useTenant } from '@/hooks/use-tenant'

export function TenantSwitcher() {
  const { tenants, switchTenant, currentTenantId } = useTenant()
  
  return (
    <select 
      value={currentTenantId || ''} 
      onChange={(e) => switchTenant(e.target.value)}
    >
      {tenants.map((t) => (
        <option key={t.tenant.id} value={t.tenant.id}>
          {t.tenant.name} ({t.role})
        </option>
      ))}
    </select>
  )
}
```

## LocalStorage

The selected tenant is persisted to localStorage:

```javascript
// Key: tenant-storage
{
  "state": {
    "currentTenantId": "xians-main"
  },
  "version": 0
}
```

This ensures the user's tenant selection persists across page reloads.

## Flow

1. **User logs in** → Session created
2. **useTenant hook** → Detects authentication
3. **Fetch tenants** → GET `/api/v1/user/tenants`
4. **Store in Zustand** → Update store with tenants
5. **Auto-select** → First tenant if none in localStorage
6. **Persist** → Save `currentTenantId` to localStorage
7. **User switches** → Update store & localStorage
8. **Next visit** → Read from localStorage

## API Response Format

```json
{
  "tenants": [
    {
      "tenant": {
        "id": "xians-main",
        "name": "Xians Corporation",
        "slug": "xians"
      },
      "role": "admin"
    },
    {
      "tenant": {
        "id": "acme-corp",
        "name": "Acme Corporation",
        "slug": "acme"
      },
      "role": "member"
    }
  ],
  "userId": "user-123"
}
```

## Testing

1. **Login** to the application
2. **Open user menu** (top-right corner)
3. **See current workspace** displayed
4. **Click "Switch Workspace"**
5. **Select different tenant**
6. **Refresh page** → Selection persists
7. **Check localStorage** → `tenant-storage` key contains selection

## Future Enhancements

- Add tenant switching event notifications
- Implement tenant-specific data refetching on switch
- Add tenant context to all API calls automatically
- Add tenant branding/theming support
