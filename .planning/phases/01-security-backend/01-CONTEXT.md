# Phase 1: Security & Backend - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Die App ist gegen bekannte Angriffsvektoren gehärtet und das Backend ist wartbar strukturiert. Dies umfasst:
- Rate Limiting auf Login/Reset/Verification-Endpoints
- SQL-Injection-Fixes in DDL-Statements
- Credential-Logging entfernen
- CORS-Absicherung
- TLS-Validierung für E-Mail
- Passwort-Validierungsregeln
- Helmet Security Headers
- Input-Validierung mit express-validator
- server.js Modularisierung in Routes, Controller, Middleware, Services
- Middleware-Reihenfolge dokumentiert und erhalten

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key research findings to consider:
- Security-Fixes haben Abhängigkeiten untereinander (CORS-Fix ohne Env-Var-Validierung, JWT-Expiry-Kürzung ohne Refresh-Token etc.)
- Dependency-Map als erstes Deliverable erstellen
- SQL-Injection in DDL: mysql2 unterstützt kein Parameter-Binding für SHOW TABLES — Whitelist-Validierung nötig
- Credential-Logging-Fix ist kein isolierter Fix — Logging entfernen + Passwort rotieren + alte Logs löschen
- Monolith-Split: Express Middleware-Reihenfolge vorher dokumentieren
- Empfohlene Libraries: helmet@8.1.0, express-rate-limit@8.3.2, express-validator@7.3.2

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/server.js` — monolithische Datei mit allen Routes, Middleware, DB-Operationen (1463 Zeilen)
- Bestehende Auth-Middleware: `authenticateToken()`, `authenticateAdmin()`, `authenticateSuperAdmin()`, `checkRole()`
- MySQL connection pool via mysql2/promise

### Established Patterns
- Express.js Route Handler: `apiRouter.post/get/put/delete()`
- Async/await mit try-catch für DB-Operationen
- JSON-Responses: `res.json({ ... })` oder `res.status(code).json({ ... })`
- Error-Logging: `console.error()` (German messages)

### Integration Points
- Middleware-Chain: compression → cors → static files → api router → error handler
- JWT-Token-Signing in Login-Endpoints
- Multer für File-Uploads
- Nodemailer für E-Mail

### Known Issues (from .planning/codebase/CONCERNS.md)
- SQL-Injection: `backend/server.js` lines 1235, 1252, 1255
- Credential-Logging: `backend/server.js` lines 17-22
- TLS disabled: `backend/server.js` line 1290
- CORS wildcard: `backend/server.js` line 40
- No rate limiting on any endpoint
- No input validation beyond basic type checks

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
