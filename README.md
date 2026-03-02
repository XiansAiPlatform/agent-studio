# Agent Studio

A general-purpose AI agent platform built with Next.js 14+ and the Nordic design system.

## Overview

Agent Studio provides a comprehensive interface for building, managing, and monitoring AI agents. Built with modern web technologies and following Nordic design principles for a clean, accessible user experience.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with Nordic design system
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React
- **Theme:** next-themes (light/dark mode)
- **State Management:** Zustand
- **Form Handling:** React Hook Form + Zod
- **Authentication:** NextAuth.js (planned)

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm, pnpm, or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agent-studio
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.local file with required variables
# See docs/auth/SECURITY_SETUP.md for detailed instructions

# Required:
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3010
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
XIANS_SERVER_URL=https://your-xians-server-url
XIANS_APIKEY=your-xians-api-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3010](http://localhost:3010) in your browser.

## Releases

```bash
# Define the version
export VERSION=3.10.1 # or 1.3.7-beta for pre-release

# Create and push a version tag
git tag -a v$VERSION -m "Release v$VERSION"
git push origin v$VERSION
```

## Project Structure

```
agent-studio/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, etc.)
│   │   ├── (dashboard)/       # Main app routes
│   │   │   ├── tasks/
│   │   │   ├── agents/
│   │   │   ├── conversations/
│   │   │   ├── templates/
│   │   │   ├── knowledge/
│   │   │   ├── performance/
│   │   │   └── settings/
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/            # Layout components (Header, Sidebar)
│   │   └── features/          # Feature-specific components
│   ├── lib/                   # Utilities
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # State management
│   ├── types/                 # TypeScript types
│   └── actions/               # Server Actions
├── docs/                      # Documentation
│   ├── README.md             # Documentation index
│   ├── requirements.md       # Feature requirements
│   ├── theme.md              # Design system
│   ├── layout.md             # Layout structure
│   ├── technology.md         # Tech stack
│   ├── auth.md               # Authentication
│   └── development.md        # Development guide
└── public/                    # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features

### Current Implementation

- ✅ Nordic-inspired design system (light/dark mode)
- ✅ Responsive layout with header, sidebar, and main content area
- ✅ Dashboard with stats and overview
- ✅ Tasks management interface
- ✅ Agents management interface
- ✅ Navigation system with collapsible sidebar
- ✅ Theme toggle (light/dark mode)
- ✅ shadcn/ui component library integration

### Planned Features

- 🔄 Authentication (NextAuth.js with OIDC/SSO)
- 🔄 Real-time conversation interface
- 🔄 Available Agents library
- 🔄 Knowledge base management
- 🔄 Performance analytics dashboard
- 🔄 Settings and configuration
- 🔄 API integration (Phase 2)
- 🔄 Role-based access control (RBAC)

## Design System

Agent Studio uses a **Nordic-inspired design system** with:

- **Color Palette:** Snow, Frost, Midnight, and Aurora colors
- **Typography:** System fonts for optimal performance
- **Spacing:** Generous whitespace for breathing room
- **Components:** Accessible, WCAG 2.1 AA compliant
- **Dark Mode:** Class-based with system preference detection

See [docs/theme.md](./docs/theme.md) for complete design specifications.

## Documentation

Complete documentation is available in the `docs/` folder:

- [Documentation Index](./docs/README.md) - Overview of all documentation
- [Requirements](./docs/requirements.md) - Functional requirements and features
- [Design System](./docs/theme.md) - Colors, typography, components
- [Layout Structure](./docs/layout.md) - Application layout and routing
- [Technology Stack](./docs/technology.md) - Technical architecture
- [Authentication](./docs/auth.md) - Auth setup and RBAC
- [Security Setup](./docs/auth/SECURITY_SETUP.md) - Security configuration and best practices
- [Development Guide](./docs/development.md) - Testing, deployment, best practices

## Development Workflow

### Adding a New Component

```bash
# Add a shadcn/ui component
npx shadcn@latest add <component-name>
```

### Creating a New Page

1. Create a new folder in `src/app/(dashboard)/`
2. Add a `page.tsx` file
3. Add route to sidebar navigation in `src/components/layout/sidebar.tsx`

### Styling Guidelines

- Use Tailwind utility classes
- Follow Nordic color palette (use semantic color variables)
- Ensure WCAG 2.1 AA contrast ratios
- Test in both light and dark modes

## Contributing

1. Follow the project structure and conventions
2. Use TypeScript strict mode
3. Ensure components are accessible (WCAG 2.1 AA)
4. Test in both light and dark modes
5. Follow the Nordic design system guidelines

## License

[Your License Here]

## Support

For questions or issues, please refer to the documentation in the `docs/` folder or contact the development team.

---

**Version:** 0.1.0  
**Last Updated:** 2026-01-15  
**Built with:** Next.js 16.1.2
