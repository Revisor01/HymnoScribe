# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
HymnoScribe/
├── backend/                          # Express.js REST API server
│   ├── server.js                     # Monolithic API server (1463 lines)
│   ├── package.json                  # Node.js dependencies
│   ├── package-lock.json
│   ├── uploads/                      # File storage for user uploads
│   │   ├── noten/                    # Music score images
│   │   ├── liturgie/                 # Liturgy images
│   │   ├── logos/                    # Church/institution logos
│   │   └── custom/                   # Custom images uploaded by users
│   ├── ttf/                          # Font files for PDF generation (57 font variants)
│   ├── icons/                        # SVG icons for UI elements
│   ├── email-template.html           # HTML template for transactional emails
│   ├── contact-email-template.html   # HTML template for contact form emails
│   └── .DS_Store                     # macOS metadata
│
├── frontend/                         # Vue-like vanilla JavaScript SPA
│   ├── index.html                    # Login page (entry point)
│   ├── dashboard.html                # Main songsheet editor
│   ├── admin.html                    # Administrator interface (user/object management)
│   ├── bibliothek.html               # Object (song/liturgy) library management
│   ├── verify-email.html             # Email verification completion page
│   ├── reset-password.html           # Password reset request page
│   ├── set-password.html             # New password entry page
│   │
│   ├── js/                           # JavaScript modules (7315 lines total)
│   │   ├── script.js                 # Main dashboard initialization & state (599 lines)
│   │   ├── liedblattManagement.js    # Songsheet DOM manipulation, object selection (971 lines)
│   │   ├── generatePDF.js            # PDF generation engine using pdf-lib (1919 lines)
│   │   ├── previewPageBreaks.js      # Page break preview rendering (1007 lines)
│   │   ├── sessionManagement.js      # Session & template CRUD, state persistence (520 lines)
│   │   ├── bibliothek.js             # Library search, filter, upload UI (839 lines)
│   │   ├── admin.js                  # Admin panel for user/institution management (736 lines)
│   │   ├── login.js                  # Authentication form logic (198 lines)
│   │   ├── dragAndDrop.js            # Drag-and-drop handler implementation (109 lines)
│   │   ├── utils.js                  # Shared utilities: API calls, UI dialogs (246 lines)
│   │   ├── reset-password.js         # Password reset form (54 lines)
│   │   ├── set-password.js           # Set password form (74 lines)
│   │   └── verify-email.js           # Email verification handler (43 lines)
│   │
│   ├── css/
│   │   └── style.css                 # All styling (22262 bytes, comprehensive responsive design)
│   │
│   ├── img/
│   │   └── Logo-hymnoscribe.png      # Application logo
│   │
│   └── .DS_Store
│
├── hymnoscribe_db/                   # MySQL database volume (Docker)
│   └── [database files]
│
├── migrations/                       # SQL migration scripts directory
│
├── .planning/                        # GSD planning documentation
│   └── codebase/                     # Codebase analysis documents
│
├── .github/                          # GitHub configuration
│
├── .git/                             # Git repository
│
├── docker-compose.yml                # Multi-container orchestration (MySQL + Node.js app)
├── Dockerfile                        # Multi-stage Docker image build
├── init.sql                          # Database schema initialization
├── run-migrations.sh                 # Migration execution script
├── .env                              # Environment variables (secrets - not committed)
├── example.env                       # Example environment configuration
├── .gitignore                        # Git ignore rules
├── .dockerignore                     # Docker build ignore rules
├── README.md                         # Project documentation
└── LICENSE                           # AGPL v3.0 license
```

## Directory Purposes

**`backend/`:**
- Purpose: Express.js REST API server providing all data persistence and business logic
- Contains: Monolithic server.js with ~50 API endpoints, file upload handling, email service
- Key files: `server.js` (main entry point)

**`backend/uploads/`:**
- Purpose: Persistent storage for user-uploaded files
- Contains: Organized subdirectories by content type (noten, liturgie, logos, custom)
- Generated: Yes (created by multer middleware on upload)
- Committed: No (mounted as Docker volume, .gitignore'd)

**`backend/ttf/`:**
- Purpose: Font files for PDF generation on client side
- Contains: 57 different font variants (regular, bold, italic combinations)
- Served: Via Express static middleware `/api/ttf`
- Usage: Embedded in PDFs by pdf-lib to ensure consistent rendering

**`frontend/`:**
- Purpose: Single-page application (SPA) for user interaction
- Contains: 7 HTML pages for different user journeys (login, dashboard, admin, library, password reset, email verification)
- Technology: Vanilla JavaScript (ES6 modules), no framework dependencies
- Styling: Single comprehensive CSS file with responsive design

**`frontend/js/`:**
- Purpose: Modular JavaScript components implementing business logic and UI interaction
- Pattern: Export-based module system (ES6 modules), all loaded with `<script type="module">`
- Dependency graph:
  - `script.js` imports from: liedblattManagement, sessionManagement, previewPageBreaks, dragAndDrop, utils
  - `liedblattManagement.js` imports from: script, sessionManagement, utils, previewPageBreaks
  - `generatePDF.js` imports from: script, uses global PDFLib
  - `sessionManagement.js` imports from: utils, liedblattManagement, script
  - All modules use `authenticatedFetch()` from utils.js

**`migrations/`:**
- Purpose: Database schema evolution scripts
- Contains: SQL files for schema additions/modifications
- Pattern: Run by `run-migrations.sh` on container startup
- Tracked: Yes (committed to git for version control)

## Key File Locations

**Entry Points:**

| File | Purpose | Route |
|------|---------|-------|
| `frontend/index.html` | Login page | `/` or `index.html` |
| `frontend/dashboard.html` | Songsheet editor | `/dashboard.html` |
| `frontend/admin.html` | Admin panel | `/admin.html` |
| `frontend/bibliothek.html` | Object library | `/bibliothek.html` |
| `backend/server.js` | API server | Port 3000 (Docker: 9615) |

**Configuration:**

| File | Purpose | Committed |
|------|---------|-----------|
| `docker-compose.yml` | Container orchestration | Yes |
| `Dockerfile` | Multi-stage build config | Yes |
| `init.sql` | Database schema | Yes |
| `.env` | Secrets (DB password, JWT secret, email config) | No |
| `example.env` | Example configuration template | Yes |

**Core Logic:**

| File | Responsibility | Lines |
|------|-----------------|-------|
| `backend/server.js` | API routes, middleware, business logic | 1463 |
| `frontend/js/script.js` | Dashboard initialization, global state | 599 |
| `frontend/js/liedblattManagement.js` | DOM manipulation, object selection | 971 |
| `frontend/js/generatePDF.js` | PDF generation engine | 1919 |
| `frontend/js/sessionManagement.js` | Session/template CRUD | 520 |
| `frontend/js/previewPageBreaks.js` | Page break preview | 1007 |

**Testing:**

- No test files present in codebase
- Test command in `backend/package.json`: "echo \"Error: no test specified\" && exit 1"

## Naming Conventions

**Files:**

- Backend routes: kebab-case in API paths (`/api/admin/users`, `/api/verify-token`)
- Frontend pages: kebab-case HTML files (`index.html`, `dashboard.html`, `admin.html`, `reset-password.html`)
- JavaScript modules: camelCase with descriptive names (`liedblattManagement.js`, `generatePDF.js`, `sessionManagement.js`)
- Data files: lowercase with hyphens (`docker-compose.yml`, `email-template.html`)
- CSS: Single file `style.css` covering all styling

**Directories:**

- Backend: lowercase (`backend`, `uploads`, `ttf`, `icons`, `migrations`)
- Frontend: lowercase (`frontend`, `css`, `js`, `img`)
- Special: dotfiles for configuration (`.github`, `.env`, `.gitignore`, `.dockerignore`)

**Database Tables:**

- lowercase plural English: `users`, `institutions`, `objekte`, `sessions`, `vorlagen`, `migrations`
- Exception: German `objekte` (represents songs/liturgy objects)

**CSS Classes & HTML IDs:**

- kebab-case for classes: `.selected-item`, `.lied-options`, `.strophen-container`, `.main-header`
- camelCase for IDs: `#liedblatt-content`, `#selected-items`, `#custom-modal`, `#previewFormat`
- Data attributes: kebab-case: `data-object`, `data-unique-id`, `data-liedblatt-id`

