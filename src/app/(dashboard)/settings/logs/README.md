# Agent Logs Page

## Overview

The Agent Logs page (`/settings/logs`) provides a comprehensive interface for browsing and filtering workflow execution logs created by agents.

The page uses a **two-step "streams → logs" flow**:

1. By default it shows a paginated list of **log streams** (distinct workflows that have produced logs), sorted by most recent activity.
2. Selecting a stream drills in and shows the **logs** belonging to that stream's `workflowId`.

This avoids loading thousands of unrelated log entries up front and gives operators a workflow-oriented entry point for debugging.

## Features

### 1. Streams view (default)

- Paginated list of distinct workflow streams (20 per page).
- Each stream row shows:
  - Last log level badge (color-coded)
  - Last log message
  - Agent and activation
  - Workflow type
  - Total log count for the stream
  - Relative time since last log
  - Workflow ID (monospace, truncated)
- Click any stream to drill into its logs.

### 2. Logs view (drilled-in)

- Activated when a `workflowId` is set in the URL.
- Shows logs for the selected stream only (paginated 20 per page).
- "Streams" back button returns to the streams list.
- Each log entry shows:
  - Log level badge (Error, Warning, Information, Debug, Trace)
  - Message text
  - Timestamp (relative and absolute)
  - Agent name and activation name
  - Participant ID (if present)
  - Workflow type
  - Expandable details (exception, properties, workflow IDs)

### 3. Filtering

Filters apply to **both** the streams list and the drilled-in logs list.

Primary filter: **Activation Name** (grouped by agent)

- Collapsible tree structure
- Search functionality
- Shows active/inactive status

Additional filters:

- **Log Level**: Multi-select (Error, Warning, Information, Debug, Trace)
- **Date Range**: Presets (Last hour, 24h, 7d, 30d) + custom range
- All filters are URL-based for sharing and bookmarking.

### 4. Pagination

- Previous/Next buttons.
- Displays current page, total pages, and total count.
- Page number is preserved in the URL.
- Page resets to 1 when entering or leaving the drilled-in logs view.

### 5. Security

- `tenantId` is extracted **server-side** from the authenticated session's `current-tenant-id` httpOnly cookie. The frontend never sends it.
- `participantId` filtering is NOT exposed to the frontend (server-side only).
- All API calls are authenticated via the `withParticipantAdmin` middleware.

## Architecture

### File structure

```
src/app/(dashboard)/settings/logs/
├── page.tsx                          # Orchestrator: switches between streams & logs view
├── types.ts                          # TypeScript definitions (LogEntry, LogStream, ...)
├── hooks/
│   ├── use-logs.ts                   # Fetches paginated logs for a stream
│   └── use-log-streams.ts            # Fetches paginated log streams
└── components/
    ├── log-list-item.tsx             # Individual log entry
    ├── log-stream-list-item.tsx      # Individual stream row (clickable)
    └── log-filter-slider.tsx         # Filter sidebar

src/app/api/logs/
├── route.ts                          # GET /api/logs - proxy for logs (filtered by workflowId)
└── streams/
    └── route.ts                      # GET /api/logs/streams - proxy for stream listing
```

### Data flow

```
User → URL params → Page Component
                       │
                       ├─► useLogStreams ─► GET /api/logs/streams ─► Xians Admin API (streams)
                       │   (default)
                       │
                       └─► useLogs ──────► GET /api/logs ─────────► Xians Admin API (logs)
                           (when workflowId is set)

Filter Slider updates URL params → re-renders both queries
```

## API integration

### Backend endpoints (Xians AdminApi)

- `GET /api/v1/admin/tenants/{tenantId}/logs/streams` — list distinct streams
- `GET /api/v1/admin/tenants/{tenantId}/logs` — list logs (typically filtered by `workflowId`)

### Frontend API routes (Next.js)

- `GET /api/logs/streams` — proxies to the streams endpoint, injects tenant from session.
- `GET /api/logs` — proxies to the logs endpoint, injects tenant from session.

### Query parameters (forwarded by both proxies)

- `agentName`
- `activationName`
- `workflowType`
- `logLevel` (comma-separated)
- `startDate` (ISO 8601)
- `endDate` (ISO 8601)
- `pageSize` (default: 20, max: 100)
- `page` (default: 1)

Logs proxy additionally accepts:

- `workflowId` — narrow logs to a single stream

Server automatically adds:

- `tenantId` — from authenticated session (httpOnly cookie)
- `participantId` — NOT exposed to the frontend

## URL state management

Streams view example:

```
/settings/logs?logLevel=Error,Warning&startDate=2026-01-20T00:00:00Z&page=2
```

Drilled-in logs view example:

```
/settings/logs?workflowId=my-workflow-abc-123&logLevel=Error&page=1
```

Benefits:

- Shareable URLs with filters and stream selection
- Browser back/forward navigation moves between streams and logs views
- Bookmark-able filtered views

## UI components

### LogStreamListItem

- Compact summary card per stream
- Color-coded last log level
- Highlights streams whose latest log is an Error (red border)
- Click to drill in to logs

### LogListItem

- Expandable/collapsible log entries
- Color-coded log levels
- Exception highlighting
- JSON properties display
- Workflow ID details

### LogFilterSlider

- Right-side sheet (modal)
- Grouped activation tree
- Multi-select log levels
- Date range with presets
- Search functionality
- "Apply" button to update filters

### LogLevelBadge

Color-coded badges:

- **Error**: Red
- **Warning**: Yellow
- **Information**: Blue
- **Debug**: Purple
- **Trace**: Gray

## Dependencies

- `date-fns`: Date formatting and relative time
- `@radix-ui/react-checkbox`: Checkbox component
- All other components from existing UI library

## Usage

1. Navigate to **Settings → Logs** in the sidebar.
2. Browse the most recently active log streams (newest first).
3. Click "Filter" to refine streams by activation, log level, or date range.
4. Click a stream to see its logs.
5. In the logs view, click "Streams" to go back.
6. Click on a log entry to expand details.
7. Use pagination to navigate through pages.

## Future enhancements

- Infinite scroll instead of pagination
- Real-time log streaming (WebSocket)
- Export logs to CSV/JSON
- Advanced search (full-text search on message)
- Workflow ID quick-link to workflow details
- Log detail modal with more actions
- Virtualized list for better performance with large datasets
