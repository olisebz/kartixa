# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run dev:db       # Start local MariaDB via Docker
npm run dev:db:stop  # Stop local MariaDB

# Build & Type checking
npm run build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint

# Database
npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed database

# Docker (production)
npm run docker:up
npm run docker:down
```

There are no automated tests in this codebase.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19, TypeScript, MariaDB 11, Drizzle ORM, NextAuth.js 5 beta, Tailwind CSS 4, Zod, next-intl.

### API Layer (`src/app/api/v1/`)

All routes use an `apiHandler` factory from `src/server/middleware/apiHandler.ts` that provides uniform CORS, rate limiting, CSRF protection, Zod validation, and error mapping. Route files export HTTP method handlers using this factory.

**Response format is always:**
```ts
{ success: true, data: {...}, meta?: { page, pageSize, total, totalPages } }
{ success: false, error: { code, message, details? } }
```

### Server-Side (`src/server/`)

- **`services/`** — All business logic lives here. Services interact with the DB and throw typed `AppError` subclasses.
- **`domain/`** — Zod validation schemas, DTOs, error type definitions, and constants. This is the contract between API and services.
- **`auth/`** — Permission guards (`guards.ts`), device security, and auth helpers. League operations check membership roles here.
- **`db/schema.ts`** — Single file with the full Drizzle schema. All entities use UUID v4 PKs and snake_case columns.
- **`config.ts`** — All environment variables are read and typed here. Use this instead of `process.env` directly.

### Frontend (`src/`)

- **`lib/api.ts`** — Typed API client. All frontend fetch calls go through this object rather than calling `fetch` directly.
- **`components/`** — Shared UI components (Button, Modal, Card, Navbar, forms, etc.).
- **`app/liga/`** — League pages using Next.js dynamic routes.
- **`LocaleContext.tsx`** — i18n context; translation messages live in `/messages/`.

### Authorization Model

- Users belong to leagues via `leagueMemberships` with roles: `member` or `admin`.
- League operations check the caller's membership role in `src/server/auth/guards.ts` before proceeding.

### Authentication Flow

- **Registration:** POST `/api/v1/auth/register` → email OTP → POST `/api/v1/auth/register/verify`
- **Login:** POST `/api/v1/auth/login/challenge` with `deviceId` → if new device, requires email OTP; if trusted device, returns session directly
- Trusted devices are stored in `userTrustedDevices`. Session tokens stored in `userAuthSessions`.

## Environment Variables

Copy `.env.example` to `.env.local`. Key variables:
- `DATABASE_*` — MariaDB connection (host, port, user, password, name)
- `AUTH_SECRET` — NextAuth session signing secret
- `AUTH_CHALLENGE_SECRET` — OTP/challenge token signing
- `MAIL_ENABLED`, `SMTP_*` — Email delivery (set `MAIL_ENABLED=false` for local dev to skip emails)
- `CORS_ORIGINS` — Comma-separated allowed origins
