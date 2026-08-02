---
phase: 01-security-backend
plan: "04"
subsystem: backend-db-services
tags: [modularization, db, email, image-cleanup, extraction]
dependency_graph:
  requires: ["01-01", "01-02"]
  provides: ["db/pool.js", "services/emailService.js", "services/imageCleanupService.js"]
  affects: ["backend/server.js"]
tech_stack:
  added: []
  patterns: ["CommonJS module extraction", "require('../db/pool') dependency chain"]
key_files:
  created:
    - backend/db/pool.js
    - backend/services/emailService.js
    - backend/services/imageCleanupService.js
  modified: []
decisions:
  - "Exported sendNewUserWelcomeEmail (actual function name in server.js) instead of sendWelcomeEmail (plan alias) — plan frontmatter used a simplified name"
  - "Included sendChangeEmailVerification in emailService.js exports — function existed in server.js alongside the four named in plan"
  - "ALLOWED_TABLES placed after initializeDatabase in pool.js (mirrors server.js order) — helper functions createOrUpdateTable/addColumnIfNotExists included for completeness"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 01 Plan 04: DB and Services Extraction Summary

Extracted MySQL pool/DB initialization and email/image-cleanup services from monolithic server.js into dedicated modules. Three new files created; server.js untouched.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | db/pool.js erstellen | 5b1509e | backend/db/pool.js |
| 2 | services/emailService.js und imageCleanupService.js erstellen | 49dc3f1 | backend/services/emailService.js, backend/services/imageCleanupService.js |

## Created Files and Exports

### backend/db/pool.js

Exports: `pool`, `initializeDatabase`

Contains:
- `pool` — mysql2 connection pool configured from DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars
- `initializeDatabase()` — creates DB, user, grants privileges, creates all 5 tables, seeds super-admin if missing
- `ALLOWED_TABLES` constant (whitelist: users, institutions, objekte, sessions, vorlagen)
- `createOrUpdateTable()` — DDL helper with ALLOWED_TABLES guard
- `addColumnIfNotExists()` — column migration helper with ALLOWED_TABLES guard

Note: bcrypt is required in pool.js for the super-admin password hash during initialization.

### backend/services/emailService.js

Exports: `sendPasswordResetEmail`, `sendEmailVerification`, `sendNewUserWelcomeEmail`, `sendContactEmail`, `sendChangeEmailVerification`

Contains:
- `getEmailTemplate()` — reads backend/email-template.html
- `getContactEmailTemplate()` — reads backend/contact-email-template.html
- `renderEmailTemplate()` — template variable substitution including LOGO_URL
- `createTransporter()` — Nodemailer transport, TLS validation active (no rejectUnauthorized override)
- All 5 email-sending functions extracted exactly from server.js

**Template path correction (Vorher → Nachher):**
- server.js: `path.join(__dirname, 'email-template.html')` — resolves to `backend/email-template.html`
- emailService.js: `path.join(__dirname, '..', 'email-template.html')` — resolves to `backend/email-template.html` (correct, since module lives in `backend/services/`)

Same correction applied to contact-email-template.html.

### backend/services/imageCleanupService.js

Exports: `cleanupUnusedImages`

Contains:
- `cleanupUnusedImages()` — scans uploads/liturgie and uploads/noten, queries DB for referenced paths, deletes unreferenced files
- Imports `pool` from `../db/pool` — dependency chain established

**Upload path correction:** The `baseUploadDir` uses `path.join(__dirname, '..', 'uploads')` to correctly resolve from `backend/services/` to `backend/uploads/`. In server.js it was `path.join(__dirname, 'uploads')`.

## Import Chain Verification

`middleware/auth.js` (Plan 03) already contains `require('../db/pool')` as a prepared import. With `backend/db/pool.js` now in place, that import resolves correctly — the dependency chain is complete:

```
backend/middleware/auth.js → require('../db/pool') → backend/db/pool.js (exports pool)
backend/services/imageCleanupService.js → require('../db/pool') → backend/db/pool.js (exports pool)
```

## Deviations from Plan

### Name Discrepancy: sendWelcomeEmail vs. sendNewUserWelcomeEmail

- **Found during:** Task 2
- **Issue:** Plan frontmatter and must_haves listed export name `sendWelcomeEmail`, but actual function in server.js is `sendNewUserWelcomeEmail` (signature: `(email, username, resetToken)`)
- **Fix:** Exported under the actual function name `sendNewUserWelcomeEmail` to match server.js usage and avoid renaming that would break Plan 05 wiring
- **Files modified:** backend/services/emailService.js

### Additional export: sendChangeEmailVerification

- **Found during:** Task 2
- **Issue:** server.js contains `sendChangeEmailVerification()` alongside the four functions named in the plan — omitting it would make the service module incomplete
- **Fix:** Included in exports — function extracted exactly from server.js
- **Files modified:** backend/services/emailService.js

## Known Stubs

None. All extracted functions are complete implementations copied exactly from server.js.

## Self-Check: PASSED

All files found on disk. All commits verified in git log.

| Check | Result |
|-------|--------|
| backend/db/pool.js exists | FOUND |
| backend/services/emailService.js exists | FOUND |
| backend/services/imageCleanupService.js exists | FOUND |
| commit 5b1509e (pool.js) | FOUND |
| commit 49dc3f1 (services) | FOUND |
