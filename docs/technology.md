# Technology Stack & Architecture

**Version:** 1.0  
**Last Updated:** 2026-01-15  
**Status:** Approved

---

## Overview

This document specifies the technology stack, architecture patterns, and technical decisions for Agent Studio. The platform uses **Next.js 14+** with the App Router, TypeScript, and modern best practices for building scalable, performant web applications.

**Related Documents:**
- **[theme.md](./theme.md)** - Complete design system specifications
- **[layout.md](./layout.md)** - Project structure and routing patterns
- **[development.md](./development.md)** - Development workflow and deployment
- **[auth.md](./auth.md)** - Authentication implementation
- **[requirements.md](./requirements.md)** - Functional requirements

## Core Technologies

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: pnpm (or npm/yarn)
- **Styling**: Tailwind CSS v3.4+ with Nordic design system ([see theme.md](./theme.md))
- **UI Components**: shadcn/ui (Radix UI primitives) ([see theme.md](./theme.md))
- **State Management**: React Context + Zustand (for complex global state)
- **Data Fetching**: React Server Components, Server Actions
- **Real-time Communication**: Server-Sent Events (SSE) + REST API for chat streaming
- **Form Handling**: React Hook Form + Zod validation
- **Icons**: Lucide React ([see theme.md](./theme.md))

---

## Project Structure & Routing

> **📘 Complete Layout & Routing Guide:** For detailed project structure, routing patterns, and layout implementations, see **[`layout.md`](./layout.md)**

### Quick Overview

**Project Organization:**
```
agent-studio/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (no shell)
│   ├── (dashboard)/       # Main app (with shell)
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   ├── features/         # Feature components
│   └── shared/           # Shared components
├── lib/                   # Utilities
├── hooks/                 # Custom hooks
├── store/                 # State management
├── types/                 # TypeScript types
├── actions/               # Server Actions
└── config/                # Configuration
```

**Key Routing Patterns:**
- Route Groups: `(auth)`, `(dashboard)` - organize without affecting URLs
- Dynamic Routes: `[id]` - `/agents/123`
- Nested Layouts: `layout.tsx` - shared UI wrappers
- Parallel Routes: `@modal` - render multiple pages simultaneously
- Server Actions: `actions/` - server-side data mutations

See [`layout.md`](./layout.md) for:
- Complete folder structure
- Routing conventions and patterns
- Layout component hierarchy
- Responsive design specifications
- Implementation examples

---

## Architecture Patterns

### Client-Server Separation

**Core Principle:** Server Components by default, Client Components only when needed

**Server Components (Default):**
- ✅ Data fetching
- ✅ Accessing backend resources
- ✅ Sensitive operations (API keys, tokens)
- ✅ Large dependencies

**Client Components (`'use client'`):**
- ✅ Interactivity (onClick, onChange, etc.)
- ✅ Browser APIs (localStorage, window, etc.)
- ✅ React hooks (useState, useEffect, custom hooks)
- ✅ Event listeners

**Best Practices:**

1. **Keep Client Components at leaf nodes** - Server Component wraps Client Components
2. **Server Actions for mutations** - Use instead of API routes when possible
3. **Pass serializable props only** - No functions or Date objects to Client Components

See [`development.md`](./development.md) for detailed patterns and examples.

---

## Design System

> **📘 Complete Design Specifications:** [`theme.md`](./theme.md)  
> **📘 Layout & Structure:** [`layout.md`](./layout.md)

**Styling:** Tailwind CSS v3.4+ with Nordic design system  
**Components:** shadcn/ui (Radix UI primitives)  
**Icons:** Lucide React

See referenced documents for complete specifications.

---

## Best Practices & Guidelines

> **📘 Complete Development Guide:** For testing, deployment, and detailed best practices, see **[`development.md`](./development.md)**

### Key Principles

1. **Type Safety First**
   - Use TypeScript strict mode
   - Avoid `any`, use `unknown` if needed
   - Define proper interfaces for all data models

2. **Server Components by Default**
   - Use Client Components only when needed (interactivity, hooks)
   - Keep Client Components at leaf nodes
   - Pass serializable props only

3. **Error Handling**
   - Use Error Boundaries (`error.tsx`)
   - Implement proper error responses in API routes
   - Log errors appropriately

4. **Performance**
   - Use `next/image` for images
   - Lazy load heavy components
   - Use Suspense for async operations
   - Leverage Server Components to reduce bundle size

5. **Code Organization**
   - Colocation: Keep related files together
   - Feature-based structure
   - Use absolute imports (`@/*`)
   - Barrel exports for cleaner imports

