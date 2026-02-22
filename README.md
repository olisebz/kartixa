# Kartixa

**Go-Kart League & Race Tracker**

Kartixa is a full-stack web application for creating and managing Go-Kart leagues. Track drivers, races, seasons, and standings — all in a modern, responsive interface.

## Features

- **Leagues** — Create and manage multiple Go-Kart leagues
- **Seasons** — Organize races into seasons
- **Drivers** — Track drivers with automatic point calculation & rankings
- **Races** — Record race results with track info and positions
- **Auth** — Secure authentication with JWT tokens + argon2id password hashing
- **API** — RESTful API (v1) with rate limiting, CORS, and security headers
- **i18n** — Multilingual support (German, English)

## Tech Stack

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| Framework        | Next.js 16 (App Router)            |
| Language         | TypeScript                         |
| Database         | MariaDB 11                         |
| ORM              | Drizzle ORM                        |
| Auth             | argon2id + HMAC pepper, JWT (jose) |
| Styling          | Tailwind CSS 4                     |
| Validation       | Zod v4                             |
| Icons            | Lucide React                       |
| Containerization | Docker (multi-stage)               |
| CI               | GitHub Actions                     |

## Prerequisites

- **Node.js** 22+
- **Docker** (for the database, or provide your own MariaDB 11)

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url> && cd kartixa
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — set JWT_SECRET, PASSWORD_PEPPER, API_KEY

# 3. Start the database
npm run dev:db

# 4. Run migrations & seed
npm run db:migrate
npm run db:seed

# 5. Start dev server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## All Commands

### Development

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Start Next.js dev server (Turbopack) |
| `npm run dev:db`      | Start MariaDB via Docker Compose     |
| `npm run dev:db:stop` | Stop the dev database                |
| `npm run build`       | Create production build              |
| `npm run start`       | Run production build                 |
| `npm run lint`        | Run ESLint                           |
| `npm run typecheck`   | Run TypeScript type checking         |

### Database

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `npm run db:migrate`  | Run Drizzle migrations against the database |
| `npm run db:generate` | Generate new migration from schema changes  |
| `npm run db:seed`     | Seed the database with sample data          |
| `npm run db:studio`   | Open Drizzle Studio (DB browser)            |

### Docker (Production)

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `npm run docker:up`   | Build & start full stack (app + DB) |
| `npm run docker:down` | Stop all containers                 |

## Environment Variables

| Variable               | Required        | Default                 | Description                       |
| ---------------------- | --------------- | ----------------------- | --------------------------------- |
| `DATABASE_HOST`        | Yes             | `localhost`             | MariaDB host (`db` in Docker)     |
| `DATABASE_PORT`        | Yes             | `3306`                  | MariaDB port                      |
| `DATABASE_USER`        | Yes             | `kartixa`               | Database user                     |
| `DATABASE_PASSWORD`    | Yes             | `kartixa_dev`           | Database password                 |
| `DATABASE_NAME`        | Yes             | `kartixa`               | Database name                     |
| `API_KEY`              | Recommended     | —                       | API key for write operations      |
| `AUTH_ENABLED`         | No              | `false`                 | Enable JWT authentication         |
| `JWT_SECRET`           | If auth enabled | —                       | JWT signing secret (min 32 chars) |
| `PASSWORD_PEPPER`      | Recommended     | —                       | HMAC pepper for password hashing  |
| `CORS_ORIGINS`         | No              | `http://localhost:3000` | Allowed CORS origins              |
| `NODE_ENV`             | No              | `development`           | Environment                       |
| `RATE_LIMIT_MAX`       | No              | `100`                   | Max requests per window           |
| `RATE_LIMIT_WINDOW_MS` | No              | `60000`                 | Rate limit window (ms)            |

Generate secrets:

```bash
# JWT Secret (min 32 chars)
openssl rand -base64 48

# Password Pepper
openssl rand -base64 32

# API Key
openssl rand -base64 32
```

## API Endpoints

### Auth

| Method | Endpoint                   | Auth   | Description          |
| ------ | -------------------------- | ------ | -------------------- |
| POST   | `/api/v1/auth/register`    | —      | Create account       |
| POST   | `/api/v1/auth/login`       | —      | Login → tokens       |
| POST   | `/api/v1/auth/refresh`     | —      | Refresh access token |
| GET    | `/api/v1/auth/me`          | Bearer | Get profile          |
| POST   | `/api/v1/auth/me/password` | Bearer | Change password      |

### Leagues

| Method | Endpoint              | Auth  | Description        |
| ------ | --------------------- | ----- | ------------------ |
| GET    | `/api/v1/leagues`     | —     | List all leagues   |
| POST   | `/api/v1/leagues`     | Admin | Create league      |
| GET    | `/api/v1/leagues/:id` | —     | Get league details |
| PUT    | `/api/v1/leagues/:id` | Admin | Update league      |
| DELETE | `/api/v1/leagues/:id` | Admin | Delete league      |

### Seasons, Drivers, Races

Follow the same pattern under `/api/v1/leagues/:leagueId/seasons/...`

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/v1/             # REST API endpoints
│   │   ├── auth/           # Auth routes (register, login, refresh, me)
│   │   ├── leagues/        # League CRUD + nested resources
│   │   ├── health/         # Health check
│   │   └── ready/          # Readiness check
│   ├── liga/               # Frontend pages (leagues, races, drivers)
│   └── settings/           # Settings page
├── components/             # React components (Button, Card, Table, etc.)
├── lib/                    # Client-side utilities
├── server/                 # Backend modules
│   ├── auth/               # Auth system (guard, JWT, password, permissions)
│   ├── config.ts           # Centralized config from env vars
│   ├── db/                 # Database (schema, connection, migrations, seed)
│   ├── domain/             # Business logic (schemas, errors, constants)
│   ├── middleware/         # API handler pipeline (auth, rate limit, CORS)
│   ├── logger.ts           # Structured logger
│   └── services/           # Service layer (league, season, driver, race, user)
└── types/                  # Global TypeScript types
```

## License

MIT — see [LICENSE](LICENSE).

## Credits

- [Lucide Icons](https://lucide.dev) (ISC License)
- [Geist Font](https://vercel.com/font) (SIL Open Font License)
