# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Monolithic client-server application with clear separation between frontend (stateless web application) and backend (REST API server).

**Key Characteristics:**
- REST API backend serving a single-page application (SPA) frontend
- Role-based access control (RBAC) with three roles: super-admin, admin, user
- Institution-scoped data isolation (multi-tenant architecture)
- File upload handling for images, music scores, and logos
- PDF generation on the frontend using pdf-lib library
- JWT-based authentication with token verification

## Layers

**Presentation Layer:**
- Purpose: User interface for songsheet creation, PDF preview, and management
- Location: `frontend/` directory (HTML, CSS, JavaScript)
- Contains: HTML pages (dashboard, admin, bibliothek), CSS styling, modular JavaScript components
- Depends on: Backend API via HTTP/REST
- Used by: End users in web browser

**API/Routing Layer:**
- Purpose: Handle HTTP requests, route to appropriate handlers, manage middleware chain
- Location: `backend/server.js` (lines 150-1463)
- Contains: Express.js router setup, all endpoint definitions (`apiRouter.post()`, `apiRouter.get()`, etc.)
- Depends on: Authentication middleware, role checking middleware
- Used by: Frontend via authenticated fetch calls, external contact forms

**Authentication & Authorization Layer:**
- Purpose: Verify user identity and enforce role-based permissions
- Location: `backend/server.js` (lines 105-149)
- Contains: Three middleware functions: `authenticateToken()`, `authenticateAdmin()`, `authenticateSuperAdmin()`
- Pattern: JWT token validation with role checks via `checkRole()` middleware
- Used by: Nearly all protected endpoints

**Business Logic Layer:**
- Purpose: Handle domain operations (user management, object CRUD, session/template management, PDF generation)
- Location: Mixed across `backend/server.js` and `frontend/js/` modules
- Backend handlers: User registration/login, institution management, object storage, session persistence
- Frontend handlers: Drag-and-drop management, PDF generation, preview rendering
- Depends on: Database access, file system operations, email service

**Data Access Layer:**
- Purpose: Query and persist data to MySQL database
- Location: Embedded in `backend/server.js` (uses `mysql2/promise` pool)
- Contains: SQL queries for all CRUD operations on users, objekte, sessions, vorlagen, institutions
- Pattern: Direct SQL queries with parameterized inputs (SQL injection protection)
- Depends on: MySQL connection pool configured from environment variables

**File System Layer:**
- Purpose: Store and serve user-uploaded files (score images, logos, custom images)
- Location: `backend/uploads/` directory structure
- Contains: Three subdirectories managed by multer: `noten/`, `liturgie/`, `logos/`, `custom/`
- Pattern: Multer middleware for file upload handling, cron job for cleanup
- Used by: Frontend image display, PDF generation with embedded images

