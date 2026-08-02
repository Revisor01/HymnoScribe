# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**Email & Messaging:**
- SMTP Email Service - Password reset, email verification, contact form replies
  - SDK/Client: Nodemailer 6.9.14
  - Auth: Environment variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`)
  - Location in code: `backend/server.js` (lines 1280-1286)
  - Email templates: 
    - `backend/email-template.html` - Password reset, verification
    - `backend/contact-email-template.html` - Contact form notifications

## Data Storage

**Databases:**
- MySQL 9.0 (primary)
  - Connection: `mysql2/promise` with connection pool
  - Config file: `.env` (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
  - Server integration: `backend/server.js` (lines 24-32)
  - Schema: `init.sql`
  - Tables:
    - `institutions` - Multi-tenant organizations
    - `users` - User accounts with roles
    - `objekte` - Music sheets and liturgy items
    - `sessions` - Service/event sessions
    - `vorlagen` - Templates
    - `migrations` - Migration tracking

**File Storage:**
- Local filesystem only
  - Uploads directory: `/app/backend/uploads/`
  - Subdirectories:
    - `logos/` - Institution logos
    - `noten/` - Music sheet PDFs
    - `liturgie/` - Liturgy text files
    - `custom/` - Custom uploaded images
  - Volume mount in Docker: `./backend/uploads:/app/backend/uploads`
  - Cleanup: Automatic hourly cron job removes unused images

**Caching:**
- None detected - Direct database queries, no Redis or Memcached

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `backend/server.js` (lines 105-141)
  - Token signing: `jsonwebtoken` 9.0.2
  - Secret key: `process.env.JWT_SECRET`
  - Token expiry: 3 hours for standard users, 1 hour for super-admin
  - Payload: `{ id, role, institution_id }`
  - Roles: `super-admin`, `admin`, `user`

**Endpoints:**
- `POST /api/login` - Username/password authentication (bcrypt verified)
- `POST /api/super-login` - Super-admin access via `SUPER_PASSWORD`
- `POST /api/request-password-reset` - Email-based password reset
- `POST /api/set-password` - Reset password with token
- `POST /api/request-email-verification` - Resend verification email
- `GET /api/verify-email` - Email verification via token

**Middleware:**
- `authenticateToken()` - Verifies JWT in Authorization header
- `authenticateAdmin()` - Verifies JWT with admin/super-admin role
- `authenticateSuperAdmin()` - Verifies super-admin role only
- `checkRole(roles)` - Role-based access control

**Password Storage:**
- Bcrypt hashing (10 salt rounds)
- Location: `backend/server.js` (lines 278, 337, 1210)

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar

**Logs:**
- Console logging only (`console.log`, `console.error`)
- Key log points:
  - Database configuration on startup
  - Cron job execution for image cleanup
  - Email sending operations
  - No persistent log aggregation

## CI/CD & Deployment

**Hosting:**
- Docker container (production-ready image: `revisoren/hymnoscribe:latest`)
- Docker Compose orchestration
- Target deployment: Server with Docker support (Hetzner, noted in codebase comments)

**CI Pipeline:**
- None detected - No GitHub Actions, GitLab CI, Jenkins configuration
- Manual build and push to Docker Hub: `revisoren/hymnoscribe:latest`

## Environment Configuration

**Required env vars (Critical):**
- `DB_HOST` - Database hostname
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing key (minimum 32 characters recommended)
- `SUPER_PASSWORD` - Super-admin password
- `EMAIL_HOST` - SMTP hostname
- `EMAIL_PORT` - SMTP port (587 or 465)
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password
- `EMAIL_FROM` - Sender email address

**Optional env vars:**
- `NODE_ENV` - `development` or `production` (default: production in Docker)
- `PORT` - Server port (default: 3000, mapped to 9615 in Docker)
- `URL` - Application URL for CORS (default: includes `https://hymnoscribe.de`)
- `FRONTEND_URL` - Frontend URL (used in email templates)
- `CONTACT_EMAIL` - Contact form recipient (fallback to `EMAIL_FROM`)
- `LOGO_URL` - Logo for email templates

**Secrets location:**
- `.env` file (root directory) - **NEVER committed to git**
- Example: `example.env` with placeholder values

## Webhooks & Callbacks

**Incoming:**
- `POST /api/contact` - Contact form webhook for public inquiries

**Outgoing:**
- Email notifications via Nodemailer SMTP
  - Password reset verification links
  - Email verification tokens
  - Contact form confirmations
  - User notifications (implicit in code structure)

**Email Token Callbacks:**
- Reset token endpoint: Uses `?token={reset_token}` query parameter
- Verification token endpoint: Uses `?token={verification_token}` query parameter
- Tokens expire based on `reset_token_expires` timestamp (BIGINT)

## Database Initialization

**SQL Schema:**
- File: `init.sql`
- Automatic initialization via Docker `docker-entrypoint-initdb.d/`
- Migration system:
  - Directory: `/app/migrations/*.sql` (copied into container)
  - Script: `run-migrations.sh` (bash script)
  - Tracking table: `migrations` (logs applied migrations)
  - Runs on container startup before app initialization

## Multi-Tenancy

**Tenant Isolation:**
- Database-level: `institution_id` foreign key on:
  - `users` table
  - `objekte` table
  - `sessions` table
  - `vorlagen` table
- User-specific queries filtered by `institution_id`
- JWT payload includes `institution_id` for request context

---

*Integration audit: 2026-04-07*
