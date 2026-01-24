# Conversations Feature - Quick Reference

## 📁 File Structure

```
conversations/
├── 📄 page.tsx                          → Agent selection landing page
├── 📁 [agentName]/[activationName]/     → Conversation route
│   ├── 📄 page.tsx                      → Conversation page logic
│   └── 📁 _components/                  → Page-specific components
│       ├── conversation-header.tsx      → Header (activation, topic, status)
│       ├── topic-sidebar.tsx            → Topics list + pagination
│       └── chat-panel.tsx               → Chat interface + empty state
├── 📁 _components/                      → Shared feature components
│   ├── agent-selection/                 → Agent selection components
│   │   ├── activation-filter.tsx        → Search & filter controls
│   │   └── activation-list-item.tsx     → Activation card
│   └── conversation-view.tsx            → Main conversation layout
├── 📁 hooks/                            → Custom data hooks
│   ├── use-activations.ts               → Fetch activations
│   ├── use-topics.ts                    → Fetch topics
│   └── use-conversation-state.ts        → Conversation state + SSE
└── 📁 utils/                            → Helper functions
```

## 🚀 Quick Navigation

### I want to modify...

| Feature | File |
|---------|------|
| Agent selection UI | `page.tsx` |
| Activation cards | `_components/agent-selection/activation-list-item.tsx` |
| Search & filters | `_components/agent-selection/activation-filter.tsx` |
| Conversation header | `[agentName]/[activationName]/_components/conversation-header.tsx` |
| Topic sidebar | `[agentName]/[activationName]/_components/topic-sidebar.tsx` |
| Chat panel | `[agentName]/[activationName]/_components/chat-panel.tsx` |
| Conversation layout | `_components/conversation-view.tsx` |
| Data fetching | `hooks/` directory |
| Helper functions | `utils/index.ts` |

## 🔄 Page Flow

```
User visits /conversations
    ↓
Agent Selection Page (page.tsx)
    ↓ (clicks activation)
Navigate to /conversations/[agent]/[activation]?topic=general-discussions
    ↓
Conversation Page ([agentName]/[activationName]/page.tsx)
    ↓
Renders: TopicSidebar + ConversationHeader + ChatPanel
```

## 📦 Component Relationships

```
ConversationPage
└── ConversationView
    ├── TopicSidebar
    │   ├── TopicList (from shared components)
    │   └── Pagination Controls
    └── Right Column
        ├── ConversationHeader
        │   ├── Agent Avatar + Sonar Pulse
        │   ├── Activation & Topic Info
        │   └── Connection Status
        └── ChatPanel
            └── ChatInterface (from shared components)
                ├── Messages
                └── Input
```

## 🎯 Common Tasks

### Add a new component to conversation page

1. Create file in `[agentName]/[activationName]/_components/your-component.tsx`
2. Export from `[agentName]/[activationName]/_components/index.ts`
3. Import in page: `import { YourComponent } from './_components'`

### Add a new data hook

1. Create file in `hooks/use-your-hook.ts`
2. Export from `hooks/index.ts`
3. Use in page: `import { useYourHook } from '../../hooks'`

### Modify agent selection

1. Edit `page.tsx` for page logic
2. Edit `_components/agent-selection/*` for UI components

### Modify conversation view

1. Edit `[agentName]/[activationName]/page.tsx` for logic
2. Edit `[agentName]/[activationName]/_components/*` for UI

## 🔌 Hooks API

### `useActivations(tenantId)`
```typescript
const { activations, isLoading, error } = useActivations(tenantId);
```

### `useTopics({ tenantId, agentName, activationName, page })`
```typescript
const { 
  topics, 
  setTopics, 
  isLoading, 
  totalPages, 
  hasMore 
} = useTopics({ tenantId, agentName, activationName, page });
```

### `useConversationState({ tenantId, agentName, activationName, topics, selectedTopicId })`
```typescript
const {
  conversation,
  unreadCounts,
  handleIncomingMessage,
  updateTopicMessages,
  addMessageToTopic
} = useConversationState({ ... });
```

## 🎨 Component Props Quick Reference

### ConversationHeader
```typescript
{
  activationName: string;
  topic: Topic;
  isConnected: boolean;
  isAgentActive: boolean;
}
```

### TopicSidebar
```typescript
{
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCreateTopic: () => void;
  unreadCounts: Record<string, number>;
  activations: ActivationOption[];
  selectedActivationName: string | null;
  onActivationChange: (name: string, agent: string) => void;
  isLoadingActivations: boolean;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}
```

### ChatPanel
```typescript
{
  conversation: Conversation;
  selectedTopic: Topic | undefined;
  selectedTopicId: string;
  onSendMessage: (content: string, topicId: string) => void;
  isLoadingMessages: boolean;
  onLoadMoreMessages: () => void;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  activationName: string | null;
  isAgentActive: boolean;
}
```

## 📝 Naming Conventions

- **Components**: PascalCase (e.g., `ChatPanel`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTopics`)
- **Utils**: camelCase (e.g., `getTopicParam`)
- **Files**: kebab-case (e.g., `chat-panel.tsx`)
- **Folders**: kebab-case (e.g., `agent-selection/`)

## 🐛 Debugging Tips

### Messages not loading?
→ Check `[agentName]/[activationName]/page.tsx` `useEffect` for message fetching

### SSE not connecting?
→ Check `useMessageListener` in conversation page
→ Verify activation is "active" status

### Navigation not working?
→ Check URL encoding in router.push calls
→ Verify route parameters match folder structure

### Component not rendering?
→ Check import path (relative vs absolute)
→ Verify export in `index.ts`

## 📚 Documentation Files

- **README.md** - Complete documentation (features, API, usage)
- **ARCHITECTURE.md** - Architecture diagrams and design decisions
- **REORGANIZATION_SUMMARY.md** - What changed and why
- **QUICK_REFERENCE.md** - This file (quick lookups)

## ⚡ Performance Tips

1. **Messages are cached** - Don't refetch when switching topics
2. **Route-based splitting** - Conversation page loads on demand
3. **Optimistic updates** - Sent messages appear immediately
4. **Pagination** - Load data incrementally

## 🔗 Related Files Outside This Directory

- `/src/components/features/conversations/` - Shared conversation components
- `/src/components/ui/` - UI primitives
- `/src/hooks/use-tenant.ts` - Tenant management
- `/src/hooks/use-message-listener.ts` - SSE connection
- `/src/lib/data/dummy-conversations.ts` - Type definitions

## 💡 Pro Tips

1. Use component index files for clean imports
2. Keep components under 200 lines
3. Extract hooks for reusable logic
4. Prefix page-specific components with underscore folder (`_components/`)
5. Use semantic HTML and ARIA labels for accessibility

---

**Last Updated:** January 24, 2026  
**For detailed docs:** See README.md and ARCHITECTURE.md
