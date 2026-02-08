# Duplicate API Calls Fix

## Problem
When refreshing `http://localhost:3010/dashboard`, multiple duplicate API calls were being made:
- `validate` (called 2x)
- `session` (called 2x)
- `agent-activations` (called 2x)
- `stats?startDate=...&endDate=...` (called 2x with slightly different timestamps)
- `logs?pageSize=10&page=1` (called 2x)

## Root Cause
The issue was caused by **React Strict Mode** in Next.js development environment, which deliberately mounts components twice to help detect side effects. This caused all `useEffect` hooks to run twice, triggering duplicate API calls.

## Solution Applied
Implemented **request deduplication** and **AbortController** pattern across all affected hooks and components:

### 1. Dashboard Layout Client (`src/app/(dashboard)/layout-client.tsx`)
- Added `useRef` to track initialization state
- Added `AbortController` to cancel duplicate validation requests
- Implemented cleanup function to abort requests on unmount
- Now only runs validation once, even in Strict Mode

### 2. useAgents Hook (`src/app/(dashboard)/agents/running/hooks/use-agents.ts`)
- Added `AbortController` to cancel pending requests when tenant changes
- Implemented proper cleanup function
- Handles abort errors gracefully
- Prevents duplicate `agent-activations` API calls

### 3. useLogs Hook (`src/app/(dashboard)/settings/logs/hooks/use-logs.ts`)
- Added `AbortController` signal parameter to `fetchLogs` function
- Implemented cleanup function in `useEffect`
- Handles abort errors gracefully
- Prevents duplicate `logs` API calls

### 4. Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)
- Added `AbortController` to stats fetch
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `stats` API calls

### 5. Tasks Page (`src/app/(dashboard)/tasks/page.tsx`)
- Added `AbortController` to both `fetchActivations` and `fetchTasks`
- **Fixed dependency cycle**: Removed `tasks` from activations useEffect dependencies
- Implemented cleanup functions for both fetches
- Handles abort errors gracefully
- Prevents duplicate `activations` and `tasks` API calls

### 6. Conversations useActivations Hook (`src/app/(dashboard)/conversations/hooks/use-activations.ts`)
- Added `AbortController` to cancel duplicate requests
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `agent-activations` calls from "Select an Agent" panel

### 7. Performance useActivations Hook (`src/app/(dashboard)/settings/performance/hooks/use-activations.ts`)
- Added `AbortController` to cancel duplicate requests
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `agent-activations` calls

### 8. Conversations useTopics Hook (`src/app/(dashboard)/conversations/hooks/use-topics.ts`)
- Added `AbortController` to cancel duplicate requests
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `topics` API calls on conversation pages

### 9. Agent Store useAgentDeployments Hook (`src/app/(dashboard)/settings/agent-store/hooks/use-agent-deployments.ts`)
- Added `AbortController` to cancel duplicate requests
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `agent-deployments` API calls on agent store page

### 10. Knowledge Page (`src/app/(dashboard)/knowledge/page.tsx`)
- Added `AbortController` to cancel duplicate requests
- Implemented cleanup function in useEffect
- **Fixed infinite loop**: Removed `isLoading` and `lastFetchedParams` from dependencies
- Handles abort errors gracefully
- Prevents duplicate `knowledge` API calls on knowledge page

### 11. Database useDataSchema Hook (`src/app/(dashboard)/settings/database/hooks/use-data-schema.ts`)
- Added `AbortController` to cancel duplicate requests
- **Added parameter tracking ref** to prevent duplicate fetches with same params
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `schema` API calls on database page

### 12. Connections useIntegrationTypes Hook (`src/app/(dashboard)/settings/connections/hooks/use-integration-types.ts`)
- Added `AbortController` to cancel duplicate requests
- **Added fetch tracking ref** to prevent multiple fetches
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `types` API calls (was 4x!)

