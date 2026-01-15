# Development Guide

**Version:** 1.0  
**Last Updated:** 2026-01-15  
**Status:** Approved

---

## Overview

This document covers the development workflow, tooling, testing strategies, and deployment procedures for Agent Studio.

**Related Documents:**
- **[technology.md](./technology.md)** - Technology stack and architecture
- **[theme.md](./theme.md)** - Design system and styling
- **[layout.md](./layout.md)** - Application structure and routing
- **[auth.md](./auth.md)** - Authentication setup
- **[requirements.md](./requirements.md)** - Functional requirements

---

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Testing Strategy](#testing-strategy)
3. [Code Quality](#code-quality)
4. [Environment Setup](#environment-setup)
5. [Deployment](#deployment)
6. [Best Practices](#best-practices)

---

## Development Workflow

### Package Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "husky install"
  }
}
```

### Git Hooks (Husky)

**Installation:**

```bash
npm install -D husky lint-staged
npx husky init
```

**Configuration:**

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

**Pre-commit Hook:**

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run type-check
```

**Pre-push Hook:**

```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test
npm run build
```

### Development Server

```bash
# Start development server
npm run dev

# Server runs on http://localhost:3000
# - Hot Module Replacement (HMR) enabled
# - Fast Refresh for instant updates
# - TypeScript type checking in background
```

---

## Testing Strategy

### Unit Tests

**Framework:** Vitest + React Testing Library

**Installation:**

```bash
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Configuration:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

// vitest.setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

**Example Unit Test:**

```typescript
// __tests__/components/agent-card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentCard } from '@/components/features/agents/agent-card'

describe('AgentCard', () => {
  const mockAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    status: 'running',
    description: 'Test description',
  }

  it('renders agent name', () => {
    render(<AgentCard agent={mockAgent} />)
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })

  it('shows running status badge', () => {
    render(<AgentCard agent={mockAgent} />)
    const badge = screen.getByText('running')
    expect(badge).toHaveClass('badge-success')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    const { user } = render(<AgentCard agent={mockAgent} onClick={onClick} />)
    
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(mockAgent)
  })
})
```

**Testing Server Components:**

```typescript
// __tests__/app/agents/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgentsPage from '@/app/(dashboard)/agents/page'

// Mock Server Actions
vi.mock('@/actions/agents', () => ({
  getAgents: vi.fn(() => Promise.resolve([
    { id: '1', name: 'Agent 1', status: 'running' },
    { id: '2', name: 'Agent 2', status: 'idle' },
  ])),
}))

describe('AgentsPage', () => {
  it('renders list of agents', async () => {
    render(await AgentsPage())
    expect(screen.getByText('Agent 1')).toBeInTheDocument()
    expect(screen.getByText('Agent 2')).toBeInTheDocument()
  })
})
```

### Integration Tests

**API Route Testing:**

```typescript
// __tests__/api/agents.test.ts
import { describe, it, expect } from 'vitest'
import { GET, POST } from '@/app/api/agents/route'

describe('/api/agents', () => {
  describe('GET', () => {
    it('returns list of agents', async () => {
      const response = await GET()
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('POST', () => {
    it('creates new agent', async () => {
      const request = new Request('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Agent',
          description: 'Test agent',
          template: 'template-1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('New Agent')
    })
  })
})
```

### End-to-End Tests

**Framework:** Playwright

**Installation:**

```bash
npm install -D @playwright/test
npx playwright install
```

**Configuration:**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Example E2E Test:**

```typescript
// e2e/agents.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Agents Management', () => {
  test('should display agents list', async ({ page }) => {
    await page.goto('/agents')
    
    // Check page loaded
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible()
    
    // Check agents table
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText('Customer Support Agent')).toBeVisible()
  })

  test('should create new agent', async ({ page }) => {
    await page.goto('/agents')
    
    // Click create button
    await page.getByRole('button', { name: 'Create Agent' }).click()
    
    // Fill form
    await page.getByLabel('Agent Name').fill('Test Agent')
    await page.getByLabel('Description').fill('Test description')
    await page.getByLabel('Template').selectOption('customer-support-v1')
    
    // Submit
    await page.getByRole('button', { name: 'Deploy' }).click()
    
    // Check success
    await expect(page.getByText('Agent deployed successfully')).toBeVisible()
  })

  test('should open agent details in slider', async ({ page }) => {
    await page.goto('/agents')
    
    // Click on agent row
    await page.getByText('Customer Support Agent').click()
    
    // Check slider opened
    await expect(page.getByRole('complementary')).toBeVisible()
    await expect(page.getByText('Agent Details')).toBeVisible()
    
    // Close with ESC
    await page.keyboard.press('Escape')
    await expect(page.getByRole('complementary')).not.toBeVisible()
  })
})
```

**Visual Regression Tests:**

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveScreenshot('dashboard.png')
  })

  test('agents page matches snapshot', async ({ page }) => {
    await page.goto('/agents')
    await expect(page).toHaveScreenshot('agents-page.png')
  })
})
```

### Test Coverage Goals

- **Unit Tests:** 80% minimum coverage
- **Integration Tests:** All API routes
- **E2E Tests:** Critical user flows
- **Visual Regression:** Key pages and components

---

## Code Quality

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
}
```

### Prettier Configuration

```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  plugins: ['prettier-plugin-tailwindcss'], // Sorts Tailwind classes
}
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Environment Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm, npm, or yarn
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd agent-studio

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Initialize git hooks
npx husky install

# Initialize shadcn/ui
npx shadcn-ui@latest init

# Run development server
npm run dev
```

### Environment Variables

```env
# .env.example (template)

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# OIDC/SSO Provider
OIDC_WELL_KNOWN_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=

# External Service (Phase 2)
EXTERNAL_SERVICE_URL=
EXTERNAL_API_KEY=

# Feature Flags
USE_EXTERNAL_SERVICE=false
ENABLE_ANALYTICS=false

# Optional: Monitoring
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

### IDE Setup

**VS Code Extensions (Recommended):**

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
```

**VS Code Settings:**

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## Testing Strategy

### Test Organization

```
__tests__/
├── components/          # Component unit tests
│   ├── ui/
│   │   └── button.test.tsx
│   └── features/
│       └── agents/
│           └── agent-card.test.tsx
│
├── hooks/               # Custom hooks tests
│   └── use-permissions.test.ts
│
├── lib/                 # Utility function tests
│   └── utils.test.ts
│
├── actions/             # Server Actions tests
│   └── agents.test.ts
│
└── api/                 # API route tests
    └── agents.test.ts

e2e/
├── agents.spec.ts       # Agents E2E tests
├── conversations.spec.ts # Conversations E2E tests
├── tasks.spec.ts        # Tasks E2E tests
└── auth.spec.ts         # Authentication E2E tests
```

### Testing Best Practices

#### 1. Test Behavior, Not Implementation

```typescript
// Good - Tests behavior
it('displays error message when form is invalid', async () => {
  render(<AgentForm />)
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(screen.getByText('Name is required')).toBeInTheDocument()
})

// Avoid - Tests implementation
it('sets error state', () => {
  const { result } = renderHook(() => useForm())
  result.current.setError('name', { message: 'Name is required' })
  expect(result.current.formState.errors.name).toBeDefined()
})
```

#### 2. Use Testing Library Queries Correctly

```typescript
// Preferred order (accessibility-first)
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email')
screen.getByPlaceholderText('Enter email')
screen.getByText('Welcome')
screen.getByTestId('agent-card') // Last resort
```

#### 3. Mock External Dependencies

```typescript
// __tests__/helpers/mocks.ts
import { vi } from 'vitest'

export const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, status: 'authenticated' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
```

#### 4. Test Accessibility

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('has no accessibility violations', async () => {
  const { container } = render(<AgentCard agent={mockAgent} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Deployment

### Vercel (Recommended)

**Why Vercel:**
- Built for Next.js (same team)
- Zero-config deployment
- Automatic HTTPS
- Edge Network CDN
- Environment variables management
- Preview deployments for PRs

**Setup:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Production deployment
vercel --prod
```

**Configuration:**

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXTAUTH_SECRET": "@nextauth-secret"
  }
}
```

### Docker Deployment

**Dockerfile:**

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Docker Compose:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    env_file:
      - .env.production
    restart: unless-stopped
```

