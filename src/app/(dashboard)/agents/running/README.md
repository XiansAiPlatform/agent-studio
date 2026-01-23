# Agents Running Page

This directory contains the refactored agents running page, broken down into maintainable components.

## Structure

```
agents/running/
├── page.tsx                          # Main page component (entry point)
├── types.ts                          # TypeScript type definitions
├── hooks/
│   └── use-agents.ts                 # Custom hook for agent data management
├── components/
│   ├── agent-card.tsx                # Individual agent card component
│   ├── agent-filters.tsx             # Filter controls (All/Active, agent types)
│   ├── agent-actions-slider.tsx      # Actions slider for active/inactive agents
│   ├── agent-slider-panels.tsx       # Configure, Activity, Performance panels
│   ├── agent-delete-dialog.tsx       # Delete confirmation dialog
│   └── agent-deactivate-dialog.tsx   # Deactivate confirmation dialog
└── README.md                         # This file
```

## Components

### `page.tsx`
The main page component that orchestrates all child components. Handles:
- State management for dialogs and sliders
- Activation wizard flow (with auto-population from saved configurations)
- Routing and URL parameters
- Integration with all child components

**Key Feature**: When activating an agent, the wizard automatically pre-fills inputs from any previously saved activation configuration, allowing users to easily review and update their settings.

### `types.ts`
Type definitions used across the module:
- `Agent`: Agent instance data structure
- `SliderType`: Type of slider panel to display

### `hooks/use-agents.ts`
Custom hook that handles:
- Fetching agent activations from API
- Mapping API data to Agent type
- Agent list state management
- Refresh functionality

### `components/agent-card.tsx`
Individual agent card that displays:
- Agent status badge
- Agent template badge
- Basic info (name, description, uptime, etc.)
- Handles click events

### `components/agent-filters.tsx`
Filter controls including:
- All/Active toggle (segmented control style)
- Agent type filter buttons with dynamic counts
- Clear filters functionality

### `components/agent-actions-slider.tsx`
Side panel that shows different content based on agent status:
- **Active agents**: Links to conversations, tasks, knowledge, plus configure/activity/performance options
- **Inactive agents**: Activate and delete options

### `components/agent-slider-panels.tsx`
Contains three slider panel components:
- `ConfigurePanel`: **Read-only** view of agent workflow configurations with instructions on how to modify (deactivate then re-activate)
- `ActivityPanel`: Activity logs display
- `PerformancePanel`: Performance metrics and statistics

### `components/agent-delete-dialog.tsx`
Confirmation dialog for deleting an agent instance with:
- Warning for active agents
- Permanent action confirmation

### `components/agent-deactivate-dialog.tsx`
Confirmation dialog for deactivating an agent instance

## Benefits of This Structure

1. **Maintainability**: Each component has a single responsibility
2. **Testability**: Components can be tested independently
3. **Reusability**: Components can be used in other parts of the app
4. **Readability**: Easier to understand and navigate
5. **Performance**: Can implement code splitting if needed
6. **Collaboration**: Multiple developers can work on different components

## Adding New Features

### Adding a new slider panel
1. Create a new component in `components/agent-slider-panels.tsx`
2. Add the panel type to `SliderType` in `types.ts`
3. Add the panel to the Sheet component in `page.tsx`
4. Add navigation to the panel in `agent-actions-slider.tsx`

### Adding a new filter
1. Add state management in `page.tsx`
2. Update `agent-filters.tsx` to include the new filter UI
3. Update the `filteredAgents` logic in `page.tsx`

### Modifying agent data
1. Update the `Agent` type in `types.ts`
2. Update the mapping logic in `hooks/use-agents.ts`
3. Update components that display the new data

## Migration Notes

This is a refactored version of the original 1448-line `page.tsx` file. The functionality remains the same, but the code is now organized into logical, maintainable components.

All existing features are preserved:
- Agent listing with filters
- Agent activation/deactivation
- Agent deletion
- Activity logs, performance metrics, configuration
- Activation wizard integration
- URL parameter handling for newly created agents
