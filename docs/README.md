# Agent Studio Documentation

Welcome to Agent Studio - a general-purpose AI agent platform. This documentation provides comprehensive specifications for building the application.

---

## 📋 Quick Start

**New to the project? Read in this order:**

1. **[requirements.md](./requirements.md)** - What we're building
2. **[theme.md](./theme.md)** - How it looks
3. **[layout.md](./layout.md)** - Application structure
4. **[technology.md](./technology.md)** - Tech stack & architecture
5. **[auth.md](./auth.md)** - Authentication
6. **[development.md](./development.md)** - Development & deployment

---

## 📚 Core Specifications

### [requirements.md](./requirements.md)
**820 lines** | Comprehensive requirements specification

**Contains:**
- Functional modules (Tasks, Agents, Conversations, Knowledge, Performance)
- User interface requirements
- Cross-cutting concerns (Auth, Security, Observability)
- Success criteria and glossary

---

### [theme.md](./theme.md)
**943 lines** | Complete design system

**Contains:**
- Nordic color palette (light/dark mode)
- Typography, spacing, and layout system
- Component library decision (shadcn/ui)
- Icon system (Lucide React)
- Accessibility standards (WCAG 2.1 AA)
- Implementation guide

---

### [layout.md](./layout.md)
**1,096 lines** | Application layout & UX structure

**Contains:**
- Application shell (header, sidebar, main content, right slider)
- Navigation structure (7 main sections, hierarchical)
- Routing organization (Next.js App Router)
- Component hierarchy and state management
- Responsive design (desktop, tablet, mobile)
- Accessibility and keyboard navigation

---

### [technology.md](./technology.md)
**622 lines** | Technology stack & architecture decisions

**Contains:**
- Core technologies (Next.js 14+, TypeScript, Tailwind CSS)
- Architecture patterns (Client/Server separation)
- Backend architecture (phased: dummy data → external service)
- Real-time communication (SSE + REST)
- Key technical decisions and rationale

---

### [auth.md](./auth.md)
**929 lines** | Authentication & authorization

**Contains:**
- NextAuth.js setup and configuration
- OIDC/SSO integration
- Role-based access control (RBAC)
- Multi-tenancy / organization support
- Route protection and security best practices

---

### [development.md](./development.md)
**1,243 lines** | Development workflow & deployment

**Contains:**
- Development workflow and scripts
- Testing strategy (Unit, Integration, E2E)
- Code quality tools (ESLint, Prettier, TypeScript)
- Environment setup and configuration
- Deployment guides (Vercel, Docker, Kubernetes)
- CI/CD pipelines (GitHub Actions)

---

## 📂 Domain Documentation

| Domain | Description | Start Here |
|--------|-------------|------------|
| [auth/](./auth/README.md) | Authentication, SSO, tenants, security | [SSO Quick Reference](./auth/SSO_QUICK_REFERENCE.md) |
| [deploy/](./deploy/README.md) | Docker, CI/CD, cloud deployment | [Quick Start](./deploy/QUICK_START.md) |
| [configuration-wizard/](./configuration-wizard/README.md) | Agent workflow configuration wizard | [Unified Wizard Flow](./configuration-wizard/UNIFIED_WIZARD_FLOW.md) |
| [implementation-notes/](./implementation-notes/README.md) | Fixes, features (toast, SSE, API) | [README](./implementation-notes/README.md) |
| [pr-review-tests/](./pr-review-tests/README.md) | PR review rules | [README](./pr-review-tests/README.md) |

---

## 📁 Document Structure

```
docs/
├── README.md                    - This file (documentation index)
├── DOCUMENTATION_GUIDELINES.md  - Documentation standards (read before contributing)
│
├── Core Specifications
│   ├── requirements.md          - WHAT to build
│   ├── theme.md                 - Design system
│   ├── layout.md                - Application structure
│   ├── technology.md            - Tech stack & architecture
│   ├── auth.md                  - Authentication (→ auth/auth.md)
│   └── development.md           - Development & deployment
│
├── auth/                        - Authentication domain (SSO, tenant, security)
├── deploy/                      - Deployment & DevOps (Docker, CI/CD)
├── configuration-wizard/        - Agent configuration wizard flows
├── implementation-notes/        - Fixes, features (toast, SSE, API fixes)
└── pr-review-tests/             - PR review rules & tests
```

> **Contributing to docs?** Read [DOCUMENTATION_GUIDELINES.md](./DOCUMENTATION_GUIDELINES.md) for structure, tone, and standards.

---

## 🎯 Quick Lookup

**"I want to know..."**

