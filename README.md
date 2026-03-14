# Kartixa

**Go-Kart League & Race Tracker**

Kartixa is a web app for creating and managing Go-Kart leagues.
Drivers, races, and standings are displayed in a clear and organized way.

## Features

- Create and view leagues
- Driver rankings with point system
- Races with tracks and results
- Modern, responsive UI
- Email verification on account creation
- Email-based verification for new devices
- Active session list with session revocation
- Email-based password reset and password change

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Create production build
npm run build

# Run linting
npm run lint
```

## Auth Security Setup

Run migrations after pulling latest changes:

```bash
npm run db:migrate
```

Optional SMTP setup for real emails (otherwise codes are logged to server logs):

```bash
MAIL_ENABLED=true
MAIL_FROM="Kartixa <no-reply@kartixa.local>"
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

AUTH_CHALLENGE_SECRET=your-long-random-secret
AUTH_EMAIL_CODE_TTL_MINUTES=10
AUTH_SESSION_TTL_DAYS=30

# Privacy-by-default auth metadata settings
AUTH_STORE_SESSION_IP_ADDRESS=false
AUTH_STORE_SESSION_USER_AGENT=true
AUTH_SESSION_METADATA_RETENTION_DAYS=90
AUTH_TRUSTED_DEVICE_RETENTION_DAYS=180
AUTH_CHALLENGE_RETENTION_DAYS=7
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- **Framework:** [Next.js](https://nextjs.org/) (MIT)
- **UI Runtime:** [React](https://react.dev/) / [React DOM](https://react.dev/) (MIT)
- **Auth:** [Auth.js / NextAuth.js](https://authjs.dev/) (ISC)
- **Database ORM:** [Drizzle ORM](https://orm.drizzle.team/) (Apache-2.0)
- **Database Driver:** [mysql2](https://github.com/sidorares/node-mysql2) (MIT)
- **Validation:** [Zod](https://zod.dev/) (MIT)
- **Password Hashing:** [bcryptjs](https://github.com/dcodeIO/bcrypt.js/) (MIT)
- **Mail Transport:** [Nodemailer](https://nodemailer.com/) (MIT)
- **I18n:** [next-intl](https://next-intl.dev/) (MIT)
- **Icons:** [Lucide React](https://lucide.dev/) (ISC) — Lizenzhinweis in [licenses/lucide.txt](licenses/lucide.txt)
- **Fonts:** [Geist](https://vercel.com/font) (SIL Open Font License)
