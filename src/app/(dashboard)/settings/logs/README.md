# Agent Logs Page

## Overview

The Agent Logs page (`/settings/logs`) provides a comprehensive interface for browsing and filtering workflow execution logs created by agents.

## Features

### 1. **Log Browsing**
- Displays logs in a paginated list (20 per page by default)
- Each log entry shows:
  - Log level badge (Error, Warning, Information, Debug, Trace)
  - Message text
  - Timestamp (relative and absolute)
  - Agent name and activation name
  - Participant ID (if present)
  - Workflow type
  - Expandable details (exception, properties, workflow IDs)

### 2. **Filtering**
Primary filter: **Activation Name** (grouped by agent)
- Collapsible tree structure
- Search functionality
- Shows active/inactive status

Additional filters:
- **Log Level**: Multi-select (Error, Warning, Information, Debug, Trace)
- **Date Range**: Presets (Last hour, 24h, 7d, 30d) + custom range
- All filters are URL-based for sharing and bookmarking

### 3. **Pagination**
- Previous/Next buttons
- Displays current page, total pages, and total count
- Page number preserved in URL

### 4. **Security**
- `tenantId` extracted server-side from authenticated session
- `participantId` filtering NOT exposed to frontend (server-side only)
- All API calls authenticated via `withTenant` middleware

## Architecture

### File Structure
```
src/app/(dashboard)/settings/logs/
├── page.tsx                    # Main page component
├── types.ts                    # TypeScript definitions
├── hooks/
│   └── use-logs.ts            # Log fetching hook
└── components/
    ├── log-list-item.tsx      # Individual log entry
    └── log-filter-slider.tsx  # Filter sidebar

src/app/api/tenants/[tenantId]/logs/
└── route.ts                   # API proxy to Xians Admin API

src/components/features/logs/
├── log-level-badge.tsx        # Log level badge component
└── index.ts
```

### Data Flow
```
User → URL Params → Page Component → use-logs Hook → API Route → Xians Admin API
                         ↓
                  Filter Slider (updates URL)
                         ↓
                  LogListItem Components
```

## API Integration

### Backend Endpoint
- **Xians API**: `GET /api/v1/admin/tenants/{tenantId}/logs`
- **Frontend API**: `GET /api/tenants/{tenantId}/logs`

### Query Parameters
Frontend can pass:
- `agentName`: Filter by agent name
- `activationName`: Filter by activation name
- `workflowId`: Filter by workflow ID
- `workflowType`: Filter by workflow type
- `logLevel`: Comma-separated log levels
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date
- `pageSize`: Items per page (default: 20, max: 100)
- `page`: Page number (default: 1)

Server automatically adds:
- `tenantId`: From authenticated session
- `participantId`: NOT exposed to frontend

## URL State Management

Example URL:
```
/settings/logs?activation=Agent%20Name%20-%20Instance&agent=Agent%20Name&logLevel=Error,Warning&startDate=2025-01-20T00:00:00Z&page=2
```

Benefits:
- Shareable URLs with filters
- Browser back/forward navigation
- Bookmark-able filtered views

## UI Components

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

1. Navigate to Settings → Logs in the sidebar
2. Browse recent logs (newest first by default)
3. Click "Filter" to open filter sidebar
4. Select activation, log levels, or date range
5. Click "Apply" to filter logs
6. Click on a log entry to expand details
7. Use pagination to navigate through pages

## Future Enhancements

Potential improvements:
- Infinite scroll instead of pagination
- Real-time log streaming (WebSocket)
- Export logs to CSV/JSON
- Advanced search (full-text search on message)
- Participant ID filter (if allowed)
- Workflow ID quick-link to workflow details
- Log detail modal with more actions
- Virtualized list for better performance with large datasets