### 13. Connections useConnections Hook (`src/app/(dashboard)/settings/connections/hooks/use-connections.ts`)
- Added `AbortController` to cancel duplicate requests
- **Restructured to use direct useEffect** (eliminated callback dependency issues)
- **Used `useMemo` for stable optionsKey**
- **Added parameter tracking ref** to prevent duplicate fetches
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `integrations` API calls

### 14. Logs Page Activations Fetch (`src/app/(dashboard)/settings/logs/page.tsx`)
- Added `AbortController` to cancel duplicate requests
- **Added fetch tracking ref** to prevent multiple fetches
- Implemented cleanup function
- Handles abort errors gracefully
- Prevents duplicate `activations` API calls on logs page

## Key Changes Pattern
All changes follow a consistent pattern:

```typescript
useEffect(() => {
  const abortController = new AbortController();

  const fetchData = async () => {
    try {
      const response = await fetch(url, {
        signal: abortController.signal,
      });
      // ... handle response
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      // ... handle other errors
    }
  };

  fetchData();

  // Cleanup function
  return () => {
    abortController.abort();
  };
}, [dependencies]);
```

## Testing Instructions

1. **Open Browser DevTools**
   - Press F12 or right-click → Inspect
   - Go to Network tab
   - Filter by "Fetch/XHR"

2. **Clear Network Log**
   - Click the clear button (🚫) in Network tab

3. **Refresh the Dashboard**
   - Navigate to `http://localhost:3010/dashboard`
   - Press Ctrl+Shift+R (hard refresh)

4. **Verify Results**
   You should now see:
   - ✅ Each API endpoint called only **once** (not twice)
   - ✅ Some requests may show as "cancelled" - this is normal and expected
   - ✅ No duplicate timestamps in stats calls

## What About Session Calls?
The `session` API calls come from NextAuth's `useSession` hook. These are handled by NextAuth's internal request deduplication and are expected behavior. The SessionProvider is configured with:
- `refetchOnWindowFocus: true` - Refetch when window gains focus
- `refetchInterval: 5 * 60` - Refetch every 5 minutes

If you're seeing duplicate session calls, they might be legitimate due to:
- Window focus events
- NextAuth's internal retry logic
- Multiple components using `useSession` (but NextAuth deduplicates these internally)

## Additional Notes

### Why Not Disable Strict Mode?
React Strict Mode is beneficial for development as it helps identify:
- Unsafe side effects
- Deprecated APIs
- Unexpected side effects

Instead of disabling it, we implemented proper cleanup functions, which is the recommended approach.

### Production Behavior
In production builds, React Strict Mode is automatically disabled, so you wouldn't see these duplicate calls in production. However, implementing proper cleanup is still important for:
- Component unmounting scenarios
- Dependency changes triggering new requests
- User navigation away from pages

## Files Modified
1. `src/app/(dashboard)/layout-client.tsx`
2. `src/app/(dashboard)/agents/running/hooks/use-agents.ts`
3. `src/app/(dashboard)/settings/logs/hooks/use-logs.ts`
4. `src/app/(dashboard)/dashboard/page.tsx`
5. `src/app/(dashboard)/tasks/page.tsx`
6. `src/app/(dashboard)/conversations/hooks/use-activations.ts`
7. `src/app/(dashboard)/settings/performance/hooks/use-activations.ts`
8. `src/app/(dashboard)/conversations/hooks/use-topics.ts`
9. `src/app/(dashboard)/settings/agent-store/hooks/use-agent-deployments.ts`
10. `src/app/(dashboard)/knowledge/page.tsx`
11. `src/app/(dashboard)/settings/database/hooks/use-data-schema.ts`
12. `src/app/(dashboard)/settings/connections/hooks/use-integration-types.ts`
13. `src/app/(dashboard)/settings/connections/hooks/use-connections.ts`
14. `src/app/(dashboard)/settings/logs/page.tsx`

## Verification
After implementing these changes, you should see:
- Reduced network traffic
- Faster page loads
- Better resource management
- Proper request cancellation when navigating away
