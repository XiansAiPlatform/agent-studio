# Application Layout & UX Structure

**Version:** 1.0  
**Last Updated:** 2026-01-15  
**Status:** Approved

---

## Overview

This document specifies the complete layout and UX structure for Agent Studio. It covers the application shell, navigation patterns, component hierarchy, and responsive behavior.

**Related Documents:**
- **[requirements.md](./requirements.md)** - Functional requirements for each module
- **[theme.md](./theme.md)** - Design system and visual specifications
- **[technology.md](./technology.md)** - Technical implementation patterns
- **[development.md](./development.md)** - Development workflow and testing

---

## Table of Contents

1. [Application Shell](#application-shell)
2. [Header Component](#header-component)
3. [Side Navigation](#side-navigation)
4. [Right Slider Panel](#right-slider-panel)
5. [Main Content Area](#main-content-area)
6. [Routing Structure](#routing-structure)
7. [Layout Patterns](#layout-patterns)
8. [Responsive Design](#responsive-design)
9. [Component Hierarchy](#component-hierarchy)

---

## Application Shell

**Requirement ID:** AS-001 (from requirements.md)  
**Priority:** P0 (Critical)

### Structure

The application implements a consistent shell with these elements:

```
┌─────────────────────────────────────────────────────────┐
│                    Header (Fixed)                       │
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│   Side   │     Main Content Area        │  Right Slider │
│   Nav    │     (Continuous Scroll)      │  (Contextual) │
│ (Coll.)  │                              │               │
│          │                              │               │
│          │                              │               │
│          │                              │               │
│          │                              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

### Layout Components

#### Fixed Elements
- **Header Bar** - Always visible at top

#### Dynamic Elements
- **Side Navigation** - Collapsible/expandable
- **Main Content** - Continuous scrollable area, takes full remaining height
- **Right Slider Panel** - Slides in from right when needed

### Implementation Structure

```typescript
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen flex-col">
      {/* Fixed Header */}
      <Header />
      
      {/* Main Container - Takes full remaining height */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar />
        
        {/* Main Content - Continuous scroll */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
        
        {/* Right Slider Panel (conditional) */}
        <RightSliderPanel />
      </div>
    </div>
  )
}
```

---

## Header Component

**Requirement ID:** AS-002 (from requirements.md)  
**Priority:** P0 (Critical)

### Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] [App Name]    [Global Search]    [Actions] [Notif] [User] │
└─────────────────────────────────────────────────────────────────┘
```

### Elements (Left to Right)

#### 1. Branding (Left-aligned)
- **Application logo** - Brand identity
- **Application name** - "Agent Studio"
- Clickable - navigates to home/dashboard

#### 2. Global Search (Center)
- **Search bar** - Unified search across all entities
- Keyboard shortcut: `⌘K` / `Ctrl+K` (command palette)
- Search across:
  - Agents
  - Tasks
  - Conversations
  - Knowledge Articles
  - Templates

#### 3. Actions & Tools (Right-aligned)

**Quick Actions Menu:**
- Create Agent
- Create Template
- Start Conversation
- View Tasks

**Notification Center Icon:**
- Badge counter for unread notifications
- Real-time updates
- Notification types:
  - Info (blue)
  - Warning (yellow)
  - Error (red)
  - Success (green)
- Click to open notification panel

**Theme Toggle:**
- Switch between light/dark mode
- Icon changes based on current theme
- Persists user preference

**User Profile Menu:**
- User avatar and name
- Account settings
- Organization/workspace selector (multi-tenancy)
- API keys management
- Logout

### Notification Center

**Features:**
- Real-time notifications for agent events
- Categorized by type
- Mark as read/unread functionality
- Notification history with pagination
- Deep links to relevant content
- Clear all / Dismiss

### Implementation

```typescript
// components/layout/header.tsx
'use client'

import { Bell, Search, Settings, Plus } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserButton } from '@/components/auth/user-button'
import { CommandMenu } from '@/components/command-menu'
import { NotificationCenter } from '@/components/notification-center'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-semibold">Agent Studio</span>
        </div>
        
        {/* Global Search */}
        <div className="flex-1 max-w-md">
          <CommandMenu />
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <QuickActionsMenu />
          <NotificationCenter />
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
    </header>
  )
}
```

---

## Side Navigation

**Requirement ID:** AS-003 (from requirements.md)  
**Priority:** P0 (Critical)

### Navigation Structure

```
┌─────────────────┐
│  [☰] Menu       │
├─────────────────┤
│ 🏠 Tasks        │  ← Active route highlighted
│                 │
│ 💬 Conversations│
│   • Active      │
│   • History     │
│   • Analytics   │
│                 │
│ 🤖 Agents       │
│   • All Agents  │
│   • Active      │
│   • Deploy      │
│   • History     │
│                 │
│ 📄 Templates    │
│   • All         │
│   • Create      │
│   • Import      │
│   • Library     │
│                 │
│ 📚 Knowledge    │
│   • Bases       │
│   • Indexing    │
│                 │
│ 📊 Performance  │
│   • Metrics     │
│   • Analytics   │
│   • Costs       │
│                 │
│ ⚙️  Settings    │
│   • Platform    │
│   • Integrations│
│   • Users       │
│   • Billing     │
└─────────────────┘
```

### Primary Navigation Items

#### 1. Tasks (Home)
- **Icon:** Checkmark / List
- **Badge:** Count of pending items

#### 2. Conversations
- **Icon:** Message bubble
- **Sub-items:**
  - Active Sessions
  - History
  - Analytics

#### 3. Agents
- **Icon:** Robot / Bot
- **Sub-items:**
  - All Agents
  - Agent Instances
  - Deploy Agent (action)
  - Agent History
- **Badge:** Count of running agents

#### 4. Available Agents
- **Icon:** Document / Template
- **Sub-items:**
  - All Templates
  - Create New Template
  - Import Template
  - Template Library

#### 5. Knowledge
- **Icon:** Book / Database
- **Sub-items:**
  - Knowledge Articles

#### 6. Performance
- **Icon:** Chart / Graph
- **Sub-items:**
  - Metrics & KPIs
  - Usage Analytics
  - Cost Tracking

#### 7. Settings
- **Icon:** Gear / Cog
- **Sub-items:**
  - Platform Configuration
  - Integrations
  - User Management
  - Billing

### Behavior

**Collapsible/Expandable:**
- Hamburger menu toggle
- Icon-only mode (collapsed)
- Full menu mode (expanded)
- Keyboard shortcut: `⌘B` / `Ctrl+B`

**Active Route Highlighting:**
- Current page highlighted with primary color
- Parent menu expanded when child is active
- Breadcrumb support for nested navigation

**State Persistence:**
- Collapsed/expanded state saved per user
- Active menu items remembered

**Keyboard Navigation:**
- Tab - Navigate between items
- Arrow keys - Navigate within menu
- Enter - Activate item
- Escape - Collapse menu

### Implementation

```typescript
// components/layout/sidebar.tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle, MessageSquare, Bot, FileText,
  Database, BarChart, Settings, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const navigation = [
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckCircle,
    badge: 5, // Dynamic count
  },
  {
    name: 'Conversations',
    href: '/conversations',
    icon: MessageSquare,
    children: [
      { name: 'Active Sessions', href: '/conversations/active' },
      { name: 'History', href: '/conversations/history' },
      { name: 'Analytics', href: '/conversations/analytics' },
    ],
  },
  // ... more items
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  
  return (
    <aside className={cn(
      "border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <nav className="flex flex-col gap-2 p-4">
        {navigation.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            collapsed={collapsed}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </aside>
  )
}
```

---

## Right Slider Panel

**Requirement ID:** AS-001 (from requirements.md)  
**Priority:** P0 (Critical)

### Purpose

Display detailed information about selected entities without leaving the current page.

**Use Cases:**
- Agent details
- Task details
- Conversation history
- Template preview
- User profile
- Settings panels

### Behavior

**Slide Animation:**
- Slides in from right side (300ms transition)
- Smooth, native-feeling animation
- Can be resized (narrow, medium, wide)

**Sizes:**
- Narrow: 320px (mobile, quick view)
- Medium: 480px (default, most details)
- Wide: 720px (complex content)

**Interaction:**
- Click outside to close (optional dimmed overlay)
- ESC key to close
- Close button (X) in header
- Swipe gesture on mobile

**Stacking:**
- Multiple sliders can stack (e.g., Agent → Task → Details)
- Breadcrumb navigation between stacked sliders
- Each slider maintains its own scroll position

**Deep Linking:**
- URL reflects open slider state
- `/agents?panel=agent-123`
- Shareable links with panel open

**State Management:**
- Maintains state when switching between entities
- Remembers scroll position
- Preserves form data if editing

### Responsive Behavior

**Desktop (>1024px):**
- Slides in from right
- Main content remains visible (compressed)
- Optional overlay (50% opacity)

**Tablet (768px - 1024px):**
- Slides in from right
- Takes 60% of screen width
- Dimmed overlay recommended

**Mobile (<768px):**
- Full-screen modal
- Slides up from bottom
- No overlay (takes full screen)

### Implementation

```typescript
// components/layout/right-slider.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface RightSliderProps {
  children: React.ReactNode
  title: string
  size?: 'narrow' | 'medium' | 'wide'
}

export function RightSlider({ children, title, size = 'medium' }: RightSliderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOpen = searchParams.get('panel') !== null
  
  const sizeClasses = {
    narrow: 'sm:max-w-[320px]',
    medium: 'sm:max-w-[480px]',
    wide: 'sm:max-w-[720px]',
  }
  
  const handleClose = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('panel')
    router.push(`?${params.toString()}`)
  }
  
  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className={cn("w-full", sizeClasses[size])}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 h-full overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Usage
<RightSlider title="Agent Details" size="medium">
  <AgentDetails id={agentId} />
</RightSlider>
```

---

## Main Content Area

### Structure

The main content area is the primary workspace where page-specific content is rendered.

**Characteristics:**
- Takes remaining vertical space
- Scrollable independently
- Responsive padding
- Adapts to sidebar state

### Common Patterns

#### Dashboard/List View
```tsx
<div className="container mx-auto p-6">
  <div className="mb-6 flex items-center justify-between">
    <h1 className="text-3xl font-semibold">Page Title</h1>
    <Button>Action</Button>
  </div>
  
  <div className="grid gap-6">
    {/* Content */}
  </div>
</div>
```

#### Detail View
```tsx
<div className="container mx-auto max-w-4xl p-6">
  <Breadcrumb />
  
  <div className="mt-6 space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Section Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Details */}
      </CardContent>
    </Card>
  </div>
</div>
```

#### Split View
```tsx
<div className="flex h-full">
  <div className="w-1/3 border-r p-6">
    {/* List */}
  </div>
  <div className="flex-1 p-6">
    {/* Details */}
  </div>
</div>
```

---

## Routing Structure

### Next.js App Router Organization

```
app/
├── (auth)/                      # Auth routes (no shell)
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
│
├── (dashboard)/                 # Main app (with shell)
│   ├── layout.tsx              # Dashboard layout wrapper
│   ├── page.tsx                # Dashboard home
│   │
│   ├── tasks/
│   │   ├── page.tsx           # /tasks
│   │   └── [id]/
│   │       └── page.tsx       # /tasks/:id
│   │
│   ├── conversations/
│   │   ├── page.tsx           # /conversations
│   │   └── [id]/
│   │       └── page.tsx       # /conversations/:id
│   │
│   ├── agents/
│   │   ├── page.tsx           # /agents
│   │   ├── deploy/
│   │   │   └── page.tsx       # /agents/deploy
│   │   └── [id]/
│   │       ├── page.tsx       # /agents/:id
│   │       └── edit/
│   │           └── page.tsx   # /agents/:id/edit
│   │
│   ├── templates/
│   │   ├── page.tsx           # /templates
│   │   ├── create/
│   │   │   └── page.tsx       # /templates/create
│   │   └── [id]/
│   │       └── page.tsx       # /templates/:id
│   │
│   ├── knowledge/
│   │   ├── page.tsx           # /knowledge
│   │   └── [id]/
│   │       └── page.tsx       # /knowledge/:id
│   │
│   ├── performance/
│   │   ├── page.tsx           # /performance
│   │   ├── metrics/
│   │   │   └── page.tsx       # /performance/metrics
│   │   └── analytics/
│   │       └── page.tsx       # /performance/analytics
│   │
│   └── settings/
│       ├── page.tsx           # /settings
│       ├── profile/
│       │   └── page.tsx       # /settings/profile
│       └── integrations/
│           └── page.tsx       # /settings/integrations
│
├── api/                        # API routes
│   ├── agents/
│   │   └── route.ts
│   └── tasks/
│       └── route.ts
│
├── layout.tsx                  # Root layout
├── page.tsx                    # Landing page
├── error.tsx                   # Error boundary
└── loading.tsx                 # Loading UI
```

### Route Groups

**Purpose:** Organize routes without affecting URL structure

```typescript
// (auth) group - No dashboard shell
// app/(auth)/layout.tsx
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  )
}

// (dashboard) group - Full application shell
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
```

---

## Layout Patterns

### Nested Layouts

Layouts can be nested for section-specific shells:

```typescript
// app/(dashboard)/agents/layout.tsx
export default function AgentsLayout({ children }) {
  return (
    <div className="h-full">
      <AgentsTabs /> {/* Section-specific navigation */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
```

### Parallel Routes

Use for modal-like experiences:

```
app/
├── @modal/
│   └── (.)agents/
│       └── [id]/
│           └── page.tsx    # Modal view
└── agents/
    └── [id]/
        └── page.tsx        # Full page view
```

### Intercepting Routes

Show content in modal while preserving URL:

```typescript
// app/(dashboard)/@modal/(.)agents/[id]/page.tsx
export default function AgentModal({ params }) {
  return (
    <Dialog>
      <AgentDetails id={params.id} />
    </Dialog>
  )
}
```

---

## Responsive Design

**Requirement:** Support desktop, tablet, and mobile viewports  
**Standard:** Adaptive layout that gracefully degrades

### Breakpoints

```typescript
// Tailwind breakpoints
sm: 640px    // Mobile landscape
md: 768px    // Tablet portrait
lg: 1024px   // Tablet landscape / Small desktop
xl: 1280px   // Desktop
2xl: 1536px  // Large desktop
```

### Responsive Behavior by Component

#### Header
- **Desktop:** Full layout with all elements
- **Tablet:** Compress spacing, smaller search
- **Mobile:** Hamburger menu, icons only

#### Sidebar
- **Desktop (>1024px):** Always visible, collapsible
- **Tablet (768-1024px):** Collapsible, overlays content when open
- **Mobile (<768px):** Drawer from left, full overlay

#### Right Slider
- **Desktop:** Slides from right, compresses main content
- **Tablet:** Slides from right, 60% width, overlay
- **Mobile:** Full-screen modal from bottom

#### Main Content
- **Desktop:** Multi-column grid layouts
- **Tablet:** 2-column or single column
- **Mobile:** Single column, full width

### Implementation

```typescript
// Responsive grid example
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">

// Responsive navigation
<nav className="hidden md:flex">  {/* Desktop */}
<MobileNav className="md:hidden" />  {/* Mobile */}
```

---

## Component Hierarchy

### Layout Component Tree

```
RootLayout (app/layout.tsx)
├── ThemeProvider
├── SessionProvider
└── Body
    ├── AuthLayout (auth routes)
    │   └── Page content
    │
    └── DashboardLayout (app routes)
        ├── Header
        │   ├── Logo & Branding
        │   ├── CommandMenu (Global Search)
        │   ├── QuickActions
        │   ├── NotificationCenter
        │   ├── ThemeToggle
        │   └── UserButton
        │
        ├── Main Container
        │   ├── Sidebar
        │   │   └── Navigation Items
        │   │       └── Sub-items
        │   │
        │   ├── Main Content
        │   │   └── Page content
        │   │       ├── Page Header
        │   │       ├── Breadcrumbs
        │   │       └── Page Body
        │   │
        │   └── RightSlider (conditional)
        │       ├── Slider Header
        │       └── Slider Content
```

### State Management

```typescript
// Layout state (global)
interface LayoutState {
  sidebarCollapsed: boolean
  rightSliderOpen: boolean
  rightSliderContent: React.ReactNode | null
  notifications: Notification[]
  commandMenuOpen: boolean
}

// Use Zustand for layout state
import { create } from 'zustand'

const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  rightSliderOpen: false,
  rightSliderContent: null,
  notifications: [],
  commandMenuOpen: false,
  
  toggleSidebar: () => set(state => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
  
  openRightSlider: (content) => set({ 
    rightSliderOpen: true, 
    rightSliderContent: content 
  }),
  
  closeRightSlider: () => set({ 
    rightSliderOpen: false 
  }),
}))
```

---

## Accessibility

All layout components must meet WCAG 2.1 Level AA standards:

### Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **⌘K / Ctrl+K**: Open command menu
- **⌘B / Ctrl+B**: Toggle sidebar
- **Escape**: Close modals/sliders
- **Arrow keys**: Navigate within menus

### Focus Management

```typescript
// Trap focus in slider when open
<Sheet open={isOpen}>
  <SheetContent>
    {/* Focus trapped automatically by shadcn/ui */}
  </SheetContent>
</Sheet>

// Return focus when closing
onClose={() => {
  closeSlider()
  previousFocusRef.current?.focus()
}}
```

### Screen Reader Support

```typescript
// Landmarks
<header role="banner">
<nav role="navigation" aria-label="Main navigation">
<main role="main">
<aside role="complementary" aria-label="Additional information">

// Live regions
<div aria-live="polite" aria-atomic="true">
  {notifications.length} new notifications
</div>
```

### Skip Links

```typescript
// app/layout.tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

<main id="main-content">
  {children}
</main>
```

---

## Performance Considerations

### Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic'

const RightSlider = dynamic(() => import('./right-slider'), {
  loading: () => <RightSliderSkeleton />,
})

const CommandMenu = dynamic(() => import('./command-menu'), {
  ssr: false, // Only load on client
})
```

### Layout Shift Prevention

```typescript
// Reserve space for dynamic content
<div className="h-16">  {/* Header always 64px */}
<aside className="w-64"> {/* Sidebar fixed width when expanded */}
```

### Smooth Animations

```typescript
// Use CSS transforms for better performance
.sidebar {
  transition: transform 300ms ease-in-out;
  transform: translateX(0);
}

.sidebar.collapsed {
  transform: translateX(-100%);
}
```

---

## Best Practices

### 1. Consistent Spacing

Use theme spacing values throughout layouts:

```typescript
<div className="p-6">       {/* 24px - standard content padding */}
<div className="gap-4">     {/* 16px - standard gap */}
<div className="mb-6">      {/* 24px - section spacing */}
```

### 2. Component Composition

Build layouts from smaller, reusable components:

```typescript
// Good - Composable
<PageHeader>
  <PageTitle>Agents</PageTitle>
  <PageActions>
    <Button>Create Agent</Button>
  </PageActions>
</PageHeader>

// Avoid - Monolithic
<PageHeaderWithTitleAndActions title="Agents" action={...} />
```

### 3. Layout Shifts

Avoid layout shifts on navigation:

```typescript
// Reserve space for loading states
{isLoading ? <Skeleton /> : <Content />}

// Use Suspense boundaries
<Suspense fallback={<Skeleton />}>
  <AsyncContent />
</Suspense>
```

### 4. Mobile-First

Design for mobile, enhance for desktop:

```typescript
// Mobile first
<div className="flex flex-col md:flex-row">

// Not desktop first
<div className="flex flex-row sm:flex-col">  // ❌
```

---

## Testing Layout

### Visual Regression Testing

```typescript
// __tests__/layout.visual.ts
describe('Layout Components', () => {
  it('renders header correctly', async () => {
    const screenshot = await takeScreenshot(<Header />)
    expect(screenshot).toMatchImageSnapshot()
  })
  
  it('sidebar collapses correctly', async () => {
    const { container } = render(<Sidebar />)
    const toggleButton = screen.getByLabelText('Toggle sidebar')
    
    await userEvent.click(toggleButton)
    
    expect(container).toHaveClass('w-16')
  })
})
```

### Responsive Testing

```typescript
// Test different viewports
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
]

viewports.forEach(({ name, width, height }) => {
  test(`layout works on ${name}`, () => {
    viewport.set(width, height)
    render(<DashboardLayout />)
    // Assertions
  })
})
```

---

## Resources

- **Next.js Layouts**: https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
- **shadcn/ui Sheet**: https://ui.shadcn.com/docs/components/sheet (for right slider)
- **Radix UI Navigation**: https://www.radix-ui.com/docs/primitives/components/navigation-menu
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

**Status:** ✅ Complete  
**Last Updated:** 2026-01-15  
**Next Review:** After MVP implementation
