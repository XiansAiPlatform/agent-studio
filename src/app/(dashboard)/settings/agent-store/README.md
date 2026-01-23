# Agent Store - Code Structure

This directory contains the Agent Store page, refactored into a clean, maintainable structure.

## Directory Structure

```
agents/store/
├── page.tsx                          # Main page component (orchestration only)
├── types.ts                          # TypeScript type definitions
├── README.md                         # This file
├── components/                       # UI Components
│   ├── deployed-agent-card.tsx      # Card for deployed agents
│   ├── add-from-store-card.tsx      # Placeholder card for adding agents
│   ├── template-card.tsx            # Card for agent templates in store
│   ├── store-slider-sheet.tsx       # Side panel for browsing templates
│   ├── agent-details-sheet.tsx      # Details sheet for agents/store
│   └── delete-agent-dialog.tsx      # Confirmation dialog for deletion
├── hooks/                            # Custom React hooks
│   ├── use-agent-deployments.ts     # Fetch and manage deployed agents
│   └── use-agent-templates.ts       # Fetch and manage available templates
└── utils/                            # Utility functions
    └── agent-helpers.ts             # Helper functions for agents

```

## Components

### Cards
- **DeployedAgentCard**: Displays a deployed agent with status, activation count, and expand/collapse for description
- **AddFromStoreCard**: Placeholder card that opens the store slider
- **TemplateCard**: Displays an agent template with deploy button and expandable details

### Sheets & Dialogs
- **StoreSliderSheet**: Side panel for browsing and deploying new agent templates
- **AgentDetailsSheet**: Shows full details for either a deployed agent or template
- **DeleteAgentDialog**: Confirmation dialog before deleting an agent

## Hooks

### useAgentDeployments
Fetches and manages deployed agents for the current tenant.

**Returns:**
- `deployedAgents`: Array of enhanced deployment objects
- `isLoading`: Loading state
- `error`: Error message if fetch failed
- `refetch`: Function to manually refetch data
- `setDeployedAgents`: State setter for manual updates

### useAgentTemplates
Fetches and manages available agent templates from the store.

**Parameters:**
- `deployedAgents`: Array of already-deployed agents (for filtering)

**Returns:**
- `availableTemplates`: Array of templates not yet deployed
- `isLoadingTemplates`: Loading state
- `templatesLoaded`: Whether templates have been loaded at least once
- `fetchTemplates`: Function to fetch templates

## Utils

### agent-helpers.ts

**Functions:**
- `getAgentIcon(name, summary, description)`: Returns appropriate Lucide icon based on agent type
- `getAgentColor(name)`: Returns consistent color based on agent name hash
- `generateInstanceName(agentName)`: Generates a random, friendly instance name
- `generateInstanceDescription(agentName, instanceName, userName)`: Creates a default description with metadata
- `truncateToSentences(text, maxSentences)`: Truncates text to N sentences with expand capability
- `validateInstanceName(name)`: Validates instance name format and length

## Main Page (page.tsx)

The main page component is now focused on:
1. **State Management**: UI state and form data
2. **Event Handlers**: User interactions (clicks, form submissions)
3. **Orchestration**: Connecting components and hooks together

The page component is now ~370 lines (down from 1271), making it much more maintainable.

## Code Review Improvements

### Before Refactoring
- ❌ Single 1271-line file
- ❌ Mixed concerns (UI, logic, helpers)
- ❌ Difficult to test
- ❌ Hard to reuse components
- ❌ Poor code navigation

### After Refactoring
- ✅ Clean separation of concerns
- ✅ Reusable components
- ✅ Custom hooks for data fetching
- ✅ Utility functions in dedicated files
- ✅ Type safety with TypeScript
- ✅ Easy to test individual components
- ✅ Better code navigation
- ✅ Reduced duplication
- ✅ More maintainable

## Best Practices Applied

1. **Single Responsibility Principle**: Each component/hook/util has one clear purpose
2. **DRY (Don't Repeat Yourself)**: Common logic extracted to utilities
3. **Separation of Concerns**: UI, business logic, and data fetching are separated
4. **Type Safety**: Strong TypeScript types throughout
5. **Custom Hooks**: Data fetching logic encapsulated in reusable hooks
6. **Component Composition**: Smaller, focused components that compose well
7. **Clean Code**: Clear naming, proper comments where needed

## Future Improvements

- [ ] Add unit tests for utility functions
- [ ] Add component tests using React Testing Library
- [ ] Consider adding Storybook for component documentation
- [ ] Add error boundaries for better error handling
- [ ] Consider optimistic UI updates instead of full page reloads
- [ ] Add skeleton loaders for better perceived performance
- [ ] Implement proper pagination for large lists of templates
