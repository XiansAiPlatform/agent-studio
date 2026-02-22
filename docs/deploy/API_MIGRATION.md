# API Type System Migration Guide

This document provides a comprehensive guide for migrating the Agent Studio API routes to use the new robust type system.

## 🎯 Overview

The new type system provides:
- ✅ **Proper NextAuth Session Typing** - No more session access errors
- ✅ **Structured Error Handling** - Consistent error responses
- ✅ **Type Safety** - Full TypeScript coverage for API routes
- ✅ **Response Standardization** - Consistent API response format
- ✅ **Better Developer Experience** - Helper functions and utilities

## 📋 Migration Strategy

### Phase 1: Core Infrastructure ✅
- [x] Created comprehensive type definitions (`src/types/api.ts`)
- [x] Updated `withTenant` wrapper with proper session typing
- [x] ~~Created route helpers (`src/lib/api/route-helpers.ts`)~~ (Removed – app uses `withTenant` from `lib/api/with-tenant` instead)
- [x] Demonstrated migration with connections/initiate route

### Phase 2: Gradual Migration (Recommended Approach)

#### Option A: Update Routes Individually
```typescript
// Old format (causes TypeScript errors)
export const POST = withTenant(async (request, { session, tenantContext }) => {
  const userId = session.user.id  // ❌ TypeScript error
  return NextResponse.json({ message: 'Success' })
})

// New format (type safe)
export const POST = withTenant(createApiRoute(async (request, context) => {
  const userId = getUserId(context)  // ✅ Type safe
  return { message: 'Success' }  // ✅ Auto-wrapped in ApiSuccessResponse
}))
```

#### Option B: Backward Compatible Mode
Create temporary compatibility layer while migrating:

```typescript
// src/lib/api/compat.ts
export function legacyApiHandler(
  handler: (req: NextRequest, ctx: any) => Promise<Response>
) {
  return async (request: NextRequest, context: ApiContext): Promise<Response> => {
    // Convert new context to old format for backward compatibility
    const legacyContext = {
      session: context.session as any,
      tenantContext: context.tenantContext,
      tenantId: context.tenantId
    }
    return handler(request, legacyContext)
  }
}
```

## 🔧 Quick Fixes for Immediate Build Success

### 1. Fix Session Access Patterns (18 files affected)

**Search and Replace Pattern:**
```bash
# Find all session access issues
grep -r "session\.user\." src/app/api/
grep -r "session\.accessToken" src/app/api/
```

**Quick Fix (Type Assertions):**
```typescript
// Before (TypeScript error)
session.user.id
session.user.email  
session.accessToken

// After (Quick fix with type assertions)
(session as any)?.user?.id
(session as any)?.user?.email
(session as any)?.accessToken
```

### 2. Automated Fix Script

```bash
#!/bin/bash
# Quick fix script for session access patterns

find src/app/api -name "*.ts" -exec sed -i '' \
  -e 's/session\.user\.id/(session as any)?.user?.id/g' \
  -e 's/session\.user\.email/(session as any)?.user?.email/g' \
  -e 's/session\.accessToken/(session as any)?.accessToken/g' \
  {} +
```

## 🚀 Proper Migration Steps

### Step 1: Update Route Imports
> **Note:** `route-helpers.ts` was removed. API routes use `withTenant` from `@/lib/api/with-tenant` instead. The helpers below (createApiRoute, getUserId, etc.) are not currently available; implement equivalent logic in your route handlers.
```typescript
// Legacy reference (route-helpers.ts was removed):
// import { createApiRoute, ApiError, getUserId, getUserEmail, ... } from "@/lib/api/route-helpers"
```

### Step 2: Convert Route Handler
```typescript
// Before
export const POST = withTenant(async (request, { session, tenantContext }) => {
  try {
    const data = await request.json()
    const userId = session.user.id
    
    // ... business logic
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
})

// After
export const POST = withTenant(createApiRoute(async (request, context) => {
  const data = await parseRequestBody(request)
  const userId = getUserId(context)
  
  // ... business logic (same)
  
  return { success: true, data: result }  // Auto-wrapped in success response
}))
```

