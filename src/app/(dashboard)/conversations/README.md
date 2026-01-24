# Conversations Feature

This directory contains the conversations feature with a clean, organized structure for better maintainability and code readability.

## Directory Structure

```
conversations/
├── page.tsx                                    # Agent selection page (landing)
├── [agentName]/
│   └── [activationName]/
│       ├── page.tsx                            # Conversation page (topics + chat)
│       └── _components/                        # Page-specific components
│           ├── conversation-header.tsx         # Header with activation & topic info
│           ├── topic-sidebar.tsx               # Topic list with pagination
│           ├── chat-panel.tsx                  # Chat interface or empty state
│           └── index.ts
├── _components/                                # Shared feature components
│   ├── agent-selection/                        # Agent selection components
│   │   ├── activation-filter.tsx               # Search and filter UI
│   │   ├── activation-list-item.tsx            # Activation card component
│   │   └── index.ts
│   ├── conversation-view.tsx                   # Main conversation layout
│   └── index.ts
├── hooks/                                      # Custom hooks for data management
│   ├── use-activations.ts                      # Fetch and manage activations
│   ├── use-topics.ts                           # Fetch and manage topics
│   ├── use-conversation-state.ts               # Manage conversation state & SSE
│   ├── use-messages.ts                         # (Alternative approach - unused)
│   └── index.ts
├── utils/                                      # Utility functions
│   └── index.ts                                # Helper functions and constants
├── types.ts                                    # Type definitions
└── README.md                                   # This file
```

## Architecture Overview

The conversations feature is split into two main pages with clear separation of concerns:

### 1. Agent Selection Page (`/conversations`)

**Location:** `page.tsx`

**Purpose:** Landing page where users select which agent activation to chat with.

**Responsibilities:**
- Display list of available agent activations
- Filter and search activations
- Navigate to conversation page when activation is selected

**Key Features:**
- Grouped activations by agent name
- Active/All filter toggle
- Search functionality
- Visual indicators for active agents

### 2. Conversation Page (`/conversations/[agentName]/[activationName]`)

**Location:** `[agentName]/[activationName]/page.tsx`

**Purpose:** Main conversation interface with topics and chat.

**Responsibilities:**
- Manage topics and message loading
- Handle SSE real-time messaging
- Coordinate topic selection and URL state
- Send and receive messages

**Key Features:**
- Topic-based conversations
- Real-time message updates via SSE
- Message pagination (load more)
- Topic pagination
- Agent switching capability
- Connection status indicators

## Component Breakdown

### Page Components

#### Agent Selection Page Components

**ActivationFilter**
- Search input and Active/All toggle
- Shows counts for total and active activations

**ActivationListItem**
- Individual activation card
- Shows agent icon, name, status badge, description
- Clickable to navigate to conversation

#### Conversation Page Components

**ConversationHeader**
- Displays activation name and current topic
- Shows message count
- SSE connection status with live indicator
- Sonar pulse effect when connected and active

**TopicSidebar**
- Topic list with agent selector
- Pagination controls for topics
- Unread message indicators
- Topic creation button (future feature)

**ChatPanel**
- Main chat interface with messages
- Empty state when no topic selected
- Message input (disabled for inactive agents)
- Load more messages functionality

**ConversationView**
- Layout wrapper that combines TopicSidebar, ConversationHeader, and ChatPanel
- Handles topic selection logic
- Manages active agent detection

## Custom Hooks

### `useActivations(tenantId)`

Fetches and manages agent activations for the current tenant.

**Returns:**
- `activations`: Array of activation options
- `isLoading`: Loading state
- `error`: Error state

### `useTopics({ tenantId, agentName, activationName, page, pageSize })`

Fetches and manages conversation topics with pagination.

**Returns:**
- `topics`: Array of topics
- `setTopics`: Function to update topics
- `isLoading`: Loading state
- `totalPages`: Total number of pages
- `hasMore`: Whether more pages are available
- `refetch`: Function to refetch topics

### `useConversationState({ tenantId, agentName, activationName, topics, selectedTopicId })`

Manages conversation state including SSE message handling and unread counts.

**Returns:**
- `conversation`: Current conversation object
- `unreadCounts`: Unread message counts per topic
- `handleIncomingMessage`: SSE message handler
- `updateTopicMessages`: Update messages for a topic
- `addMessageToTopic`: Add a message to a topic

## Data Flow

### Initial Page Load

1. User navigates to `/conversations`
2. `useActivations` fetches all activations
3. User selects an activation
4. Router navigates to `/conversations/[agentName]/[activationName]?topic=general-discussions`

