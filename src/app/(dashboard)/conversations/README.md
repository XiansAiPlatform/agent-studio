# Conversations Page

This directory contains the conversations feature, refactored for better maintainability and code organization.

## Directory Structure

```
conversations/
├── page.tsx                    # Main page component (orchestration layer)
├── components/                 # UI components
│   ├── agent-selection-view.tsx       # View when no agent is selected
│   ├── conversation-view.tsx          # Main conversation view with topics and chat
│   ├── activation-filter.tsx          # Search and filter UI for activations
│   ├── activation-list-item.tsx       # Individual activation card
│   └── index.ts                       # Component exports
├── hooks/                      # Custom hooks for data management
│   ├── use-activations.ts             # Fetch and manage agent activations
│   ├── use-topics.ts                  # Fetch and manage conversation topics
│   ├── use-messages.ts                # Fetch and manage messages (unused - alternative approach)
│   ├── use-conversation-state.ts      # Manage conversation state and SSE updates
│   └── index.ts                       # Hook exports
├── utils/                      # Utility functions
│   └── index.ts                       # Helper functions and constants
└── README.md                   # This file
```

## Architecture

### Main Page (`page.tsx`)
The main page acts as an orchestration layer that:
- Manages URL state and routing
- Coordinates data fetching using custom hooks
- Handles message sending and loading
- Renders appropriate views based on state

### Custom Hooks

#### `useActivations(tenantId)`
Fetches and manages agent activations.

**Returns:**
- `activations`: Array of activation options
- `isLoading`: Loading state
- `error`: Error state

#### `useTopics({ tenantId, agentName, activationName, page, pageSize })`
Fetches and manages conversation topics with pagination.

**Returns:**
- `topics`: Array of topics
- `setTopics`: Function to update topics
- `isLoading`: Loading state
- `totalPages`: Total number of pages
- `hasMore`: Whether more pages are available
- `refetch`: Function to refetch topics

#### `useConversationState({ tenantId, agentName, activationName, topics, selectedTopicId })`
Manages conversation state including SSE message handling and unread counts.

**Returns:**
- `conversation`: Current conversation object
- `unreadCounts`: Unread message counts per topic
- `handleIncomingMessage`: SSE message handler
- `updateTopicMessages`: Update messages for a topic
- `addMessageToTopic`: Add a message to a topic

### Components

#### `AgentSelectionView`
Displays when no agent is selected. Shows a filterable list of available agent activations grouped by agent name.

**Props:**
- `activations`: Available activations
- `isLoading`: Loading state
- `selectedActivationName`: Currently selected activation
- `selectedAgentName`: Currently selected agent
- `onActivationChange`: Callback when activation is selected

#### `ConversationView`
Main view showing topics list and chat interface.

**Props:**
- `conversation`: Conversation data
- `selectedTopicId`: Currently selected topic
- `onTopicSelect`: Topic selection handler
- `onSendMessage`: Message send handler
- Various loading and pagination props
- SSE connection status props

#### `ActivationFilter`
Search and filter controls for activations.

#### `ActivationListItem`
Individual activation card with hover effects.

### Utilities

#### Helper Functions
- `getTopicParam(topicId)`: Convert topic ID to API parameter
- `getTopicDisplayName(topicId)`: Get display name for a topic
- `isGeneralTopic(topicId)`: Check if topic is general discussions

#### Constants
- `GENERAL_TOPIC_ID`: 'general-discussions'
- `GENERAL_TOPIC_NAME`: 'General Discussions'
- `TOPICS_PAGE_SIZE`: 20
- `MESSAGES_PAGE_SIZE`: 10

## Key Features

### Real-time Messaging (SSE)
The page uses `useMessageListener` hook to establish SSE connection for real-time message updates. Incoming messages are handled by `useConversationState` and automatically update the UI.

### Message Pagination
Messages are loaded in pages of 10. The page tracks message state per topic to avoid refetching when switching between topics.

### Topic Management
Topics are paginated (20 per page) with "General Discussions" always appearing first.

### URL State Management
All state is reflected in the URL:
- `agent-name`: Selected agent
- `activation-name`: Selected activation
- `topic`: Selected topic

This allows for direct linking and browser back/forward navigation.

## Data Flow

1. **Page Load**
   - Fetch activations for the tenant
   - If agent/activation in URL, fetch topics
   - Auto-select "General Discussions" topic
   - Establish SSE connection

2. **Topic Selection**
   - Update URL
   - Fetch messages if not already loaded
   - Clear unread count

3. **Message Sending**
   - Optimistically add message to UI
   - Send to API
   - Wait for SSE confirmation

4. **Incoming Message (SSE)**
   - `handleIncomingMessage` updates conversation state
   - If different topic, increment unread count and show toast
   - If current topic, append to messages

## Performance Optimizations

- Messages are cached per topic (no refetch on topic switch)
- Initial load delay prevents premature "load more" triggers
- Duplicate message filtering when loading more messages
- Optimistic UI updates for sent messages
- Lazy loading of messages (only when topic is selected)

## Future Improvements

- [ ] Implement topic creation
- [ ] Add message reactions
- [ ] Add typing indicators
- [ ] Add message search
- [ ] Add message deletion
- [ ] Implement message threading
- [ ] Add file attachments