See [`development.md`](./development.md) for complete testing strategy, deployment guides, and detailed best practices.

---

## Backend Architecture

### Overview

Agent Studio uses a **phased backend approach** that enables parallel frontend/backend development and easy migration to production services.

**Architecture:** Next.js API Routes + Server Actions  
**Data Strategy:** Phased approach (dummy → external service)  
**Scope:** Frontend + API layer (no direct database management)

### Phased Implementation Strategy

#### Phase 1: MVP Development (Dummy Data)

Use dummy JSON collections to simulate API responses without external dependencies.

**Benefits:**
- ✅ Frontend development can proceed immediately
- ✅ No external service dependencies during development
- ✅ Fast iteration and testing
- ✅ Consistent API contract defined early

**Implementation:**

```typescript
// lib/data/dummy-agents.ts
export const DUMMY_AGENTS = [
  {
    id: 'agent-1',
    name: 'Customer Support Agent',
    status: 'running',
    template: 'customer-support-v1',
    createdAt: new Date('2026-01-10').toISOString(),
    lastActive: new Date('2026-01-15').toISOString(),
  },
  {
    id: 'agent-2',
    name: 'Data Analysis Agent',
    status: 'idle',
    template: 'data-analysis-v1',
    createdAt: new Date('2026-01-12').toISOString(),
    lastActive: new Date('2026-01-14').toISOString(),
  },
];

// app/api/agents/route.ts
import { NextResponse } from 'next/server';
import { DUMMY_AGENTS } from '@/lib/data/dummy-agents';

export async function GET() {
  // Phase 1: Return dummy data
  return NextResponse.json({
    success: true,
    data: DUMMY_AGENTS,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Phase 1: Simulate creation
  const newAgent = {
    id: `agent-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  
  // In-memory (will be lost on restart - that's fine for Phase 1)
  DUMMY_AGENTS.push(newAgent);
  
  return NextResponse.json({
    success: true,
    data: newAgent,
  });
}
```

#### Phase 2: Production (External Service)

Replace dummy data with external service API calls while maintaining the same API contract.

**Implementation:**

```typescript
// lib/api/external-service.ts
const EXTERNAL_API_URL = process.env.EXTERNAL_SERVICE_URL;

