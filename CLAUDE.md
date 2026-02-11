# VetsInTech EdTech Platform

## Project Overview

Custom EdTech learning platform for a client education company. Replaces Canvas LMS with a focused, community-driven learning experience. Aggregates student progress from external platforms (Coursera, Pluralsight, Udemy) into a unified admin dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Database | Supabase Postgres + RLS |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (files, images) |
| Real-time | Supabase Realtime (discussions, notifications) |
| UI | Tailwind CSS + shadcn/ui |
| Rich Text | Tiptap (ProseMirror) |
| Hosting | Vercel (VetSecItPro team) |
| Future Mobile | Expo (React Native) + EAS Build |

## Architecture: Domain-Driven Modular Monolith

### Key Principles

1. **Domain boundaries** — Business logic organized by domain in `lib/domains/`
2. **Platform-agnostic lib/** — Everything in `lib/` must work on both web (Next.js) and mobile (Expo). No React DOM imports, no Next.js-specific imports in `lib/`.
3. **API routes for every mutation** — Server actions for web convenience, but every mutation also has a REST API route in `app/api/` for future mobile access.
4. **Multi-tenant schema** — `organization_id` on every database table, even though V1 is single-tenant.
5. **Types as contracts** — All TypeScript interfaces live in `lib/domains/*/types.ts` or `lib/types/`.

### Directory Structure

```
app/                    # WEB-ONLY routes (Next.js specific)
  (auth)/               # Login, register, forgot-password
  (student)/            # Student-facing routes
  (admin)/              # Admin routes
  api/                  # REST API routes (mobile-accessible)

components/             # WEB-ONLY UI components (React DOM)
  ui/                   # shadcn/ui primitives
  layout/               # Navigation, sidebar, header
  courses/              # Course-related UI
  editor/               # Tiptap editor components
  community/            # Discussion UI
  quizzes/              # Quiz player UI
  admin/                # Admin dashboard UI
  certificates/         # Certificate template
  shared/               # Loading, empty, error states

lib/                    # PLATFORM-AGNOSTIC (shareable with Expo)
  domains/              # Business logic by domain
    courses/            # Course, Module, Lesson logic
    progress/           # Progress tracking logic
    quizzes/            # Quiz grading logic
    community/          # Discussion logic
    notifications/      # Notification logic
    certificates/       # Certificate generation logic
    admin/              # Analytics logic
    integrations/       # External platform adapters
      coursera/
      pluralsight/
      udemy/
  supabase/             # Supabase client setup
  types/                # Global shared types
  utils/                # Pure utility functions
  constants/            # App constants

supabase/               # Database
  migrations/           # Versioned SQL migrations
```

## Coding Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `CourseCard.tsx`)
- Utilities/logic: `kebab-case.ts` (e.g., `progress-utils.ts`)
- Types: `types.ts` within each domain directory
- Pages: `page.tsx` (Next.js convention)

### Component Patterns
- Use server components by default
- Add `'use client'` only when needed (interactivity, hooks, browser APIs)
- Keep components focused — one responsibility per component
- Extract shared UI into `components/shared/`

### Data Access
- All Supabase queries in `lib/domains/*/queries.ts`
- All Supabase mutations in `lib/domains/*/mutations.ts`
- Pure business logic in `lib/domains/*/utils.ts`
- Zod schemas for validation in `lib/utils/validation.ts`

### Security
- RLS policies on EVERY table — no exceptions
- Server-side role checks on every API route and server action
- Never use `dangerouslySetInnerHTML` — render Tiptap content through its React renderer
- File upload validation: restrict types, enforce size limits
- External API credentials in environment variables only, never client-exposed

## Database Rules

### Isolation
This project's tables are INDEPENDENT from all other Supabase tables (Rowan, sm_content, aws_course_memory, Steel Motion, automation schema). Never create foreign keys to or join with tables from other projects.

### Multi-Tenant
Every table includes `organization_id`. All queries must filter by `organization_id`. RLS policies enforce tenant isolation.

### Migrations
- Located in `supabase/migrations/`
- Named: `00001_description.sql`, `00002_description.sql`, etc.
- Always include rollback comments

## Deployment

### Vercel
- **Team:** VetSecItPro
- **Team ID:** `team_HFUTBVxI8jKYi334LvgVsVNh`
- Always deploy under VetSecItPro team, never personal account

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=

# External integrations (optional, configured per-org)
COURSERA_CLIENT_ID=
COURSERA_CLIENT_SECRET=
PLURALSIGHT_API_KEY=
UDEMY_CLIENT_ID=
UDEMY_CLIENT_SECRET=
```

## Planning

The MDMP orders file at `.mdmp/edtech-platform-v1-20260210-140000.md` contains the full execution plan with:
- 20 features across 7 phases
- ~160 tasks with checkboxes
- Complete database schema (18 tables)
- Full project structure specification
- Risk register and rollback plan

Reference this file when executing tasks. Update checkboxes as tasks are completed.

## 20 Features (V1)

1. Course Builder
2. Module System
3. Rich Lesson Editor (Tiptap)
4. Course Templates & Cohort Cloning
5. File & Media Library
6. Student Dashboard
7. Course Player
8. Progress Tracking
9. Quizzes & Assessments
10. Certificates of Completion
11. Discussion Boards
12. Announcements
13. Student Profiles
14. Notification Center
15. Admin Analytics Dashboard
16. Student Management
17. External Platform Integration (Coursera, Pluralsight, Udemy)
18. Role-Based Access Control
19. Auth System
20. Responsive Design
