# Real-Time Messaging with Server-Sent Events (SSE)

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
Keep-alive events (sent every ~60 seconds)
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
- **Exponential backoff**: Starts at 1 second, doubles each attempt
- **Max attempts**: 5 attempts before giving up
- **Auto-reconnect**: On connection errors (not on manual close)

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
- **Max reconnection attempts**: After 5 failed attempts, users are redirected to a dedicated error page

### Server Unavailability Handling

When the SSE connection fails after maximum reconnection attempts (5 attempts with exponential backoff), the application automatically redirects users to a dedicated server unavailable page (`/server-unavailable`). This page:

- Displays a clear error message explaining the connection failure
- Provides options to retry the connection
- Allows users to navigate to the dashboard
- Includes technical details for troubleshooting

The redirect is triggered by the `maxReconnectAttemptsReached` flag in the `useMessageListener` hook return value.

## Usage

```typescript
import { useMessageListener } from '@/hooks/use-message-listener';

const { isConnected, error, maxReconnectAttemptsReached, reconnect } = useMessageListener({
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
});

// Redirect to error page when max attempts reached
useEffect(() => {
  if (maxReconnectAttemptsReached) {
    router.push('/server-unavailable?error=Connection failed');
  }
}, [maxReconnectAttemptsReached]);
```

## Configuration

### Heartbeat Interval
Default: 60 seconds (configurable via `heartbeatSeconds` query parameter)

### Reconnection Settings
- Base delay: 1000ms
- Max attempts: 5
- Backoff multiplier: 2x

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
