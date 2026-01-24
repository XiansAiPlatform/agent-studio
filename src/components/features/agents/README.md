# Agent Components

This directory contains reusable components for agent-related features.

## AgentStatusBadge

A unified component for displaying agent activation status badges with consistent styling across the application.

### Features

- ✅ Consistent styling using `AGENT_STATUS_CONFIG`
- ✅ Multiple size variants (xs, sm, default)
- ✅ Optional status indicator dot
- ✅ Conditional rendering (show only when active)
- ✅ Custom label support
- ✅ Full TypeScript support

### Usage

```tsx
import { AgentStatusBadge } from '@/components/features/agents';

// Basic usage
<AgentStatusBadge status="active" />

// Small size (for compact layouts)
<AgentStatusBadge status="active" size="sm" />

// Extra small (for dense lists)
<AgentStatusBadge status="inactive" size="xs" />

// With status indicator dot
<AgentStatusBadge status="active" showDot />

// Show only when active (hides for inactive/error)
<AgentStatusBadge 
  status={agent.status} 
  showOnlyWhenActive={true}
  size="xs"
/>

// With custom label
<AgentStatusBadge 
  status="active" 
  customLabel="Running" 
/>

// With custom className
<AgentStatusBadge 
  status="active" 
  className="ml-2"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `'active' \| 'inactive' \| 'error'` | *required* | The status to display |
| `size` | `'xs' \| 'sm' \| 'default'` | `'default'` | Size of the badge |
| `showDot` | `boolean` | `false` | Whether to show a status indicator dot |
| `showOnlyWhenActive` | `boolean` | `false` | Only render when status is 'active' |
| `className` | `string` | `undefined` | Additional CSS classes |
| `customLabel` | `string` | `undefined` | Custom label instead of default |

### Styling

The component uses centralized styling from `@/lib/agent-status-config`:

- **Active**: Green background, dark mode compatible
- **Inactive**: Yellow background, dark mode compatible  
- **Error**: Red background, dark mode compatible

### Size Reference

- **xs**: `text-[10px]`, `h-4` - For very compact layouts
- **sm**: `text-xs`, `h-5` - For card headers and lists
- **default**: `text-xs` - Standard size

### Migration Guide

**Before:**
```tsx
{activation.status === 'active' && (
  <Badge 
    variant="default" 
    className="text-[10px] px-1.5 py-0 h-4 bg-emerald-600"
  >
    Active
  </Badge>
)}
```

**After:**
```tsx
<AgentStatusBadge 
  status={activation.status}
  size="xs"
  showOnlyWhenActive={true}
/>
```

**Before:**
```tsx
<Badge 
  variant={AGENT_STATUS_CONFIG[agent.status].variant}
  className={AGENT_STATUS_CONFIG[agent.status].colors.badge}
>
  {AGENT_STATUS_CONFIG[agent.status].label}
</Badge>
```

**After:**
```tsx
<AgentStatusBadge 
  status={agent.status}
  size="sm"
/>
```

## ActivationConfigWizard

Multi-step wizard for configuring agent activation parameters.

See `activation-config-wizard.tsx` for detailed documentation.