**Email Service Layer:**
- Purpose: Send transactional emails (password reset, email verification, contact messages)
- Location: `backend/server.js` (helper functions `sendPasswordResetEmail()`, `sendEmailVerification()`, `sendWelcomeEmail()`, `sendContactEmail()`)
- Uses: Nodemailer for SMTP communication
- Depends on: Email environment variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`)

## Data Flow

**User Registration & Authentication Flow:**

1. User submits login form on `frontend/index.html`
2. `frontend/js/login.js` POSTs credentials to `POST /api/login`
3. Backend validates username/password against `users` table
4. Backend generates JWT token (via `jwt.sign()`) and returns in response
5. Frontend stores token in `localStorage` as 'token'
6. Subsequent requests include `Authorization: Bearer {token}` header
7. `authenticateToken` middleware validates token before route handler executes

**Songsheet Creation & PDF Generation Flow:**

1. User starts on `frontend/dashboard.html` (main editing interface)
2. User searches and selects objects from library via `frontend/js/liedblattManagement.js`
3. Objects added to `selected-items` container with drag-and-drop support
4. Each object stores state (selected stanzas, note type, custom title) in DOM attributes
5. User configures global settings (font, size, alignment, format) via UI
6. On PDF export: `frontend/js/generatePDF.js` reads DOM state
7. Generates PDFDocument using pdf-lib, embeds font files from `backend/ttf/`
8. Embeds score images from `backend/uploads/` paths
9. Applies page break logic via semantic rules (max stanzas before break, min space for next group)
10. Returns PDF blob to user for download

**Session Management Flow:**

1. User saves current liedblatt as "session" via `saveSession()` in `frontend/js/sessionManagement.js`
2. Collects all selected items and their configurations from DOM
3. POSTs to `POST /api/sessions` with session name and data (JSON array)
4. Backend stores in `sessions` table with `institution_id` scoping
5. Later: User loads session via `loadSession(id)` → fetches from `GET /api/sessions/:id`
6. Restores DOM state and Quill editor instances from persisted JSON
7. Sessions also auto-save to browser's localStorage for offline resilience

**Object Upload & Storage Flow:**

1. Admin uploads a music score via `frontend/admin.html` form
2. File upload triggers `POST /api/objekte` with multipart/form-data
3. Multer middleware processes upload, stores file in `backend/uploads/{noten|liturgie}/`
4. Backend creates/updates record in `objekte` table with `notenbild` or `notenbildMitText` path
5. Cron job (hourly, line 63-71) identifies unused files and deletes them
6. Frontend fetches all objects via `GET /api/objekte` (filtered by institution)
7. Objects available for selection in songsheet editor

**State Management:**

- **Global Config:** Stored in `globalConfig` object in `frontend/js/script.js`, persisted to localStorage
- **Selected Items:** DOM-based representation in `#selected-items` container
- **Quill Editors:** Instances stored in `quillInstances` map in `frontend/js/liedblattManagement.js` (keyed by object ID)
- **Session/Template Data:** Serialized to JSON for database persistence, deserialized back to DOM state

## Key Abstractions

**Authentication Token (JWT):**
- Purpose: Stateless user identity verification
- Implementation: Issued on login (`jwt.sign()`), verified on each request (`jwt.verify()`)
- Claims: user ID, username, role, institution_id
- Location: `backend/server.js` lines 110-110, 232-243

**Role-Based Access Control (RBAC):**
- Purpose: Enforce permissions based on user role
- Roles: 'super-admin' (system-wide), 'admin' (institution-level), 'user' (read-most operations)
- Implementation: `checkRole()` middleware (line 144-149) applied to protected routes
- Pattern: Different endpoints require different role combinations

**Institution Scoping:**
- Purpose: Multi-tenant data isolation
- Implementation: All table operations filter by `institution_id` from JWT
- Effect: Admin users only see/manage users and objects within their institution
- Exceptions: super-admin can view all institutions

**Object (Objekt):**
- Purpose: Core domain entity representing a hymn, liturgy text, prayer, etc.
- Storage: `objekte` table with flexible `typ` field ('Lied', 'Liturgie', 'Gebet', 'Lesung')
- Related data: Optional score images (`notenbild`, `notenbildMitText`), stanzas (JSON), copyright
- Lifecycle: Created by admin, read by all institution users, deleted by admin

**Session:**
- Purpose: Snapshot of a complete songsheet configuration (name, selected objects, their options)
- Serialization: Array of objects with `uniqueId` and serialized object state (stanza selections, note display flags)
- Persistence: Both database (server) and localStorage (client) for resilience
- Scope: Per-institution

**Template (Vorlage):**
- Purpose: Reusable songsheet configuration
- Distinct from Session: Templates are for recurring patterns, sessions are for drafts
- Storage: `vorlagen` table with same structure as sessions

**Liedblatt (Songsheet):**
- Purpose: Final composition of selected objects with formatting
- Representation: DOM structure with CSS classes and data attributes
- Rendering: Server-side PDF or client-side preview
- Format Options: A5, A4, A3, DIN-Lang (stored in `globalConfig.format`)

## Entry Points

