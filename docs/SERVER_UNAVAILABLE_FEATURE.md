# Server Unavailable Feature

## Overview

This feature provides a graceful user experience when the real-time messaging (SSE) connection to the server fails after multiple reconnection attempts.

## What It Does

When the browser loses connection to the SSE server and fails to reconnect after 5 attempts (with exponential backoff), users are automatically redirected to a dedicated error page that:

- Explains what happened in user-friendly language
- Provides troubleshooting suggestions
- Allows users to retry the connection
- Offers a way to navigate to the dashboard

## Technical Implementation

### 1. Enhanced SSE Hook (`src/hooks/use-message-listener.ts`)

Added `maxReconnectAttemptsReached` to the hook's return value:

```typescript
export interface UseMessageListenerReturn {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
  maxReconnectAttemptsReached: boolean; // NEW
}
```

The flag is set to `true` when:
- The SSE connection fails
- Automatic reconnection attempts reach the maximum (5 attempts)
- Reconnection uses exponential backoff: 1s, 2s, 4s, 8s, 16s

### 2. Server Unavailable Page (`src/app/server-unavailable/page.tsx`)

A dedicated error page **outside the dashboard layout** that displays:
- Error icon and clear messaging
- The specific error message from the connection failure
- Troubleshooting tips for users
- Technical details for developers
- Two action buttons:
  - **Try Again**: Returns to the conversation page to retry connection
  - **Go to Dashboard**: Safe fallback navigation

### 3. Automatic Redirection (`src/app/(dashboard)/conversations/page.tsx`)

Added a `useEffect` that monitors `maxReconnectAttemptsReached`:

```typescript
useEffect(() => {
  if (maxReconnectAttemptsReached) {
    const currentUrl = `/conversations?${searchParams.toString()}`;
    const errorMessage = sseError?.message || 'Failed to establish connection...';
    const params = new URLSearchParams({
      error: errorMessage,
      returnUrl: currentUrl,
    });
    router.push(`/server-unavailable?${params.toString()}`);
  }
}, [maxReconnectAttemptsReached, sseError, searchParams, router]);
```

## User Flow

1. **Normal Operation**: User visits conversations page, SSE connection established
2. **Connection Lost**: Network issue or server goes down
3. **Automatic Reconnection**: Hook attempts to reconnect (5 times with backoff)
4. **Failure Detected**: After 5 failed attempts, `maxReconnectAttemptsReached` becomes `true`
5. **Redirect**: User automatically redirected to `/server-unavailable` with error details
6. **Recovery Options**:
   - User clicks "Try Again" → Returns to conversation, resets attempt counter, tries to reconnect
   - User clicks "Go to Dashboard" → Navigates to safe fallback page

## Benefits

### For Users
- No confusion about why messages aren't updating
- Clear guidance on what to do
- Professional error handling experience
- Easy recovery path

### For Developers
- Centralized error handling
- Easy to debug (error message and returnUrl passed as query params)
- Prevents infinite reconnection loops
- Clean separation of concerns

## Configuration

The reconnection behavior can be adjusted in `use-message-listener.ts`:

```typescript
const maxReconnectAttempts = 5;        // Total attempts before giving up
const baseReconnectDelay = 1000;       // Starting delay (1 second)
// Delay formula: baseReconnectDelay * Math.pow(2, attemptNumber)
```

## Testing

### Manual Testing

To test this feature, you can simulate a server failure:

1. **Start the application** and navigate to a conversation
2. **Stop the backend server** or disconnect from the network
3. **Observe** the console logs showing reconnection attempts
4. **Wait** for ~31 seconds (1s + 2s + 4s + 8s + 16s)
5. **Verify** automatic redirect to `/server-unavailable`
6. **Click "Try Again"** and verify return to conversation
7. **Restart server** and verify successful reconnection

### Development Testing

You can temporarily reduce `maxReconnectAttempts` to 2 for faster testing:

```typescript
// In use-message-listener.ts (temporary change)
const maxReconnectAttempts = 2; // Instead of 5
```

This will trigger the error page in ~3 seconds (1s + 2s).

## Future Enhancements

Potential improvements:
- Add a "Status" page showing backend health
- Implement a notification banner instead of full redirect for less critical failures
- Add metrics/logging to track connection reliability
- Provide admin controls for reconnection settings
- Add websocket fallback mechanism

## Important Notes

### Why Outside the Dashboard Layout?

The `/server-unavailable` page is intentionally placed at `/src/app/server-unavailable/` **outside** the `(dashboard)` folder. This is critical because:

1. **The dashboard layout requires authentication** - If placed inside `(dashboard)`, it would require a valid session
2. **The dashboard layout fetches tenant data** - This would fail if the backend is unavailable
3. **Independent accessibility** - The error page needs to be accessible even when the dashboard layout fails to load

This ensures users can always see the error page, regardless of authentication or backend availability issues.

## Related Files

- `/src/hooks/use-message-listener.ts` - SSE connection management
- `/src/app/server-unavailable/page.tsx` - Error page UI (outside dashboard layout)
- `/src/app/(dashboard)/conversations/page.tsx` - Redirect logic
- `/docs/SSE_REAL_TIME_MESSAGING.md` - SSE documentation
- `/src/components/backend-unavailable.tsx` - Existing backend error component (different use case)