export async function getAgents() {
  const response = await fetch(`${EXTERNAL_API_URL}/agents`, {
    headers: {
      'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch agents');
  }
  
  return response.json();
}

export async function createAgent(data: CreateAgentInput) {
  const response = await fetch(`${EXTERNAL_API_URL}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create agent');
  }
  
  return response.json();
}

// app/api/agents/route.ts
import { NextResponse } from 'next/server';
import { getAgents, createAgent } from '@/lib/api/external-service';

export async function GET() {
  try {
    // Phase 2: Call external service
    const agents = await getAgents();
    
    return NextResponse.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Phase 2: Call external service
    const agent = await createAgent(body);
    
    return NextResponse.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
```

**Key Point:** Frontend code remains unchanged when switching from Phase 1 to Phase 2!

```typescript
// Frontend code (same for both phases)
async function fetchAgents() {
  const response = await fetch('/api/agents');
  const { data } = await response.json();
  return data;
}
```

### API Structure

#### REST API Conventions

All API routes follow consistent conventions:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Standard HTTP Status Codes:**
- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

#### API Routes Structure

```
app/api/
├── agents/
│   ├── route.ts                 # GET /api/agents, POST /api/agents
│   ├── [id]/
│   │   ├── route.ts            # GET, PATCH, DELETE /api/agents/:id
│   │   ├── start/route.ts      # POST /api/agents/:id/start
│   │   ├── stop/route.ts       # POST /api/agents/:id/stop
│   │   └── status/route.ts     # GET /api/agents/:id/status (SSE)
│
├── templates/
│   ├── route.ts                # GET /api/templates, POST /api/templates
│   └── [id]/route.ts           # GET, PATCH, DELETE /api/templates/:id
│
├── conversations/
│   ├── route.ts                # GET /api/conversations, POST /api/conversations
│   ├── [id]/
│   │   ├── route.ts            # GET, DELETE /api/conversations/:id
│   │   ├── messages/route.ts   # POST /api/conversations/:id/messages
│   │   └── stream/route.ts     # GET /api/conversations/:id/stream (SSE)
│
├── tasks/
│   ├── route.ts                # GET /api/tasks, POST /api/tasks
│   └── [id]/
│       ├── route.ts            # GET, PATCH /api/tasks/:id
│       ├── approve/route.ts    # POST /api/tasks/:id/approve
│       └── reject/route.ts     # POST /api/tasks/:id/reject
│
├── knowledge/
│   ├── route.ts                # GET /api/knowledge
│   └── [id]/route.ts           # GET, PATCH, DELETE /api/knowledge/:id
│
└── performance/
    ├── metrics/route.ts        # GET /api/performance/metrics
    └── analytics/route.ts      # GET /api/performance/analytics
```

### Data Models (TypeScript Interfaces)

Define TypeScript interfaces for all data models:

```typescript
// types/agent.ts
export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'idle' | 'paused' | 'error' | 'terminated';
  template: string;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
  metrics?: AgentMetrics;
}

export interface AgentMetrics {
  uptime: number;
  tasksCompleted: number;
  tasksCreated: number;
  conversationsActive: number;
  errorRate: number;
}

export type CreateAgentInput = Pick<Agent, 'name' | 'description' | 'template'>;
export type UpdateAgentInput = Partial<CreateAgentInput>;

// types/task.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'draft' | 'decision' | 'validation' | 'exception' | 'config' | 'action';
  status: 'pending' | 'in-review' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string; // agent ID
  assignedTo?: string; // user ID
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  content: Record<string, any>; // Task-specific content
}

export type CreateTaskInput = Pick<Task, 'title' | 'description' | 'type' | 'priority' | 'content'>;

// types/conversation.ts
export interface Conversation {
  id: string;
  userId: string;
  agents: string[]; // agent IDs
  status: 'active' | 'idle' | 'archived';
  startedAt: string;
  lastActivity: string;
  metadata?: Record<string, any>;
}

export interface Topic {
  id: string;
  conversationId: string;
  agentId: string;
  name: string;
  type: 'default' | 'custom';
  status: 'active' | 'resolved' | 'archived';
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  topicId: string;
  sender: 'user' | 'agent';
  senderId: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

### Environment Variables

```env
# .env.local

# Phase 1 (Development)
NODE_ENV=development

# Phase 2 (Production)
EXTERNAL_SERVICE_URL=https://api.external-service.com
EXTERNAL_API_KEY=your-api-key-here

# Optional: Feature flags
USE_EXTERNAL_SERVICE=false  # Toggle between Phase 1/2
```

### Error Handling

```typescript
// lib/api/error-handler.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }
  
  console.error('Unexpected error:', error);
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// Usage in routes
export async function GET() {
  try {
    const agents = await getAgents();
    return NextResponse.json({ success: true, data: agents });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

### Benefits of This Approach

1. **Separation of Concerns**
   - Agent Studio: UI/UX layer
   - External Service: Business logic, persistence, AI runtime

2. **Parallel Development**
   - Frontend team: Work with dummy data immediately
   - Backend team: Develop external service independently
   - No blocking dependencies

3. **Easy Migration**
   - Switch from Phase 1 → Phase 2 by changing one file
   - Frontend code untouched
   - Gradual rollout possible (feature flags)

4. **Testing**
   - Phase 1: Easy to test with predictable dummy data
   - Phase 2: Can mock external service calls
   - Same API contract for both phases

5. **Scalability**
   - External service can scale independently
   - Agent Studio focuses on optimal UX
   - Can swap external services without frontend changes

---

## Real-time Communication

### Architecture Decision: SSE + REST

**Approach:** Server-Sent Events (SSE) for server-to-client streaming + REST API for client-to-server communication

**Why SSE:**
- Simpler than WebSockets for one-way streaming
- Perfect for AI token-by-token response streaming
- Auto-reconnection built into browsers
- Standard HTTP (firewall/proxy friendly)

**When to Use Each:**
- **SSE:** Streaming agent responses, typing indicators, live updates, notifications
- **REST:** Sending messages, CRUD operations, all client-to-server requests

**Key Implementation Pattern:**

```typescript
// Server: Stream responses
export async function GET(request: NextRequest) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Stream events
  await writer.write(encoder.encode(`event: message\ndata: {...}\n\n`));
  
  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// Client: Listen to stream
const eventSource = new EventSource('/api/stream');
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  // Handle streamed data
});
```


---

## Resources

### Documentation
- **Next.js**: https://nextjs.org/docs
- **React Server Components**: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- **TypeScript**: https://www.typescriptlang.org/docs

### Project Documentation
- [`theme.md`](./theme.md) - Design system and styling
- [`layout.md`](./layout.md) - Application layout and routing
- [`auth.md`](./auth.md) - Authentication and authorization
- [`development.md`](./development.md) - Development workflow, testing, deployment

---

**Status:** ✅ Complete  
**Last Updated:** 2026-01-15  
**Next Review:** After MVP implementation