**Backend Entry Point:**
- Location: `backend/server.js` (line 1457-1462)
- Triggers: Docker container startup or `npm start`
- Responsibilities: 
  1. Load environment configuration (.env)
  2. Initialize MySQL connection pool
  3. Set up Express app with middleware (CORS, compression, static files)
  4. Mount API router
  5. Initialize database schema via `initializeDatabase()`
  6. Start hourly image cleanup cron job
  7. Listen on port 3000 (mapped to 9615 in Docker)

**Frontend Entry Points:**
- `frontend/index.html`: Login page, entry for all users
  - Loads `frontend/js/login.js`
  - Transitions to `dashboard.html` on successful authentication
  
- `frontend/dashboard.html`: Main songsheet editor
  - Loads multiple modules: script.js, liedblattManagement.js, generatePDF.js, sessionManagement.js
  - Initializes drag-and-drop, preview renderer, PDF generator
  - Checks auth token and loads user info on page load

- `frontend/admin.html`: Administrator interface
  - Loads `frontend/js/admin.js`
  - Manages users, uploads objects (songs/liturgy), views institution settings
  - Restricted to 'admin' and 'super-admin' roles

- `frontend/bibliothek.html`: Object library management
  - Loads `frontend/js/bibliothek.js`
  - Search, filter, edit, delete objects
  - Restricted to 'admin' role only

## Error Handling

**Strategy:** Multi-layered error handling with user feedback

**Backend Error Patterns:**

1. **Authentication Errors:**
   - Missing/invalid token → return 401 Unauthorized
   - Token expired or signature invalid → return 403 Forbidden
   - Implementation: `authenticateToken()` middleware (line 105-115)

2. **Authorization Errors:**
   - User role insufficient → return 403 with JSON error message
   - Implementation: `checkRole()` middleware checks role against allowed array

3. **Data Validation Errors:**
   - Database constraint violations (unique email, etc.) → catch error and return 400
   - Missing required fields → validated before DB query
   - Pattern: Wrapped in try-catch with status codes and error messages

4. **Database Errors:**
   - Connection failures → caught and logged, 500 response
   - Query syntax errors → development logging, 500 response

**Frontend Error Patterns:**

1. **Network Errors:**
   - Caught in `authenticatedFetch()` (utils.js line 1-27)
   - Logged to console, rethrown for caller handling
   - User sees custom alert modal with error message

2. **Token Expiration:**
   - `checkAuthToken()` (utils.js line 30-52) detects 401 on `/api/verify-token`
   - Clears localStorage and redirects to login page

3. **User Feedback:**
   - `customAlert()`, `customConfirm()`, `customPrompt()` (utils.js) for modal dialogs
   - Replaces native browser dialogs with styled modals

4. **Unhandled Rejections:**
   - Caught by process handler at end of server.js
   - Logged but not exposed to user

## Cross-Cutting Concerns

**Logging:** 
- Pattern: `console.log()` and `console.error()` throughout
- Backend: Logs server startup, cron job execution, database operations, email sending
- Frontend: Logs object loading, drag-and-drop events, PDF generation steps

**Validation:**
- Backend: Basic type checking, email format validation before DB operations
- Frontend: Form validation, empty state checks for songsheet content
- Database: Foreign keys, unique constraints, enum type for role field

**Authentication:**
- Strategy: JWT tokens stored in localStorage
- Flow: Login endpoint issues token → token included in all subsequent API requests → middleware validates before handler
- Expiration: Tokens checked via `/api/verify-token` endpoint

**Authorization:**
- Mechanism: Role-based via `checkRole()` middleware
- Institution isolation: All queries filter by `institution_id` from JWT
- Admin actions: Require 'admin' or 'super-admin' role
- Regular users: Can create sessions/templates, cannot upload objects

**CORS:**
- Configured in Express (line 39-43) with origin whitelist from `URL` env var
- Allows credentials, GET/POST/PUT/DELETE methods, Content-Type header

**Compression:**
- Enabled via `compression()` middleware (line 37)
- Compresses JSON responses for faster transmission

**File Upload Security:**
- Multer limits file size implicitly
- Files stored with timestamp+original name (collision-resistant)
- Cleanup cron job prevents storage bloat
- No execution in upload directories (images only)
