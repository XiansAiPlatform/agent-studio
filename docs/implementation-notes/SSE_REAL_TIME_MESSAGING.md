# Real-Time Messaging with Server-Sent Events (SSE)

> **Status**: Complete  
> **Last Updated**: 2026-03-02  
> **Audience**: Developers

## Overview

The application uses Server-Sent Events (SSE) to receive real-time messages from agent activations. This allows users to see agent responses instantly without refreshing the page.

## Architecture

### Components

1. **SSE Hook** (`src/hooks/use-message-listener.ts`)
   - Manages EventSource connection lifecycle
   - Handles reconnection with exponential backoff
   - Listens for message events from the server
   - Provides connection state and error handling

2. **API Proxy** (`src/app/api/tenants/[tenantId]/messaging/listen/route.ts`)
   - Proxies SSE stream from Xians server to browser
   - Handles authentication via NextAuth
   - Manages stream lifecycle and cleanup
   - Gracefully handles client disconnections

3. **Conversations Page** (`src/app/(dashboard)/conversations/page.tsx`)
   - Uses the SSE hook to receive real-time messages
   - Distributes messages to appropriate topics
   - Tracks unread messages per topic
   - Shows toast notifications for new messages

## Event Types

The Xians server sends the following SSE event types:

### `connected`
Initial connection confirmation
```json
{
  "message": "Connected to thread message stream",
  "threadId": "...",
  "tenantId": "...",
  "timestamp": "2026-01-19T18:37:27.161928Z"
}
```

### `Chat`
Chat messages from agent or user
```json
{
  "Id": "...",
  "Direction": "Outgoing",
  "Text": "Hello! How can I assist you today?",
  "ParticipantId": "user@example.com",
  "Scope": "topic-name",
  "CreatedAt": "2026-01-19T18:43:09.074Z",
  ...
}
```

### `Data`
Structured data messages
```json
{
  "Id": "...",
  "Direction": "Outgoing",
  "Data": {...},
  "MessageType": "Data",
  ...
}
```

### `heartbeat`
Keep-alive events (sent every ~30 seconds; also the liveness signal for the reconnect watchdog)
```json
{
  "timestamp": "2026-01-19T18:35:47.782453Z",
  "subscriberCount": 7
}
```

## Message Flow

1. **User sends message** → POST `/api/tenants/{tenantId}/messaging/send`
2. **Message stored** in Xians database
3. **Agent processes** the message
4. **Agent responds** → Creates outgoing message
5. **SSE stream sends** `event: Chat` with message data
6. **Browser receives** event via EventSource
7. **Hook processes** message and calls `onMessage` callback
8. **UI updates** to show new message in conversation

## Connection Management

### Initial Connection
- Established when conversations page loads with agent/activation parameters
- Automatically includes user's participant ID from session

### Reconnection Strategy
- **Exponential backoff**: Starts at 1 second, doubles each attempt, capped at 30 seconds with jitter
- **Max attempts**: 6 attempts, after which the hook keeps retrying once a minute
- **Auto-reconnect**: On connection errors (not on manual close)
- **Heartbeat watchdog**: A stream that receives nothing for 75 seconds is rebuilt even if the browser still reports it `OPEN` (sleep/wake and silently dropped proxy connections never fire an `error` event)
- **Network/visibility triggers**: Reconnects immediately when the browser comes back online or the tab becomes visible, and skips retries entirely while `navigator.onLine` is false

### Recovering Missed Messages
A new stream replays nothing, so anything published during an outage is only
recoverable from history. The listener exposes `onReconnect`, which the
conversation page uses to refetch the current topic and merge it into what is on
screen (`mergeMessagesById`). While the stream is down the page also polls
history every 10 seconds, so an agent reply still lands even if the stream never
recovers.

### Disconnection
- Automatic on page unmount or navigation
- Graceful cleanup of EventSource and timeouts
- No reconnection attempts after manual disconnect

## Message Distribution

Messages are distributed to topics based on the `Scope` field:
- `Scope: null` → "General Discussions" topic
- `Scope: "topic-name"` → Corresponding named topic

Only `Outgoing` messages (from agent) are displayed in the UI. `Incoming` messages (from user) are sent but not shown since the user already sees their sent message via optimistic update.

## Unread Message Tracking

- **Increment**: When message arrives for non-selected topic
- **Clear**: When topic is selected
- **Display**: Badge with count on topic list item
- **Notifications**: Toast notification for new messages

## Error Handling

- **Connection errors**: Logged and trigger reconnection
- **Parse errors**: Logged but don't break connection
- **Stream errors**: Gracefully handled with cleanup
- **Client disconnects**: Silent cleanup on server side
- **Max reconnection attempts**: After 6 failed attempts on a connection that never opened, users are redirected to a dedicated error page

### Server Unavailability Handling

When the SSE connection never opens and the backoff ladder is exhausted (6 attempts: 1s, 2s, 4s, 8s, 16s, 30s), users are automatically redirected to `/server-unavailable`. This page is **outside the dashboard layout** so it remains accessible even when the backend or auth fails.

A stream that *had* been working does not trigger the redirect: dropping a user out of a live conversation over a transient blip is worse than staying put while the background retries and history polling do their job.

**Why outside dashboard?** The dashboard layout requires auth and tenant data. If placed inside `(dashboard)`, the error page would fail to load when the backend is unavailable.

**Page features:**
- Clear error message and troubleshooting tips
- **Try Again** — returns to conversation to retry
- **Go to Dashboard** — safe fallback navigation

**Implementation:** The redirect is triggered by `maxReconnectAttemptsReached` from `useMessageListener`. See `src/app/server-unavailable/page.tsx` and the `useEffect` in conversations page.

## Usage

```typescript
import { useMessageListener } from '@/hooks/use-message-listener';

const {
  isConnected,
  error,
  maxReconnectAttemptsReached,
  hasEverConnected,
  reconnect,
} = useMessageListener({
  tenantId: 'tenant-123',
  agentName: 'Support Agent',
  activationName: 'Live Chat',
  enabled: true,
  onMessage: (message) => {
    console.log('Received:', message);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
  onConnect: () => {
    console.log('Connected');
  },
  onDisconnect: () => {
    console.log('Disconnected');
  },
  onReconnect: () => {
    // Nothing is replayed on a new stream - refetch history to fill the gap
    syncTopicMessages(selectedTopicId);
  },
});

// Redirect to error page only when the stream never came up
useEffect(() => {
  if (maxReconnectAttemptsReached && !hasEverConnected) {
    router.push('/server-unavailable?error=Connection failed');
  }
}, [maxReconnectAttemptsReached, hasEverConnected]);
```

## Configuration

### Heartbeat Interval
30 seconds, sent as the `heartbeatSeconds` query parameter. Kept below common
proxy idle timeouts so the stream is not dropped for being quiet, and it doubles
as the liveness signal for the watchdog.

### Reconnection Settings
- Base delay: 1000ms
- Max attempts: 6, then a 60s retry loop
- Backoff multiplier: 2x, capped at 30s, plus up to 25% jitter
- Stale stream threshold: 75s (2.5 heartbeats)

## Performance Considerations

- **Minimal logging**: Only errors and important events are logged
- **Efficient updates**: State updates use functional form to avoid stale closures
- **Cleanup**: Proper cleanup prevents memory leaks
- **Refs for callbacks**: Prevents unnecessary reconnections when callbacks change

## Security

- **Authentication**: All requests authenticated via NextAuth session
- **Authorization**: User's access token passed to Xians server
- **Tenant isolation**: Messages filtered by tenant ID
- **Participant filtering**: Only receives messages for authenticated user