**JavaScript Variables & Functions:**

- camelCase for functions: `generatePDF()`, `loadObjekte()`, `saveSession()`, `authenticatedFetch()`
- UPPERCASE_CONST for constants: `BASE_FONT_SIZE`, `HEADING_1_SCALE`, `MAX_STROPHES_BEFORE_BREAK`
- camelCase for variables: `globalConfig`, `selectedItems`, `sessionData`, `quillInstances`

## Where to Add New Code

**New API Endpoint:**
- File: `backend/server.js`
- Pattern: Add `apiRouter.post|get|put|delete('/endpoint-name', authenticateToken, checkRole(['role']), handler)`
- Location: Group by feature area (auth, admin, user, content)
- Example: Email verification endpoints (lines 245-310)

**New Frontend Page/Feature:**
- HTML file: `frontend/{feature-name}.html`
- JavaScript module: `frontend/js/{feature-name}.js`
- Pattern: Create module with export functions, import into HTML via `<script type="module" src="js/{feature-name}.js"></script>`
- Styling: Add CSS classes to `frontend/css/style.css` (no separate CSS files)

**New Database Table:**
- SQL: `migrations/{timestamp}-{description}.sql`
- Schema definition: Use CREATE TABLE IF NOT EXISTS
- Relationships: Add FOREIGN KEY constraints to link to existing tables

