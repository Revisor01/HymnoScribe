<!-- GSD:project-start source:PROJECT.md -->
## Project

**HymnoScribe**

HymnoScribe ist eine Multi-Tenant Web-App zum Erstellen von Liedblättern (Songsheets) als PDF. Gemeinden und Institutionen verwalten eigene Bibliotheken mit Liedern, Liturgien, Gebeten und Lesungen und kombinieren diese per Drag-and-Drop zu druckfertigen Liedblättern in verschiedenen Formaten (A5, A4, A3, DIN-Lang). Die App ist live unter hymnoscribe.de und wird bereits von Testern genutzt.

**Core Value:** Ein Liedblatt zusammenstellen und sofort sehen, wie es gedruckt aussieht — ohne Trial-and-Error.

### Constraints

- **Tech Stack**: Express.js Backend bleibt — Neuschreiben nicht gerechtfertigt
- **Frontend**: Vanilla JS bevorzugt — kein schweres Framework (React etc.) einführen
- **PDF-Library**: pdf-lib bleibt (clientseitig, gut genug) — aber eine einzige Rendering-Engine für Vorschau und PDF
- **Multi-Tenant**: Institution-Scoping muss in allen neuen Features berücksichtigt werden
- **Deployment**: Docker-basiert, muss weiterhin funktionieren
- **Nutzer**: Nicht-technisch — UI muss intuitiv bleiben, keine versteckten Power-Features
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (Node.js) - Backend API server
- JavaScript (Vanilla) - Frontend browser-based editor and UI
- HTML5 - Frontend templates and page structure
- CSS3 - Frontend styling and layout
- SQL - Database schema and migrations
- Bash - Database migration scripts
## Runtime
- Node.js 23-slim (Docker base image: `node:23-slim`)
- Browser runtime (modern ES6+ compatible browsers)
- npm (npm 10+)
- Lockfile: `backend/package-lock.json` (present)
## Frameworks
- Express.js 4.18.2 - REST API server framework
- Vanilla JavaScript (no SPA framework) - Frontend with module imports
- multer 1.4.5-lts.1 - File upload handling
- compression 1.7.4 - HTTP compression middleware
- cors 2.8.5 - Cross-Origin Resource Sharing
- dotenv 16.4.5 - Environment variable management
- bcrypt 5.1.1 - Password hashing and verification
- jsonwebtoken 9.0.2 - JWT token generation and verification
- mysql2 3.10.3 - MySQL connection pool and promise-based queries
- nodemailer 6.9.14 - Email sending (SMTP)
- node-cron 3.0.3 - Cron job scheduling for cleanup tasks
- uuid 10.0.0 - UUID generation for sessions and templates
- crypto (Node.js native) - Cryptographic operations
- pdf-lib 1.17.1 (CDN via cdnjs) - PDF document creation and manipulation
- fontkit 1.1.1 (CDN via unpkg) - Font support for PDF rendering
- Quill 2.0.2 (CDN via cdn.jsdelivr.net) - Rich text editor for Quill-based content
## Key Dependencies
- mysql2 - Database persistence (multi-tenant)
- bcrypt - Secure password storage
- jsonwebtoken - Authentication and authorization
- express - API server foundation
- multer - File uploads (logos, music sheets, custom images)
- nodemailer - Email notifications (password reset, verification)
- node-cron - Automated cleanup of unused images hourly
- compression - Response payload optimization
## Configuration
- `DB_HOST` - MySQL server hostname
- `DB_USER` - MySQL user
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `MYSQL_ROOT_PASSWORD` - MySQL root password (Docker)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000, Docker: 9615)
- `URL` - Application URL (CORS origin configuration)
- `FRONTEND_URL` - Frontend base URL
- `JWT_SECRET` - Secret key for token signing
- `SUPER_PASSWORD` - Super-admin authentication password
- `EMAIL_HOST` - SMTP server hostname
- `EMAIL_PORT` - SMTP port (587 or 465)
- `EMAIL_USER` - SMTP authentication username
- `EMAIL_PASS` - SMTP authentication password
- `EMAIL_FROM` - Sender email address
- `CONTACT_EMAIL` - Contact form recipient (optional)
- `LOGO_URL` - Logo URL for email templates
## Build & Deployment
- Base image: `node:23-slim` (both build and runtime)
- Multi-stage build: Build stage compiles frontend + backend, Runtime stage runs optimized
- Container port: 9615 (internal 3000)
- Image: `revisoren/hymnoscribe:latest`
- Services: `hymnoscribe` (app) + `db` (MySQL 9.0)
- Volume mounts: 
## Platform Requirements
- Node.js 14.0.0 or higher (recommended: 23+)
- MySQL 9.0 compatible server
- Docker and docker-compose for containerized development
- Docker container orchestration (e.g., Docker Compose, Kubernetes)
- MySQL 9.0 compatible database service
- SMTP server for email notifications
- SSL/TLS reverse proxy (Traefik, Nginx, Apache)
- Persistent storage for:
- Modern ES6+ JavaScript support
- PDF-lib and PDFKit support
- Quill.js compatible (IE11+ not required)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Backend: `server.js` (single monolithic file)
- Frontend modules: lowercase with hyphens in HTML files (`admin.html`, `bibliothek.html`, `dashboard.html`), camelCase in JS files (`sessionManagement.js`, `liedblattManagement.js`, `generatePDF.js`)
- Utility files: descriptive camelCase (`generatePDF.js`, `dragAndDrop.js`, `sessionManagement.js`)
- camelCase universally used: `saveSession()`, `loadSession()`, `authenticateToken()`, `handleDragStart()`, `updateLiedblatt()`, `cleanupUnusedImages()`
- Async functions marked with `async` keyword: `async function saveSession(name)`, `async function authenticateAdmin(req, res, next)`
- Event handlers prefix with action: `handleUserActions()`, `handleDragStart()`, `handleResendVerification()`
- Getter/initializer functions: `loadConfigFromLocalStorage()`, `getImagePath()`, `getContactEmailTemplate()`, `initializeDragAndDrop()`
- camelCase: `globalConfig`, `alleObjekte`, `sessionData`, `selectedItems`, `userInstitution`, `emailContent`
- Database columns: snake_case in SQL queries: `institution_id`, `reset_token`, `email_verified`, `pending_email`, `verification_token`
- Constants: UPPER_SNAKE_CASE in JavaScript: `BASE_FONT_SIZE`, `HEADING_1_SCALE`, `MAX_STROPHES_BEFORE_BREAK`, `MIN_SPACE_FOR_NEXT_GROUP`
- Boolean variables: prefix with `is`, `has`, `should`: `preventPageBreak`, `isCopyright`, `isRefrain`, `isFirstOnPage`, `showTitle`
- Database objects returned as rows/records: `user[0]`, `users[0]`, representing destructured query results
- Objects passed as context objects: `context.page`, `context.y`, `context.fonts`, `context.width`, `context.height`, `context.margin`
## Code Style
- No ESLint or Prettier configuration detected (`.eslintrc*`, `.prettierrc*`, `biome.json` not present)
- Manual formatting observed:
- No linting tool detected in project configuration
- Conventions appear to be followed through manual review and convention
## Import Organization
- No path aliases detected in `backend/package.json`
- Frontend uses ES6 module imports: `import { ... } from './utils.js'`, `import { ... } from './sessionManagement.js'`
## Error Handling
- Backend: try-catch blocks wrapping async database operations
- Consistent error logging with `console.error()`: `console.error('Fehler beim Senden der Kontaktnachricht:', error)`
- HTTP status codes returned in error responses:
- Error messages returned as JSON: `res.status(500).json({ error: 'Interner Serverfehler', details: error.message })`
- Frontend: try-catch blocks, errors logged to console and displayed via `customAlert()`
- Some functions rethrow errors: `throw error` in `sendContactEmail()`
## Logging
- Informational logs use `console.log()`: `console.log('Database config:', {...})`, `console.log('Contact email sent successfully')`
- Error logs use `console.error()`: `console.error('Fehler beim Senden der Kontaktnachricht:', error)`
- Log messages often in German: `'Führe geplante stündliche Bildbereinigung durch...'`, `'Fehler beim Abrufen der Sessions:'`
- Structured error logging with error object: `console.error('Fehler beim Löschen des Benutzers:', error)`
- Cron job logging: `console.log('Cron-Job Ergebnis: ${result.deletedCount} von ${result.scannedCount} Dateien gelöscht.')`
- No structured logging framework (Winston, Pino) detected
## Comments
- Comments mark constant definitions with explanations: `const BASE_FONT_SIZE = 14; // Grundschriftgröße in Punkten`
- Comments explain non-obvious logic: `// Font auswählen basierend auf Formatierungsoptionen`
- Comments mark important operations: `// Wichtig: Rückgabe des direkt modifizierten Kontext-Objekts`
- Comments indicate new features or recent changes: `// NEU: Initialisierung der Vorschau-Format-Auswahl`, `// Neue Konstanten für Quill-Überschriften`
- Some sections have no comments (e.g., middleware functions)
- JSDoc blocks used sparingly
- Example from `generatePDF.js` (lines 37-41):
* Fügt eine neue Seite hinzu und aktualisiert den Kontext
* @param {PDFContext} context - Der PDF-Kontext
* @returns {PDFContext} Der aktualisierte Kontext
- Example from `generatePDF.js` (lines 71-81):
* Zeichnet Text auf die aktuelle Seite
* @param {PDFContext} context - Der PDF-Kontext
* @param {string} text - Der zu zeichnende Text
* @param {number} x - X-Position
* @param {number} y - Y-Position
* @param {number} fontSize - Schriftgröße
* @param {number} maxWidth - Maximale Breite
* @param {Object} options - Weitere Optionen
* @returns {number} Die Höhe des gezeichneten Texts
## Function Design
- Backend functions tend to be 20-50 lines for route handlers
- Frontend utility functions typically 10-40 lines
- Largest file: `generatePDF.js` at 1919 lines (complex PDF generation logic)
- Large functions broken into logical sections with comments
- Route handlers: `(req, res, next)` pattern for Express middleware
- Database operations use parameter binding: `pool.query('SELECT * FROM users WHERE email = ?', [email])`
- Async functions consistently use `async/await` pattern
- Optional parameters passed as object: `drawText(context, text, x, y, fontSize, maxWidth, options = {})`
- Destructuring used for extracting properties: `const { name, email, message, inquiryType } = req.body`
- Backend endpoints return JSON responses: `res.json({ ... })` or `res.status(code).json({ ... })`
- Async functions return Promise-based values
- Frontend functions return Promises for async operations: `export async function saveSession(name)`
- Some functions return null on failure: `if (!imagePath) return null`
- Utility functions may throw errors: `throw new Error('...')`
## Module Design
- Backend: monolithic `server.js` with no module exports (Express app definition only)
- Frontend: ES6 modules with named exports: `export async function saveSession()`, `export function loadImagePath()`
- All frontend utilities exported at module level (no default exports observed)
- No barrel files (index.js re-exports) detected in frontend
- Each module imports directly from specific files: `import { ... } from './sessionManagement.js'`
| File | Purpose | Exports |
|------|---------|---------|
| `utils.js` | Authentication, fetch, UI helpers | `authenticatedFetch()`, `checkAuthToken()`, `logout()`, `loadUserInfo()`, `getImagePath()`, `customAlert()`, `customConfirm()`, `customPrompt()` |
| `sessionManagement.js` | Session and template persistence | `saveSession()`, `loadSession()`, `deleteSession()`, `loadConfigFromLocalStorage()`, `applySessionData()`, `saveVorlage()`, `loadVorlage()`, `deleteVorlage()` |
| `liedblattManagement.js` | Adding/managing hymn sheet items | `addToSelected()`, `updateLiedblatt()`, `createLiedOptions()`, `addTrenner()`, `addPageBreak()`, `addFreierText()`, `addCustomImage()` |
| `generatePDF.js` | PDF generation with PDFLib | `generatePDF()` (window-attached), internal helper functions |
| `previewPageBreaks.js` | Page break preview logic | `updatePreviewWithPageBreaks()`, `initPreviewFormatSelector()` |
| `dragAndDrop.js` | Drag-and-drop item reordering | `initializeDragAndDrop()`, `handleDragStart()`, `handleDrop()`, `getDragAfterElement()` |
| `admin.js` | Admin interface logic | Various event handlers and data management functions |
| `bibliothek.js` | Library/song management | Library-specific functionality |
| `script.js` | Main initialization and global config | `applyGlobalConfig()`, `initializeApp()` |
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- REST API backend serving a single-page application (SPA) frontend
- Role-based access control (RBAC) with three roles: super-admin, admin, user
- Institution-scoped data isolation (multi-tenant architecture)
- File upload handling for images, music scores, and logos
- PDF generation on the frontend using pdf-lib library
- JWT-based authentication with token verification
## Layers
- Purpose: User interface for songsheet creation, PDF preview, and management
- Location: `frontend/` directory (HTML, CSS, JavaScript)
- Contains: HTML pages (dashboard, admin, bibliothek), CSS styling, modular JavaScript components
- Depends on: Backend API via HTTP/REST
- Used by: End users in web browser
- Purpose: Handle HTTP requests, route to appropriate handlers, manage middleware chain
- Location: `backend/server.js` (lines 150-1463)
- Contains: Express.js router setup, all endpoint definitions (`apiRouter.post()`, `apiRouter.get()`, etc.)
- Depends on: Authentication middleware, role checking middleware
- Used by: Frontend via authenticated fetch calls, external contact forms
- Purpose: Verify user identity and enforce role-based permissions
- Location: `backend/server.js` (lines 105-149)
- Contains: Three middleware functions: `authenticateToken()`, `authenticateAdmin()`, `authenticateSuperAdmin()`
- Pattern: JWT token validation with role checks via `checkRole()` middleware
- Used by: Nearly all protected endpoints
- Purpose: Handle domain operations (user management, object CRUD, session/template management, PDF generation)
- Location: Mixed across `backend/server.js` and `frontend/js/` modules
- Backend handlers: User registration/login, institution management, object storage, session persistence
- Frontend handlers: Drag-and-drop management, PDF generation, preview rendering
- Depends on: Database access, file system operations, email service
- Purpose: Query and persist data to MySQL database
- Location: Embedded in `backend/server.js` (uses `mysql2/promise` pool)
- Contains: SQL queries for all CRUD operations on users, objekte, sessions, vorlagen, institutions
- Pattern: Direct SQL queries with parameterized inputs (SQL injection protection)
- Depends on: MySQL connection pool configured from environment variables
- Purpose: Store and serve user-uploaded files (score images, logos, custom images)
- Location: `backend/uploads/` directory structure
- Contains: Three subdirectories managed by multer: `noten/`, `liturgie/`, `logos/`, `custom/`
- Pattern: Multer middleware for file upload handling, cron job for cleanup
- Used by: Frontend image display, PDF generation with embedded images
- Purpose: Send transactional emails (password reset, email verification, contact messages)
- Location: `backend/server.js` (helper functions `sendPasswordResetEmail()`, `sendEmailVerification()`, `sendWelcomeEmail()`, `sendContactEmail()`)
- Uses: Nodemailer for SMTP communication
- Depends on: Email environment variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`)
## Data Flow
- **Global Config:** Stored in `globalConfig` object in `frontend/js/script.js`, persisted to localStorage
- **Selected Items:** DOM-based representation in `#selected-items` container
- **Quill Editors:** Instances stored in `quillInstances` map in `frontend/js/liedblattManagement.js` (keyed by object ID)
- **Session/Template Data:** Serialized to JSON for database persistence, deserialized back to DOM state
## Key Abstractions
- Purpose: Stateless user identity verification
- Implementation: Issued on login (`jwt.sign()`), verified on each request (`jwt.verify()`)
- Claims: user ID, username, role, institution_id
- Location: `backend/server.js` lines 110-110, 232-243
- Purpose: Enforce permissions based on user role
- Roles: 'super-admin' (system-wide), 'admin' (institution-level), 'user' (read-most operations)
- Implementation: `checkRole()` middleware (line 144-149) applied to protected routes
- Pattern: Different endpoints require different role combinations
- Purpose: Multi-tenant data isolation
- Implementation: All table operations filter by `institution_id` from JWT
- Effect: Admin users only see/manage users and objects within their institution
- Exceptions: super-admin can view all institutions
- Purpose: Core domain entity representing a hymn, liturgy text, prayer, etc.
- Storage: `objekte` table with flexible `typ` field ('Lied', 'Liturgie', 'Gebet', 'Lesung')
- Related data: Optional score images (`notenbild`, `notenbildMitText`), stanzas (JSON), copyright
- Lifecycle: Created by admin, read by all institution users, deleted by admin
- Purpose: Snapshot of a complete songsheet configuration (name, selected objects, their options)
- Serialization: Array of objects with `uniqueId` and serialized object state (stanza selections, note display flags)
- Persistence: Both database (server) and localStorage (client) for resilience
- Scope: Per-institution
- Purpose: Reusable songsheet configuration
- Distinct from Session: Templates are for recurring patterns, sessions are for drafts
- Storage: `vorlagen` table with same structure as sessions
- Purpose: Final composition of selected objects with formatting
- Representation: DOM structure with CSS classes and data attributes
- Rendering: Server-side PDF or client-side preview
- Format Options: A5, A4, A3, DIN-Lang (stored in `globalConfig.format`)
## Entry Points
- Location: `backend/server.js` (line 1457-1462)
- Triggers: Docker container startup or `npm start`
- Responsibilities: 
- `frontend/index.html`: Login page, entry for all users
- `frontend/dashboard.html`: Main songsheet editor
- `frontend/admin.html`: Administrator interface
- `frontend/bibliothek.html`: Object library management
## Error Handling
## Cross-Cutting Concerns
- Pattern: `console.log()` and `console.error()` throughout
- Backend: Logs server startup, cron job execution, database operations, email sending
- Frontend: Logs object loading, drag-and-drop events, PDF generation steps
- Backend: Basic type checking, email format validation before DB operations
- Frontend: Form validation, empty state checks for songsheet content
- Database: Foreign keys, unique constraints, enum type for role field
- Strategy: JWT tokens stored in localStorage
- Flow: Login endpoint issues token → token included in all subsequent API requests → middleware validates before handler
- Expiration: Tokens checked via `/api/verify-token` endpoint
- Mechanism: Role-based via `checkRole()` middleware
- Institution isolation: All queries filter by `institution_id` from JWT
- Admin actions: Require 'admin' or 'super-admin' role
- Regular users: Can create sessions/templates, cannot upload objects
- Configured in Express (line 39-43) with origin whitelist from `URL` env var
- Allows credentials, GET/POST/PUT/DELETE methods, Content-Type header
- Enabled via `compression()` middleware (line 37)
- Compresses JSON responses for faster transmission
- Multer limits file size implicitly
- Files stored with timestamp+original name (collision-resistant)
- Cleanup cron job prevents storage bloat
- No execution in upload directories (images only)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