### Step 3: Update Error Handling
```typescript
// Before
if (!data.name) {
  return NextResponse.json({ error: 'Name required' }, { status: 400 })
}

// After
validateRequiredFields(data, ['name'])
// or
if (!data.name) {
  throw ApiError.badRequest('Name required', 'Name field is mandatory')
}
```

## 📁 Files Requiring Migration

### High Priority (Build Blocking)
1. `src/app/api/tenants/[tenantId]/activations/[activationId]/route.ts`
2. `src/app/api/tenants/[tenantId]/agent-activations/[activationId]/deactivate/route.ts`
3. `src/app/api/tenants/[tenantId]/agent-deployments/route.ts`
4. `src/app/api/tenants/[tenantId]/agent-activations/route.ts`

### Medium Priority (Session Access Issues)
- 18 files with `session.user` or `session.accessToken` patterns
- See full list with: `grep -r "session\." src/app/api/ --include="*.ts"`

### Low Priority (Future Enhancement)
- Routes already working but could benefit from new type system
- Non-tenant API routes

## 🛠️ Migration Tools

### 1. Type Safety Checker
```typescript
// Add to any route to verify types
import { ApiContext } from '@/types/api'

function debugTypes(context: ApiContext) {
  console.log('User ID:', context.session.user.id)  // ✅ Type safe
  console.log('Email:', context.session.user.email)  // ✅ Type safe
  console.log('Token:', context.session.accessToken)  // ✅ Type safe
}
```

### 2. Response Format Validator
```typescript
import { createSuccessResponse, createErrorResponse } from '@/types/api'

// Validate response format
const response = createSuccessResponse(data, 'Operation completed')
// Auto-completion and type checking available
```

## 🎯 Recommended Implementation Plan

### Immediate (Get Build Working)
1. Apply quick session access fixes using type assertions
2. Test Docker build success
3. Deploy working version

### Short Term (1-2 days)
1. Migrate 5-10 high-traffic API routes to new system  
2. Create migration script for remaining routes
3. Update documentation

### Long Term (1 week)
1. Complete migration of all API routes
2. Remove backward compatibility code
3. Add comprehensive API testing
4. Documentation and training

## 📈 Benefits After Migration

- **Zero TypeScript Errors** - Complete type safety
- **Consistent Error Handling** - Structured error responses
- **Better Debugging** - Clear error messages and codes
- **Enhanced Security** - Proper session validation
- **Maintainability** - Standard patterns and helpers
- **Developer Productivity** - Auto-completion and type hints

## 🔍 Testing Migration

```bash
# Test individual route
npm run build

# Test specific API endpoint
curl -X POST http://localhost:3000/api/tenants/test/connections/initiate \
  -H "Content-Type: application/json" \
  -d '{"name":"test","providerId":"google","clientId":"test","clientSecret":"test"}'

# Verify response format
{
  "data": {
    "connectionId": "conn_xyz",
    "authUrl": "https://...",
    "state": "..."
  }
}
```

## 💡 Pro Tips

1. **Start Small** - Migrate one route completely before moving to the next
2. **Use Helpers** - Leverage the helper functions for common operations
3. **Test Thoroughly** - Verify both success and error cases
4. **Document Changes** - Update API documentation as you migrate
5. **Keep Backward Compatibility** - Until full migration is complete

## 🚨 Common Gotchas

1. **Response Format** - New system expects structured responses
2. **Error Handling** - Use `ApiError` class instead of direct NextResponse
3. **Session Access** - Use helper functions instead of direct property access  
4. **Type Imports** - Import from `@/types/api` not individual modules

---

This migration provides a robust foundation for type-safe API development while maintaining backward compatibility during the transition period.