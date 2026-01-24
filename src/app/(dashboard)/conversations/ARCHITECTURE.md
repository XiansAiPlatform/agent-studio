# Conversations Feature Architecture

## Route Structure

```
/conversations
    └── Agent Selection Page
        ↓ (user selects activation)
/conversations/[agentName]/[activationName]?topic=general-discussions
    └── Conversation Page
```

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      /conversations                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Agent Selection Page (page.tsx)                          │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  ActivationFilter                                 │    │  │
│  │  │  [All/Active] [Search...]                        │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  │                                                            │  │
│  │  ┌─ Customer Support Agent ───────────────────────┐      │  │
│  │  │  ┌─────────────────────────────────────────┐   │      │  │
│  │  │  │ ActivationListItem                       │   │      │  │
│  │  │  │ [Icon] Support Bot v1 [Active] >        │   │      │  │
│  │  │  └─────────────────────────────────────────┘   │      │  │
│  │  └─────────────────────────────────────────────────┘      │  │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

                              ↓ Navigation

┌─────────────────────────────────────────────────────────────────────────────┐
│           /conversations/[agentName]/[activationName]                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Conversation Page ([agentName]/[activationName]/page.tsx)            │  │
│  │                                                                        │  │
│  │  ┌──────────────────┐  ┌────────────────────────────────────────┐    │  │
│  │  │  TopicSidebar    │  │  ConversationHeader                     │    │  │
│  │  │                  │  │  [Icon] Support Bot v1                  │    │  │
│  │  │ ┌──────────────┐ │  │  Topic: General • 15 messages [Live]   │    │  │
│  │  │ │Agent Selector│ │  └────────────────────────────────────────┘    │  │
│  │  │ └──────────────┘ │                                                 │  │
│  │  │                  │  ┌────────────────────────────────────────┐    │  │
│  │  │ Topic List:      │  │  ChatPanel                             │    │  │
│  │  │ • General (3)    │  │                                         │    │  │
│  │  │ • Billing        │  │  [Messages displayed here]             │    │  │
│  │  │ • Technical      │  │                                         │    │  │
│  │  │                  │  │  ┌──────────────────────────────────┐  │    │  │
│  │  │ [< Back] [1/3]   │  │  │ [Type a message...]     [Send]  │  │    │  │
│  │  │          [Next >]│  │  └──────────────────────────────────┘  │    │  │
│  │  └──────────────────┘  └────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
ConversationPage
├── ConversationView
│   ├── TopicSidebar
│   │   ├── TopicList (from @/components/features/conversations)
│   │   │   ├── AgentActivationSelector
│   │   │   └── Topic Items
│   │   └── Pagination Controls
│   │
│   └── Right Column
│       ├── ConversationHeader
│       │   ├── Agent Avatar (with sonar pulse)
│       │   ├── Activation Name
│       │   ├── Topic Name & Count
│       │   └── Connection Status
│       │
│       └── ChatPanel
│           └── ChatInterface (from @/components/features/conversations)
│               ├── Message List
│               ├── Load More Button
│               └── Message Input
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Actions                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Page Component                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  URL State Management (useSearchParams, useRouter)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐
│ useActivations │  │   useTopics    │  │ useConversationState   │
└────────────────┘  └────────────────┘  └────────────────────────┘
         ↓                    ↓                    ↓
┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐
│  API: GET      │  │  API: GET      │  │  SSE Connection        │
│  /activations  │  │  /topics       │  │  + Local State Mgmt    │
└────────────────┘  └────────────────┘  └────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Component Props                               │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐
│  TopicSidebar  │  │ConversationHdr │  │     ChatPanel          │
└────────────────┘  └────────────────┘  └────────────────────────┘
```

## State Management Strategy

### 1. URL State (Source of Truth)
- Agent name
- Activation name
- Selected topic

### 2. Server State (via Hooks)
- **useActivations**: List of all activations
- **useTopics**: Topics for current activation
- **useConversationState**: Conversation data + SSE updates

### 3. Local State (Page Component)
- `messageStates`: Per-topic message cache
- `currentPage`: Topic pagination
- `selectedTopicId`: Currently selected topic

### 4. SSE State (Real-time)
- Connection status
- Incoming messages
- Unread counts

## Message Flow

### Sending a Message

```
User types → Input Component
    ↓
    handleSendMessage()
    ↓
    ┌─────────────────────────────────┐
    │ 1. Optimistic UI Update          │
    │    - Add temp message to state   │
    │    - Show in chat immediately    │
    └─────────────────────────────────┘
    ↓
    ┌─────────────────────────────────┐
    │ 2. API Call                      │
    │    POST /api/.../messaging/send  │
    └─────────────────────────────────┘
    ↓
    ┌─────────────────────────────────┐
    │ 3. SSE Confirmation (eventual)   │
    │    - Real message ID received    │
    │    - Replace temp message        │
    └─────────────────────────────────┘
```

### Receiving a Message

```
SSE Event → useMessageListener
    ↓
    handleIncomingMessage()
    ↓
    useConversationState
    ↓
    ┌─────────────────────────────────┐
    │ Is it for current topic?         │
    ├─────────────────────────────────┤
    │ YES → Add to messages            │
    │       Update conversation state  │
    ├─────────────────────────────────┤
    │ NO  → Increment unread count     │
    │       Show toast notification    │
    └─────────────────────────────────┘
    ↓
    Component Re-renders
```

## File Responsibility Matrix

| File | Responsibility | Exports |
|------|---------------|---------|
| `page.tsx` | Agent selection landing | Default component |
| `[agentName]/[activationName]/page.tsx` | Conversation orchestration | Default component |
| `_components/agent-selection/*` | Agent selection UI | Components |
| `[agentName]/[activationName]/_components/*` | Conversation UI parts | Components |
| `components/conversation-view.tsx` | Conversation layout | ConversationView |
| `hooks/use-activations.ts` | Activation data | useActivations |
| `hooks/use-topics.ts` | Topics data | useTopics |
| `hooks/use-conversation-state.ts` | Conversation + SSE | useConversationState |
| `utils/index.ts` | Helper functions | Functions & constants |
| `types.ts` | Type definitions | Types & interfaces |

## Benefits of This Architecture

### 1. **Clear Separation of Concerns**
- Each file has a single, well-defined purpose
- Easy to locate where changes need to be made

### 2. **Better Readability**
- Smaller, focused components (< 200 lines)
- Self-documenting structure through file organization
- Consistent naming patterns

### 3. **Improved Maintainability**
- Changes isolated to specific files
- Less risk of breaking unrelated features
- Easier onboarding for new developers

### 4. **Enhanced Testability**
- Components can be tested in isolation
- Hooks can be tested independently
- Clear boundaries for mocking

### 5. **Scalability**
- Easy to add new features
- Route-based code splitting
- Lazy loading of conversation page

### 6. **Developer Experience**
- Fast navigation in IDE
- Clear import paths
- Predictable file locations

## Migration from Old Structure

### Before
```
conversations/
├── page.tsx (520 lines - everything)
├── components/
│   ├── agent-selection-view.tsx
│   ├── conversation-view.tsx
│   ├── activation-filter.tsx
│   └── activation-list-item.tsx
```

### After
```
conversations/
├── page.tsx (150 lines - agent selection only)
├── [agentName]/[activationName]/
│   ├── page.tsx (450 lines - conversation logic)
│   └── _components/ (3 focused components)
├── components/
│   └── conversation-view.tsx (refactored to use sub-components)
└── _components/
    └── agent-selection/ (2 components)
```

### Key Changes
1. Split monolithic page into two route-based pages
2. Extracted conversation sub-components
3. Organized components by feature and scope
4. Maintained all functionality while improving structure