**Shared Utilities:**
- File: `frontend/js/utils.js`
- Pattern: Export function, import in modules that need it
- Current utilities: `authenticatedFetch()`, modal dialogs, user role functions

**Font Addition:**
- Location: `backend/ttf/{font-name}.ttf`
- Usage: Reference in generatePDF.js font loading logic
- Pattern: Font must be OpenType or TrueType format

**Upload Directory:**
- Auto-created: No manual intervention needed
- Categories: noten/, liturgie/, logos/, custom/ already predefined in multer config
- Cleanup: Automatic hourly via cron job (line 62-71 in server.js)

## Special Directories

**`backend/uploads/`:**
- Purpose: Persistent user-uploaded files
- Generated: Yes (created on first upload by multer)
- Committed: No (volume mount in Docker)
- Cleanup: Hourly cron job deletes files not referenced in `objekte.notenbild` or `objekte.notenbildMitText`
- Structure: Organized by content type (noten, liturgie, logos, custom)

**`backend/ttf/`:**
- Purpose: Font files for PDF rendering
- Generated: No (static assets, committed to repo)
- Committed: Yes
- Size: 57 font files covering multiple faces (Jost, Montserrat, Roboto, Lato, OpenSans in regular/bold/italic)
- Served: Via `/api/ttf` static middleware, embedded in PDFs by pdf-lib

**`migrations/`:**
- Purpose: Database schema versions
- Generated: No (manually created SQL files)
- Committed: Yes
- Execution: Via `run-migrations.sh` on container startup
- Tracking: `migrations` table records applied migrations to prevent re-running

**`.planning/codebase/`:**
- Purpose: GSD-generated codebase documentation
- Generated: Yes (by mapper agent)
- Committed: Yes (part of .planning/ directory structure)
- Content: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`hymnoscribe_db/`:**
- Purpose: MySQL database volume
- Generated: Yes (Docker named volume)
- Committed: No (git ignored)
- Persistence: Survives container restart, backed up independently

## File Organization Summary

**Backend is monolithic:** All API logic, business rules, and route definitions in single `server.js` file (~1500 lines)

**Frontend is modular:** Separate JavaScript modules for features, single CSS file, multiple HTML entry points

**Assets are organized:** Fonts in ttf/, icons in icons/, uploads in uploads/ with subdirectories by type

**Configuration is environment-driven:** .env file contains all runtime configuration (database, email, JWT secret)

**Deployment is containerized:** Docker Compose orchestrates MySQL and Node.js, migrations run automatically on startup
