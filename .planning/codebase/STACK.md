# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- JavaScript (Node.js) - Backend API server
- JavaScript (Vanilla) - Frontend browser-based editor and UI
- HTML5 - Frontend templates and page structure
- CSS3 - Frontend styling and layout
- SQL - Database schema and migrations

**Secondary:**
- Bash - Database migration scripts

## Runtime

**Environment:**
- Node.js 23-slim (Docker base image: `node:23-slim`)
- Browser runtime (modern ES6+ compatible browsers)

**Package Manager:**
- npm (npm 10+)
- Lockfile: `backend/package-lock.json` (present)

## Frameworks

**Core:**
- Express.js 4.18.2 - REST API server framework
- Vanilla JavaScript (no SPA framework) - Frontend with module imports

**Server Utilities:**
- multer 1.4.5-lts.1 - File upload handling
- compression 1.7.4 - HTTP compression middleware
- cors 2.8.5 - Cross-Origin Resource Sharing
- dotenv 16.4.5 - Environment variable management

**Security:**
- bcrypt 5.1.1 - Password hashing and verification
- jsonwebtoken 9.0.2 - JWT token generation and verification

**Database:**
- mysql2 3.10.3 - MySQL connection pool and promise-based queries

**Email:**
- nodemailer 6.9.14 - Email sending (SMTP)

**Scheduling:**
- node-cron 3.0.3 - Cron job scheduling for cleanup tasks

**Utilities:**
- uuid 10.0.0 - UUID generation for sessions and templates
- crypto (Node.js native) - Cryptographic operations

**Frontend PDF Generation:**
- pdf-lib 1.17.1 (CDN via cdnjs) - PDF document creation and manipulation
- fontkit 1.1.1 (CDN via unpkg) - Font support for PDF rendering

**Frontend Rich Text Editing:**
- Quill 2.0.2 (CDN via cdn.jsdelivr.net) - Rich text editor for Quill-based content

## Key Dependencies

**Critical:**
- mysql2 - Database persistence (multi-tenant)
- bcrypt - Secure password storage
- jsonwebtoken - Authentication and authorization
- express - API server foundation

**Infrastructure:**
- multer - File uploads (logos, music sheets, custom images)
- nodemailer - Email notifications (password reset, verification)
- node-cron - Automated cleanup of unused images hourly
- compression - Response payload optimization

## Configuration

**Environment:**
Configured via `.env` file (never committed) with following variables:

**Database:**
- `DB_HOST` - MySQL server hostname
- `DB_USER` - MySQL user
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `MYSQL_ROOT_PASSWORD` - MySQL root password (Docker)

**Server:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000, Docker: 9615)
- `URL` - Application URL (CORS origin configuration)
- `FRONTEND_URL` - Frontend base URL

**Security:**
- `JWT_SECRET` - Secret key for token signing
- `SUPER_PASSWORD` - Super-admin authentication password

**Email (SMTP):**
- `EMAIL_HOST` - SMTP server hostname
- `EMAIL_PORT` - SMTP port (587 or 465)
- `EMAIL_USER` - SMTP authentication username
- `EMAIL_PASS` - SMTP authentication password
- `EMAIL_FROM` - Sender email address
- `CONTACT_EMAIL` - Contact form recipient (optional)

**Optional:**
- `LOGO_URL` - Logo URL for email templates

Example configuration: `/Users/simonluthe/Documents/HymnoScribe/example.env`

## Build & Deployment

**Docker:**
- Base image: `node:23-slim` (both build and runtime)
- Multi-stage build: Build stage compiles frontend + backend, Runtime stage runs optimized
- Container port: 9615 (internal 3000)
- Image: `revisoren/hymnoscribe:latest`

**Docker Compose:**
- Services: `hymnoscribe` (app) + `db` (MySQL 9.0)
- Volume mounts: 
  - `./backend/uploads:/app/backend/uploads` - File uploads
  - `./migrations:/app/migrations` - Database migration scripts
  - `./hymnoscribe_db:/var/lib/mysql` - MySQL data persistence

**Entry Command:**
```
/bin/sh -c "/app/run-migrations.sh && node server.js"
```

**Build Steps:**
1. Copy backend `package*.json` and install dependencies
2. Copy frontend source
3. Copy backend source
4. Copy SQL and migration files
5. Final stage: Install production dependencies only
6. Run migrations then start Express server

## Platform Requirements

**Development:**
- Node.js 14.0.0 or higher (recommended: 23+)
- MySQL 9.0 compatible server
- Docker and docker-compose for containerized development

**Production:**
- Docker container orchestration (e.g., Docker Compose, Kubernetes)
- MySQL 9.0 compatible database service
- SMTP server for email notifications
- SSL/TLS reverse proxy (Traefik, Nginx, Apache)
- Persistent storage for:
  - `/app/backend/uploads` - User file uploads (logos, sheets, images)
  - `/var/lib/mysql` - Database files

**Browser Requirements:**
- Modern ES6+ JavaScript support
- PDF-lib and PDFKit support
- Quill.js compatible (IE11+ not required)

---

*Stack analysis: 2026-04-07*