### Conversation Page Flow

1. **Route parameters parsed**
   - Extract `agentName` and `activationName` from URL
   - Extract `topic` from query params

2. **Data fetching**
   - `useActivations` fetches activations (for switching)
   - `useTopics` fetches topics for current activation
   - Auto-select "General Discussions" if no topic specified

3. **SSE connection established**
   - Only for active activations
   - Handles incoming messages in real-time
   - Shows connection status in header

4. **Topic selection**
   - Update URL with selected topic
   - Fetch messages if not already loaded
   - Messages cached per topic

5. **Message sending**
   - Optimistically add to UI
   - Send to API
   - Wait for SSE confirmation

6. **Incoming messages (SSE)**
   - If current topic: append to messages
   - If different topic: increment unread count + show toast

## URL State Management

All application state is reflected in the URL for deep linking and navigation:

- `/conversations` - Agent selection
- `/conversations/[agentName]/[activationName]` - Conversation page
- `?topic=<topicId>` - Selected topic

This allows:
- Direct linking to specific conversations
- Browser back/forward navigation
- Bookmark support
- State persistence on reload

## Performance Optimizations

1. **Message Caching**
   - Messages cached per topic in local state
   - No refetch when switching between topics
   - Separate loading states per topic

2. **Pagination**
   - Topics: 20 per page
   - Messages: 10 per page
   - Load more on demand

3. **Optimistic UI Updates**
   - Sent messages appear immediately
   - Confirmed via SSE later

4. **Duplicate Prevention**
   - Filter duplicates when loading more messages
   - Prevent multiple simultaneous fetches

5. **Code Splitting**
   - Dynamic routes enable automatic code splitting
   - Smaller initial bundle size

## Real-time Messaging (SSE)

The conversation page uses Server-Sent Events for real-time updates:

- **Connection Status**: Visual indicator in header
- **Auto-reconnect**: Exponential backoff on failure
- **Max Attempts**: Redirects to error page after exhaustion
- **Active Only**: SSE only established for active activations
- **Topic-aware**: Messages routed to correct topic

## Future Improvements

- [ ] Topic creation functionality
- [ ] Message reactions
- [ ] Typing indicators
- [ ] Message search
- [ ] Message deletion
- [ ] Message threading/replies
- [ ] File attachments
- [ ] Rich text formatting
- [ ] Message read receipts
- [ ] Desktop notifications

## Development Guidelines

### Adding a New Feature

1. **Identify scope**: Is it page-level or component-level?
2. **Choose location**:
   - Page-specific: `[agentName]/[activationName]/_components/`
   - Shared across feature: `components/` or `_components/`
   - Reusable across app: `/src/components/features/conversations/`
3. **Create hook if needed**: Add to `hooks/` directory
4. **Update types**: Add to `types.ts` if new data structures
5. **Update this README**: Document your changes

### Code Organization Principles

1. **Separation of Concerns**
   - Pages orchestrate, components present
   - Hooks manage data and side effects
   - Utils provide pure functions

2. **Component Size**
   - Keep components under 200 lines
   - Extract sub-components when logic groups emerge
   - Prefer composition over large components

3. **Naming Conventions**
   - Components: PascalCase (e.g., `ChatPanel`)
   - Hooks: camelCase with `use` prefix (e.g., `useTopics`)
   - Utils: camelCase (e.g., `getTopicParam`)
   - Files: kebab-case (e.g., `chat-panel.tsx`)

4. **Import Organization**
   - External packages first
   - Internal absolute imports (`@/...`)
   - Relative imports last
   - Group by category (React, Next, UI, hooks, utils, types)

## Troubleshooting

### SSE Connection Issues

If real-time messaging isn't working:
1. Check that the activation is "active"
2. Verify user is authenticated
3. Check browser console for connection errors
4. Ensure backend SSE endpoint is running

### Messages Not Loading

1. Check network tab for API errors
2. Verify tenant ID is valid
3. Check topic ID format (general-discussions vs custom)
4. Look for error toasts

### Navigation Issues

1. Ensure agent/activation names are properly URL-encoded
2. Check for missing query parameters
3. Verify route structure matches expected pattern

## Testing

When testing this feature:

1. **Agent Selection**
   - Try filtering and searching
   - Verify navigation to conversation page
   - Check empty states

2. **Conversation Page**
   - Test topic switching
   - Send messages
   - Test pagination (topics and messages)
   - Verify SSE connection status
   - Test with inactive agents

3. **Edge Cases**
   - No activations available
   - No topics for activation
   - SSE connection failures
   - Network errors
   - Invalid URL parameters