| Question | Document |
|----------|----------|
| What features we're building | [requirements.md](./requirements.md) |
| What colors to use | [theme.md#color-system](./theme.md#color-system) |
| What components are available | [theme.md#components](./theme.md#components) |
| How the layout is structured | [layout.md](./layout.md) |
| How routing works | [layout.md#routing-structure](./layout.md#routing-structure) |
| How to style something | [theme.md](./theme.md) |
| Backend architecture | [technology.md#backend-architecture](./technology.md#backend-architecture) |
| Real-time implementation | [technology.md#real-time-communication](./technology.md#real-time-communication) |
| How to authenticate users | [auth.md](./auth.md) |
| How to implement RBAC | [auth.md#role-based-access-control-rbac](./auth.md#role-based-access-control-rbac) |
| How to test | [development.md#testing-strategy](./development.md#testing-strategy) |
| How to deploy | [deploy/README.md](./deploy/README.md) |
| Configuration wizard flow | [configuration-wizard/README.md](./configuration-wizard/README.md) |
| Toast notifications | [implementation-notes/TOAST.md](./implementation-notes/TOAST.md) |
| Real-time messaging (SSE) | [implementation-notes/SSE_REAL_TIME_MESSAGING.md](./implementation-notes/SSE_REAL_TIME_MESSAGING.md) |

---

## 🚀 Getting Started by Role

### For Developers

1. Read [requirements.md](./requirements.md) - Understand the product
2. Read [theme.md](./theme.md) - Understand the design system
3. Read [layout.md](./layout.md) - Understand the structure
4. Read [technology.md](./technology.md) - Understand the tech stack
5. Read [auth.md](./auth.md) - Understand authentication
6. Read [development.md](./development.md) - Set up dev environment
7. **Start coding!**

*Contributing to docs?* Read [DOCUMENTATION_GUIDELINES.md](./DOCUMENTATION_GUIDELINES.md) first.

### For Designers

1. Read [requirements.md](./requirements.md) - Understand features
2. Read [theme.md](./theme.md) - Complete design system
3. Read [layout.md](./layout.md) - Application structure
4. Use Nordic color palette and spacing tokens
5. Reference shadcn/ui components for patterns

### For Product Managers

1. Read [requirements.md](./requirements.md) - All features and requirements
2. Review success criteria and priorities
3. Track progress against requirements

---

## 📊 Document Status

| Document | Lines | Status | Last Updated |
|----------|-------|--------|--------------|
| requirements.md | 820 | ✅ Complete | 2026-01-15 |
| theme.md | 943 | ✅ Complete | 2026-01-15 |
| layout.md | 1,096 | ✅ Complete | 2026-01-15 |
| technology.md | 622 | ✅ Complete | 2026-01-15 |
| auth.md | 929 | ✅ Complete | 2026-01-15 |
| development.md | 1,243 | ✅ Complete | 2026-01-15 |

**Total:** 6,653 lines of comprehensive specifications

---

## ✅ Key Decisions Made

1. **Styling:** Tailwind CSS + shadcn/ui with Nordic design system
2. **Components:** shadcn/ui (code ownership, accessibility, Radix UI)
3. **Dark Mode:** Class-based with next-themes
4. **Backend:** Phased approach (dummy data → external service)
5. **Real-time:** SSE + REST (not WebSockets)
6. **Auth:** NextAuth.js with OIDC/SSO
7. **Layout:** Continuous page (no footer)

---

## 📝 Conventions

### Requirement IDs
- Format: `MODULE-NNN` (e.g., `AS-001`, `TASK-001`)
- Used in requirements.md for traceability

### Priority Levels
- **P0:** Must have for launch
- **P1:** Should have, important
- **P2:** Nice to have
- **P3:** Future enhancement

### Status Indicators
- ✅ Complete/Resolved
- 📝 In Progress
- ⚠️ Needs Attention
- 🔴 Critical
- 🟡 Warning

---

## 🔄 Updating Documentation

### When to Update

- **requirements.md** - When adding/changing features
- **theme.md** - When changing design tokens or components
- **layout.md** - When changing structure or navigation
- **technology.md** - When adopting new technologies
- **auth.md** - When changing authentication
- **development.md** - When updating workflow or deployment

### How to Update

1. Edit the relevant document(s)
2. Update "Last Updated" date in the document
3. Update cross-references if needed
4. Update this README if adding new documents
5. Commit: `docs: update [document] - [reason]`

### Documentation Standards

For structure, hierarchy, tone, granularity, and naming conventions, see **[DOCUMENTATION_GUIDELINES.md](./DOCUMENTATION_GUIDELINES.md)**.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│         Agent Studio (Frontend)         │
│  ┌───────────────────────────────────┐  │
│  │  UI/UX Layer (Next.js 14+)        │  │
│  │  - Nordic Design System           │  │
│  │  - shadcn/ui Components           │  │
│  │  - Server Components              │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  API Routes (Abstraction Layer)   │  │
│  │  - Phase 1: Dummy JSON            │  │
│  │  - Phase 2: External API calls    │  │
│  │  - SSE for real-time streaming    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓ (Phase 2)
┌─────────────────────────────────────────┐
│      External Service (Backend)         │
│  - Agent Runtime & Execution            │
│  - Database & Persistence               │
│  - Knowledge Base & Vector DB           │
│  - Business Logic                       │
└─────────────────────────────────────────┘
```

---

## 📞 Need Help?

1. **Check the Quick Lookup table above**
2. **Search across all docs** for keywords
3. **Use the document index** to find specific topics
4. **Ask the development team**

---

**Version:** 1.1  
**Last Updated:** 2026-03-02  
**Maintained By:** Development Team
