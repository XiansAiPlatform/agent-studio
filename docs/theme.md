# Agent Studio - Design System & Theme Specification

**Version:** 1.0  
**Last Updated:** 2026-01-15  
**Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Technology Decisions](#technology-decisions)
4. [Color System](#color-system)
5. [Typography](#typography)
6. [Spacing & Layout](#spacing--layout)
7. [Components](#components)
8. [Icons](#icons)
9. [Shadows & Elevation](#shadows--elevation)
10. [Dark Mode](#dark-mode)
11. [Accessibility](#accessibility)
12. [Implementation Guide](#implementation-guide)
13. [Resources](#resources)

---

## Overview

Agent Studio uses a **Nordic-inspired design system** built on modern web technologies. The theme emphasizes clarity, minimalism, and excellent user experience through generous whitespace, subtle colors, and accessible components.

### Design Stack

- **Styling Framework:** Tailwind CSS v3.4+
- **Component Library:** shadcn/ui (Radix UI primitives)
- **Icon Library:** Lucide React
- **Theme Management:** next-themes (class-based dark mode)
- **Design Language:** Nordic-inspired minimalism

---

## Design Philosophy

### Nordic Design Principles

Our design system is inspired by Scandinavian design philosophy:

1. **Minimalism** - Remove unnecessary elements, focus on essentials
2. **Functionality** - Form follows function, every element serves a purpose
3. **Calm & Clean** - Generous whitespace, muted colors, subtle contrasts
4. **Natural** - Colors inspired by Nordic nature (snow, frost, aurora)
5. **Accessible** - Design for everyone, WCAG 2.1 AA minimum
6. **Honest** - Clear communication, no misleading patterns

### Visual Characteristics

- **Subtle borders or no borders** - Use background colors for separation
- **Generous whitespace** - Breathing room between elements
- **Muted color palette** - Calm, nature-inspired tones
- **Soft shadows** - Subtle elevation instead of heavy borders
- **Minimal rounding** - Slight border radius (4-8px) for modern feel
- **Clean typography** - System fonts, clear hierarchy

---

## Technology Decisions

### Decision Summary

After evaluating multiple approaches, we chose a modern, flexible stack:

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **CSS Framework** | Tailwind CSS v3.4+ | Utility-first, tree-shakeable, excellent DX |
| **Component Library** | shadcn/ui | Code ownership, accessibility, customizable |
| **Component Foundation** | Radix UI | Best-in-class accessibility (WCAG 2.1 AA+) |
| **Icons** | Lucide React | 1000+ professional icons, tree-shakeable |
| **Theme System** | CSS Variables + next-themes | Light/dark mode, Nordic colors |
| **Dark Mode** | Class-based (.dark) | User control, persisted preference |

### Why This Stack?

#### Tailwind CSS ✅
- **Utility-first:** Rapid development with consistent design tokens
- **Tree-shaking:** Only ship CSS you actually use
- **Customizable:** Nordic colors integrated as first-class citizens
- **Type-safe:** IntelliSense with TypeScript
- **Industry standard:** Easy to hire, large community

#### shadcn/ui ✅
- **Code ownership:** Components copied to your project, no version lock-in
- **Accessible:** Built on Radix UI with WCAG 2.1 AA+ compliance
- **Customizable:** Full control over component code
- **Nordic compatible:** Uses CSS variables for theming
- **40+ components:** Everything needed for Agent Studio

#### Lucide React ✅
- **Professional:** 1000+ consistent, well-designed icons
- **Tree-shakeable:** Only bundle icons you use
- **Customizable:** Easy size, color, stroke adjustments
- **TypeScript:** Full type definitions
- **MIT licensed:** No licensing concerns

### Alternative Options Considered

We evaluated and rejected:

- ❌ **Material UI (MUI):** Heavy bundle, Material Design conflicts with Nordic aesthetic
- ❌ **Chakra UI:** Different styling paradigm (styled-components vs Tailwind)
- ❌ **Ant Design:** Too opinionated, enterprise aesthetic doesn't fit Nordic
- ❌ **Custom CSS from scratch:** Months of work, accessibility challenges
- ❌ **WebSockets:** SSE is simpler and better for AI streaming

See `COMPONENT-LIBRARY-DECISION.md` for detailed comparison.

---

## Color System

### Nordic Color Palette

Our palette is inspired by Scandinavian nature:

#### Snow & Frost (Light Neutrals)

```css
--color-snow: #ECEFF4        /* Lightest background, fresh snow */
--color-frost: #E5E9F0       /* Secondary background, morning frost */
--color-polar: #D8DEE9       /* Tertiary background, polar ice */
```

#### Slate & Midnight (Dark Neutrals)

```css
--color-slate-light: #4C566A /* Light text on dark, evening sky */
--color-slate: #434C5E       /* Medium dark, stormy clouds */
--color-slate-dark: #3B4252  /* Dark background, twilight */
--color-midnight: #2E3440    /* Darkest background, midnight sky */
```

#### Ice & Frost (Cool Blues)

```css
--color-ice: #8FBCBB         /* Secondary accent, glacial ice */
--color-frost-blue: #88C0D0  /* Info color, frozen water */
--color-aurora-blue: #81A1C1 /* Accent, northern lights */
--color-nordic-blue: #5E81AC /* Primary, deep fjord */
```

#### Aurora (Accent Colors)

```css
--color-aurora-green: #A3BE8C   /* Success, forest green */
--color-aurora-yellow: #EBCB8B  /* Warning, sunrise */
--color-aurora-orange: #D08770  /* Alert, autumn leaves */
--color-aurora-red: #BF616A     /* Error/destructive, sunset */
--color-aurora-purple: #B48EAD  /* Special, twilight */
```

### Semantic Color Mapping

Colors are mapped to semantic purposes:

#### Light Mode

```css
:root {
  /* Backgrounds - Snow/Frost layers */
  --background: 0 0% 93%;           /* #ECEFF4 - Snow */
  --foreground: 220 16% 22%;        /* #2E3440 - Midnight */
  --card: 0 0% 100%;                /* White */
  --muted: 220 17% 90%;             /* #E5E9F0 - Frost */
  
  /* Brand Colors - Nordic Blues */
  --primary: 213 32% 52%;           /* #5E81AC - Nordic Blue */
  --secondary: 179 25% 65%;         /* #8FBCBB - Ice */
  --accent: 213 32% 63%;            /* #81A1C1 - Aurora Blue */
  
  /* Status Colors - Aurora */
  --success: 92 28% 65%;            /* #A3BE8C - Aurora Green */
  --warning: 40 71% 73%;            /* #EBCB8B - Aurora Yellow */
  --destructive: 354 42% 56%;       /* #BF616A - Aurora Red */
  --info: 193 43% 67%;              /* #88C0D0 - Frost Blue */
  
  /* UI Elements */
  --border: 220 17% 87%;            /* #D8DEE9 - Polar */
  --input: 220 17% 87%;
  --ring: 213 32% 52%;              /* Focus ring */
  --radius: 0.5rem;                 /* Subtle rounding */
}
```

#### Dark Mode

```css
.dark {
  /* Backgrounds - Midnight/Slate layers */
  --background: 220 16% 22%;        /* #2E3440 - Midnight */
  --foreground: 0 0% 93%;           /* #ECEFF4 - Snow */
  --card: 222 16% 28%;              /* #3B4252 - Slate Dark */
  --muted: 220 16% 28%;             /* #434C5E - Slate */
  
  /* Brand Colors - Same blues, different context */
  --primary: 213 32% 52%;           /* #5E81AC - Nordic Blue */
  --secondary: 220 16% 28%;         /* Slate instead of Ice */
  --accent: 213 32% 63%;            /* #81A1C1 - Aurora Blue */
  
  /* Status Colors - Slightly adjusted for dark */
  --success: 92 28% 65%;
  --warning: 40 71% 73%;
  --destructive: 354 42% 56%;
  --info: 193 43% 67%;
  
  /* UI Elements */
  --border: 220 16% 28%;
  --input: 220 16% 28%;
  --ring: 213 32% 63%;
}
```

### Color Usage Guidelines

#### Primary (Nordic Blue)
- **Use for:** Main actions, primary buttons, links, active states
- **Don't use for:** Large backgrounds, body text
- **Example:** "Save" button, selected tab, active navigation

#### Secondary (Ice/Slate)
- **Use for:** Secondary actions, alternative paths, muted emphasis
- **Don't use for:** Critical actions
- **Example:** "Cancel" button, secondary navigation

#### Success (Aurora Green)
- **Use for:** Success messages, completed states, positive indicators
- **Example:** "Agent deployed successfully", checkmarks, online status

#### Warning (Aurora Yellow)
- **Use for:** Warnings, cautions, informational alerts
- **Example:** "API rate limit approaching", Pending Tasks
#### Destructive (Aurora Red)
- **Use for:** Errors, destructive actions, critical alerts
- **Example:** "Delete agent" button, error messages, failed status

#### Muted
- **Use for:** Disabled states, secondary text, subtle backgrounds
- **Example:** Helper text, disabled inputs, placeholder text

### Using Nordic Colors in Code

```tsx
// Direct Nordic colors (for custom styling)
<div className="bg-nordic-snow text-nordic-midnight">
<div className="bg-nordic-frost-blue text-white">
<div className="border-nordic-polar">

// Semantic colors (preferred - auto light/dark)
<div className="bg-background text-foreground">
<div className="bg-card text-card-foreground">
<Button variant="default">Uses primary color</Button>
<Badge variant="success">Uses success color</Badge>

// Tailwind utilities with Nordic
<Card className="bg-nordic-frost shadow-nordic">
```

---

## Typography

### Font Families

```css
/* Sans-serif (UI) */
--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                    'Helvetica Neue', Arial, sans-serif;

/* Monospace (code) */
--font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 
                    'Consolas', monospace;
```

**Rationale:** System fonts for optimal performance and native feel on each platform.

### Type Scale

```css
--font-size-xs: 12px    /* 0.75rem */
--font-size-sm: 14px    /* 0.875rem */
--font-size-base: 16px  /* 1rem - body text */
--font-size-lg: 18px    /* 1.125rem */
--font-size-xl: 20px    /* 1.25rem */
--font-size-2xl: 24px   /* 1.5rem */
--font-size-3xl: 30px   /* 1.875rem */
--font-size-4xl: 36px   /* 2.25rem */
```

### Font Weights

```css
--font-weight-normal: 400    /* Body text */
--font-weight-medium: 500    /* Emphasis */
--font-weight-semibold: 600  /* Headings */
--font-weight-bold: 700      /* Strong emphasis */
```

### Line Heights

```css
--line-height-tight: 1.25    /* Headings */
--line-height-normal: 1.5    /* Body text */
--line-height-relaxed: 1.75  /* Long-form content */
```

### Typography in Practice

```tsx
// Headings
<h1 className="text-4xl font-semibold text-foreground">
<h2 className="text-3xl font-semibold text-foreground">
<h3 className="text-2xl font-semibold text-foreground">

// Body text
<p className="text-base text-muted-foreground">
<p className="text-sm text-muted-foreground">

// Labels
<label className="text-sm font-medium text-foreground">

// Code
<code className="font-mono text-sm bg-muted px-1 rounded">
```

---

## Spacing & Layout

### Spacing Scale

```css
--space-xs: 4px      /* 0.25rem */
--space-sm: 8px      /* 0.5rem */
--space-md: 16px     /* 1rem */
--space-lg: 24px     /* 1.5rem */
--space-xl: 32px     /* 2rem */
--space-2xl: 48px    /* 3rem */
--space-3xl: 64px    /* 4rem */
```

**Nordic Emphasis:** Generous whitespace - use larger spacing values for breathing room.

### Tailwind Spacing

```tsx
// Padding
<div className="p-4">   {/* 16px */}
<div className="p-6">   {/* 24px */}
<div className="p-8">   {/* 32px */}

// Margin
<div className="mt-4">  {/* margin-top: 16px */}
<div className="mb-6">  {/* margin-bottom: 24px */}

// Gap (flexbox/grid)
<div className="flex gap-4">  {/* 16px gap */}
<div className="space-y-6">   {/* 24px vertical spacing */}
```

### Border Radius

```css
--radius-sm: 4px     /* Subtle */
--radius-md: 6px     /* Default */
--radius-lg: 8px     /* Cards */
--radius-xl: 12px    /* Large elements */
--radius-full: 9999px /* Pills, avatars */
```

**Nordic Style:** Minimal but present rounding for modern feel.

```tsx
<Button className="rounded-md">     {/* 6px */}
<Card className="rounded-lg">       {/* 8px */}
<Avatar className="rounded-full">   {/* Circle */}
```

### Responsive Breakpoints

```css
sm: 640px    /* Tablet portrait */
md: 768px    /* Tablet landscape */
lg: 1024px   /* Desktop */
xl: 1280px   /* Large desktop */
2xl: 1536px  /* Extra large */
```

```tsx
// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<Card className="p-4 md:p-6 lg:p-8">
```

---

## Components

### Component Library: shadcn/ui

All UI components use **shadcn/ui** built on **Radix UI** primitives.

#### Key Components for Agent Studio

**Layout & Structure:**
- `Card` - Primary container for content sections
- `Sheet` - Right slider panel for entity details
- `Tabs` - Multi-topic navigation
- `Separator` - Visual dividers
- `Accordion` - Collapsible sections

**Forms & Input:**
- `Input` - Text input fields
- `Textarea` - Multi-line input
- `Select` - Dropdown selection
- `Checkbox` - Boolean input
- `Switch` - Toggle control
- `Form` - Form wrapper with validation

**Navigation:**
- `NavigationMenu` - Main navigation
- `Dropdown Menu` - Contextual menus
- `Breadcrumb` - Location hierarchy
- `Pagination` - Data navigation

**Feedback:**
- `Alert` - Informational messages
- `Toast` - Temporary notifications
- `Badge` - Status indicators
- `Progress` - Loading states
- `Skeleton` - Loading placeholders

**Overlays:**
- `Dialog` - Modal dialogs
- `Popover` - Floating content
- `Tooltip` - Helpful hints
- `Command` - Command palette (⌘K)

**Data Display:**
- `Table` - Tabular data
- `Avatar` - User/agent images
- `ScrollArea` - Custom scrollbars

#### Component Variants

Components support semantic variants:

```tsx
// Button variants
<Button variant="default">    {/* Primary - Nordic Blue */}
<Button variant="secondary">  {/* Secondary - Ice/Slate */}
<Button variant="destructive"> {/* Destructive - Aurora Red */}
<Button variant="outline">    {/* Outlined */}
<Button variant="ghost">      {/* Transparent */}

// Badge variants
<Badge variant="default">     {/* Primary */}
<Badge variant="secondary">   {/* Muted */}
<Badge variant="success">     {/* Aurora Green */}
<Badge variant="warning">     {/* Aurora Yellow */}
<Badge variant="destructive"> {/* Aurora Red */}

// Alert variants
<Alert variant="default">     {/* Info */}
<Alert variant="destructive"> {/* Error */}
```

#### Nordic Component Patterns

```tsx
// Cards with Nordic styling
<Card className="shadow-nordic hover:shadow-nordic-md transition-shadow">
  <CardHeader className="border-b border-nordic-polar">
    <CardTitle>Agent Status</CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>

// Right slider panel (AS-001)
<Sheet>
  <SheetContent className="w-full sm:max-w-lg">
    <SheetHeader>
      <SheetTitle>Agent Details</SheetTitle>
    </SheetHeader>
    {/* Details */}
  </SheetContent>
</Sheet>

// Status badges
<Badge variant="success" className="gap-1">
  <CheckCircle className="h-3 w-3" />
  Running
</Badge>
```

### Component Accessibility

All shadcn/ui components include:

- ✅ **Keyboard navigation** - Tab, Arrow keys, Enter, Escape
- ✅ **ARIA labels** - Proper semantic roles and labels
- ✅ **Focus management** - Visible focus indicators, focus trapping
- ✅ **Screen reader support** - Tested with NVDA, JAWS, VoiceOver
- ✅ **Color contrast** - WCAG 2.1 AA minimum (4.5:1 for text)

---

## Icons

### Icon Library: Lucide React

**Installation:**
```bash
npm install lucide-react
```

**Key Features:**
- 1000+ professional icons
- Consistent 24x24 design grid
- Customizable size, color, stroke
- Tree-shakeable (only bundle what you use)
- TypeScript support

### Icon Usage

```tsx
import { Bot, Settings, Bell, Search, Plus, Check } from 'lucide-react';

// Basic usage
<Bot className="h-5 w-5 text-primary" />

// With button
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Agent
</Button>

// Status indicators
<CheckCircle className="h-5 w-5 text-nordic-aurora-green" />
<XCircle className="h-5 w-5 text-nordic-aurora-red" />
<AlertCircle className="h-5 w-5 text-nordic-aurora-yellow" />

// Loading spinner
<Loader2 className="h-4 w-4 animate-spin" />
```

### Icon Sizing

```tsx
<Icon className="h-4 w-4" />   // 16px - Small (inline, badges)
<Icon className="h-5 w-5" />   // 20px - Default (buttons, nav)
<Icon className="h-6 w-6" />   // 24px - Medium (headers)
<Icon className="h-8 w-8" />   // 32px - Large (hero, empty states)
<Icon className="h-12 w-12" /> // 48px - Extra large
```

### Common Icons for Agent Studio

```tsx
// Agents & AI
import { Bot, Cpu, Zap, Sparkles, Activity } from 'lucide-react';

// Tasks & Status
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

// Conversations
import { MessageSquare, Send, MessageCircle } from 'lucide-react';

// Actions
import { Play, Pause, Stop, RefreshCw, Settings } from 'lucide-react';

// Navigation
import { Home, Menu, ChevronRight, ArrowRight } from 'lucide-react';

// Data
import { BarChart, LineChart, TrendingUp, Database } from 'lucide-react';
```

---

## Shadows & Elevation

### Nordic Shadow System

Subtle shadows for elevation (not heavy borders):

```css
/* Light mode shadows */
--shadow-nordic-sm: 0 1px 2px 0 rgba(46, 52, 64, 0.05);
--shadow-nordic-md: 0 4px 6px -1px rgba(46, 52, 64, 0.08), 
                    0 2px 4px -1px rgba(46, 52, 64, 0.04);
--shadow-nordic-lg: 0 10px 15px -3px rgba(46, 52, 64, 0.08), 
                    0 4px 6px -2px rgba(46, 52, 64, 0.04);
--shadow-nordic-xl: 0 20px 25px -5px rgba(46, 52, 64, 0.08), 
                    0 10px 10px -5px rgba(46, 52, 64, 0.03);

/* Dark mode shadows (automatically applied) */
.dark .shadow-nordic { ... }
```

### Usage

```tsx
<Card className="shadow-nordic">                {/* Default card */}
<Card className="shadow-nordic-md hover:shadow-nordic-lg transition-shadow">  
                                                 {/* Interactive card */}
<Dialog className="shadow-nordic-xl">           {/* Modal overlay */}
```

### Elevation Levels

1. **Base (no shadow)** - Inline elements, backgrounds
2. **Raised (shadow-nordic-sm)** - Cards, inputs
3. **Floating (shadow-nordic-md)** - Dropdowns, popovers
4. **Modal (shadow-nordic-lg)** - Dialogs, sheets
5. **Overlay (shadow-nordic-xl)** - Command palette, large modals

---

## Dark Mode

### Implementation

Dark mode uses **class-based toggling** with `next-themes`:

```tsx
// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider';

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### Theme Toggle

```tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

### Dark Mode Color Adjustments

- **Backgrounds:** Midnight → Slate → Slate Dark (layering)
- **Text:** Snow → Frost → Polar (contrast levels)
- **Borders:** Subtle, same color as backgrounds
- **Shadows:** Darker, more pronounced
- **Brand colors:** Remain consistent (Nordic Blue, Aurora colors)

---

## Accessibility

### WCAG 2.1 Level AA Compliance

All components meet minimum accessibility standards:

#### Color Contrast

- **Normal text (16px+):** 4.5:1 minimum
- **Large text (24px+):** 3:1 minimum
- **UI components:** 3:1 minimum
- **Focus indicators:** 3:1 minimum

Our Nordic colors meet these requirements:
- ✅ Midnight on Snow: 13.7:1
- ✅ Slate on Frost: 7.2:1
- ✅ Nordic Blue on White: 5.1:1

#### Keyboard Navigation

All interactive elements support:
- **Tab** - Navigate between focusable elements
- **Shift + Tab** - Reverse navigation
- **Enter/Space** - Activate buttons, checkboxes
- **Arrow keys** - Navigate menus, select options
- **Escape** - Close dialogs, dropdowns

#### Screen Reader Support

- Semantic HTML (headings, landmarks, lists)
- ARIA labels for all interactive elements
- ARIA live regions for dynamic content
- Alt text for images
- Form labels properly associated

#### Focus Management

```tsx
// Visible focus indicators
<Button className="focus:ring-2 focus:ring-ring focus:ring-offset-2">

// Focus trap in dialogs (automatic with shadcn/ui)
<Dialog>  {/* Focus trapped when open */}
```

---

## Implementation Guide

### Setup Steps

#### 1. Install Dependencies

```bash
# Core dependencies
npm install tailwindcss postcss autoprefixer
npm install tailwindcss-animate
npm install class-variance-authority clsx tailwind-merge
npm install next-themes

# Icons
npm install lucide-react

# Initialize Tailwind
npx tailwindcss init -p
```

#### 2. Initialize shadcn/ui

```bash
npx shadcn-ui@latest init
```

Configuration:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: tailwind.config.ts
- Components: @/components
- Utils: @/lib/utils

#### 3. Configure Tailwind

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Nordic palette
        nordic: {
          snow: '#ECEFF4',
          frost: '#E5E9F0',
          polar: '#D8DEE9',
          'slate-light': '#4C566A',
          slate: '#434C5E',
          'slate-dark': '#3B4252',
          midnight: '#2E3440',
          ice: '#8FBCBB',
          'frost-blue': '#88C0D0',
          'aurora-blue': '#81A1C1',
          'nordic-blue': '#5E81AC',
          'aurora-green': '#A3BE8C',
          'aurora-yellow': '#EBCB8B',
          'aurora-orange': '#D08770',
          'aurora-red': '#BF616A',
          'aurora-purple': '#B48EAD',
        },
        // Semantic colors (for shadcn/ui)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      boxShadow: {
        'nordic-sm': '0 1px 2px 0 rgba(46, 52, 64, 0.05)',
        'nordic-md': '0 4px 6px -1px rgba(46, 52, 64, 0.08), 0 2px 4px -1px rgba(46, 52, 64, 0.04)',
        'nordic-lg': '0 10px 15px -3px rgba(46, 52, 64, 0.08), 0 4px 6px -2px rgba(46, 52, 64, 0.04)',
        'nordic-xl': '0 20px 25px -5px rgba(46, 52, 64, 0.08), 0 10px 10px -5px rgba(46, 52, 64, 0.03)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

#### 4. Add Global Styles

See `technology.md` "Global Styles (Nordic Theme)" section for complete CSS.

#### 5. Add Theme Provider

```tsx
// components/theme-provider.tsx
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 6. Add Components

```bash
# Add components as needed
npx shadcn-ui@latest add button card input label form
npx shadcn-ui@latest add sheet dialog toast table
```

---

## Resources

### Documentation

- **This Document:** Complete design system reference
- **technology.md:** Technical implementation details
- **requirements.md:** UX and accessibility requirements
- **COMPONENT-LIBRARY-DECISION.md:** Component library rationale
- **nordic-theme-migration.md:** Migration guide from custom CSS

### External Resources

- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Radix UI:** https://www.radix-ui.com
- **Lucide Icons:** https://lucide.dev
- **next-themes:** https://github.com/pacocoursey/next-themes
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

### Design Tools

- **Tailwind CSS IntelliSense:** VS Code extension for autocomplete
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Accessibility Inspector:** Browser DevTools

---

## Changelog

### Version 1.0 (2026-01-15)
- Initial design system specification
- Nordic color palette defined
- Technology stack decided (Tailwind + shadcn/ui + Lucide)
- Component library chosen and documented
- Accessibility standards established
- Implementation guide created

---

**Status:** ✅ Complete  
**Last Updated:** 2026-01-15  
**Next Review:** After MVP implementation