**Build and Run:**

```bash
# Build image
docker build -t agent-studio .

# Run container
docker run -p 3000:3000 --env-file .env.production agent-studio

# Using docker-compose
docker-compose up -d
```

### Kubernetes Deployment

**Deployment Manifest:**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-studio
  labels:
    app: agent-studio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-studio
  template:
    metadata:
      labels:
        app: agent-studio
    spec:
      containers:
      - name: agent-studio
        image: agent-studio:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: agent-studio-secrets
              key: nextauth-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Service Manifest:**

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: agent-studio-service
spec:
  selector:
    app: agent-studio
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

**Secrets:**

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: agent-studio-secrets
type: Opaque
stringData:
  nextauth-secret: <base64-encoded-secret>
  oidc-client-secret: <base64-encoded-secret>
```

**Deploy:**

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Check status
kubectl get pods
kubectl logs -f deployment/agent-studio
```

### CI/CD Pipeline

**GitHub Actions:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
```

**Deployment Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Best Practices

### 1. Type Safety

```typescript
// Always define proper types
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus; // Use union types
  createdAt: Date;
}

export type AgentStatus = 'running' | 'idle' | 'paused' | 'error' | 'terminated';

// Avoid 'any' - use 'unknown' if type is truly unknown
function processData(data: unknown) {
  if (typeof data === 'string') {
    // Type narrowing
  }
}
```

### 2. Error Boundaries

```typescript
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
```

### 3. Loading States

```typescript
// app/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

// Using Suspense
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<AgentListSkeleton />}>
      <AgentList />
    </Suspense>
  );
}
```

### 4. Metadata & SEO

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Agent Studio',
    template: '%s | Agent Studio',
  },
  description: 'Build and manage AI agents',
  keywords: ['AI', 'agents', 'automation'],
  authors: [{ name: 'Your Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://agentstudio.com',
    siteName: 'Agent Studio',
  },
};

// Dynamic metadata for pages
// app/agents/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const agent = await getAgent(params.id);
  
  return {
    title: agent.name,
    description: agent.description,
  };
}
```

### 5. Code Organization

**Principles:**
- **Colocation**: Keep related files close
- **Feature-based**: Group by feature, not file type
- **Barrel exports**: Use `index.ts` for cleaner imports
- **Absolute imports**: Use `@/*` path alias

```typescript
// Good structure
components/
└── features/
    └── agents/
        ├── agent-card.tsx
        ├── agent-card.test.tsx
        ├── agent-form.tsx
        ├── agent-list.tsx
        └── index.ts  // Barrel export

// index.ts
export { AgentCard } from './agent-card'
export { AgentForm } from './agent-form'
export { AgentList } from './agent-list'

// Usage
import { AgentCard, AgentList } from '@/components/features/agents'
```

### 6. Performance Optimization

```typescript
// Use next/image for images
import Image from 'next/image'

<Image
  src="/agent-avatar.png"
  alt="Agent"
  width={48}
  height={48}
  priority // For above-the-fold images
/>

// Lazy load heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./heavy-chart'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false, // Only load on client if needed
})

// Use Suspense boundaries
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

### 7. Environment Variables

```typescript
// lib/env.ts - Centralize env variable access
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

// Validate on startup
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  // Server-only
  nextAuthSecret: process.env.NEXTAUTH_SECRET!,
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET!,
  
  // Public (NEXT_PUBLIC_ prefix)
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  
  // Feature flags
  useExternalService: process.env.USE_EXTERNAL_SERVICE === 'true',
} as const;
```

---

## Resources

### Documentation
- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook

### Testing
- **Vitest**: https://vitest.dev
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro
- **Playwright**: https://playwright.dev

### Tools
- **Vercel**: https://vercel.com/docs
- **Docker**: https://docs.docker.com
- **Kubernetes**: https://kubernetes.io/docs

---

**Status:** ✅ Complete  
**Last Updated:** 2026-01-15  
**Next Review:** After MVP implementation
