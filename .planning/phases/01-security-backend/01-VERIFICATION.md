---
phase: 01-security-backend
verified: 2026-04-08T10:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Server starten und Rate Limiting im laufenden Betrieb testen"
    expected: "Nach 5 Login-Versuchen gibt der sechste HTTP 429 zurück; Super-Login blockiert nach 3 Versuchen"
    why_human: "node_modules nicht lokal installiert; Node v25 inkompatibel mit jsonwebtoken@9.0.2 — nur Docker/Node 23 kann den Server starten"
  - test: "Passwort-Validierung gegen laufenden Server testen"
    expected: "POST /api/reset-password mit newPassword='abc' liefert HTTP 400 mit errors-Array"
    why_human: "Benötigt laufenden Server — node_modules fehlen lokal"
  - test: "Helmet-Security-Headers im HTTP-Response prüfen"
    expected: "curl -I gibt X-Content-Type-Options: nosniff und X-Frame-Options zurück"
    why_human: "Benötigt laufenden Server — statisch nicht verifizierbar"
---

# Phase 01: Security & Backend Verification Report

**Phase Goal:** Die App ist gegen bekannte Angriffsvektoren gehärtet und das Backend ist wartbar strukturiert
**Verified:** 2026-04-08T10:00:00Z
**Status:** human_needed
**Re-verification:** Nein — initiale Verifikation

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Login- und Password-Reset-Endpoints blockieren Brute-Force-Versuche nach 5 Fehlversuchen | ✓ VERIFIED (strukturell) | `loginLimiter` (max=5) als erste Middleware auf `router.post('/login', loginLimiter, ...)` in routes/auth.js bestätigt; `superLoginLimiter` (max=3) auf POST /super-login; `resetLimiter` auf allen drei Reset-Endpunkten |
| 2 | Das DB-Passwort erscheint nicht mehr in Server-Logs beim Start | ✓ VERIFIED | `grep -n "console.log.*password\|console.log.*Database config" backend/server.js` gibt 0 Treffer; server.js hat nur 35 Zeilen reinen Bootstrapper-Code ohne Logging |
| 3 | Anfragen von nicht-autorisierten Origins werden vom Server abgelehnt | ✓ VERIFIED | app.js Zeile 51: `origin: process.env.URL.split(',')` — kein Wildcard; Zeilen 7-11: `process.exit(1)` wenn URL-Env-Var fehlt — verhindert Deployment ohne explizite Origins |
| 4 | Ein neues Passwort wird nur akzeptiert, wenn es mindestens 8 Zeichen und Komplexitätsregeln erfüllt | ✓ VERIFIED (strukturell) | validation.js: `isLength({ min: 8 })`, `.matches(/[A-Z]/)`, `.matches(/[0-9]/)`, `.matches(/[^A-Za-z0-9]/)` — `passwordValidation` aktiv auf POST /reset-password, /set-password, PUT /users/change-password |
| 5 | server.js ist aufgeteilt — Routes, Controller und Middleware liegen in eigenen Dateien | ✓ VERIFIED | server.js: 35 Zeilen (wc -l bestätigt), enthält nur dotenv, require('./app'), initializeDatabase, cron-Job; 0 Treffer für `apiRouter.post\|apiRouter.get` in server.js; backend/middleware/ (3 Dateien), backend/routes/ (9 Dateien), backend/services/ (2 Dateien), backend/db/ (1 Datei) |

**Score:** 5/5 Truths strukturell verifiziert — HTTP-Laufzeit-Tests benötigen human verification

### Required Artifacts

| Artifact | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `backend/app.js` | Express-App mit Middleware-Reihenfolge und module.exports | ✓ VERIFIED | Existiert, 68 Zeilen, helmet() als erste Middleware, CORS ohne Wildcard, CSP, API-Router aktiv |
| `backend/package.json` | helmet, express-rate-limit, express-validator | ✓ VERIFIED | Alle drei Dependencies in korrekten Versionen (`^8.1.0`, `^8.3.2`, `^7.3.2`) |
| `backend/server.js` | Reiner Bootstrapper | ✓ VERIFIED | 35 Zeilen, nur dotenv+require('./app')+initializeDatabase+app.listen+cron |
| `backend/middleware/auth.js` | authenticateToken, authenticateAdmin, authenticateSuperAdmin, checkRole | ✓ VERIFIED | Existiert, alle 4 Funktionen vorhanden, module.exports korrekt, jwt.verify in 3 Stellen |
| `backend/middleware/rateLimits.js` | loginLimiter, resetLimiter, verificationLimiter, superLoginLimiter | ✓ VERIFIED | Existiert, Syntax OK (node -c), alle 4 Limiter mit windowMs=15min, standardHeaders: 'draft-7' |
| `backend/middleware/validation.js` | 6 Validierungsketten + handleValidationErrors | ✓ VERIFIED | Existiert, Syntax OK, min:8 / [A-Z] / [0-9] Regeln bestätigt, 7 Exports |
| `backend/db/pool.js` | pool, initializeDatabase, ALLOWED_TABLES | ✓ VERIFIED | Existiert, Syntax OK, ALLOWED_TABLES 4 Treffer (1 Def + 3 Guards), module.exports { pool, initializeDatabase } Zeile 171 |
| `backend/services/emailService.js` | E-Mail-Funktionen ohne rejectUnauthorized:false | ✓ VERIFIED | Existiert, Syntax OK, 0 Treffer für rejectUnauthorized: false, 8 Treffer für Funktionsnamen, korrekte Template-Pfade `path.join(__dirname, '..')` |
| `backend/services/imageCleanupService.js` | cleanupUnusedImages + pool-Import | ✓ VERIFIED | Existiert, Syntax OK, 2 Treffer für cleanupUnusedImages (Def+Export), require('../db/pool') vorhanden |
| `backend/routes/auth.js` | Auth-Routen mit Rate Limitern | ✓ VERIFIED | Existiert, Syntax OK, loginLimiter als erste Middleware auf POST /login bestätigt |
| `backend/routes/index.js` | Zentraler Router mit allen 8 Sub-Routern | ✓ VERIFIED | Existiert, alle 8 Sub-Router eingebunden (auth, users, institutions, objekte, sessions, vorlagen, uploads, contact) |

### Key Link Verification

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `backend/app.js` | `backend/routes/index.js` | `app.use('/api', require('./routes'))` | ✓ WIRED | app.js Zeile 62: `app.use('/api', require('./routes'))` — kein Kommentar mehr |
| `backend/routes/auth.js` | `backend/middleware/rateLimits.js` | `loginLimiter` als erste Middleware | ✓ WIRED | `router.post('/login', loginLimiter, loginValidation, handleValidationErrors, ...)` bestätigt |
| `backend/middleware/auth.js` | `backend/db/pool.js` | `require('../db/pool')` | ✓ WIRED | Zeile 2: `const pool = require('../db/pool');` — pool.js existiert und exportiert pool |
| `backend/services/imageCleanupService.js` | `backend/db/pool.js` | `require('../db/pool')` | ✓ WIRED | Bestätigt |
| `backend/server.js` | `backend/app.js` | `require('./app')` | ✓ WIRED | server.js Zeile 6: `const app = require('./app')` |

### Data-Flow Trace (Level 4)

Nicht anwendbar — Phase produziert Backend-Infrastruktur (Middleware, Routen, Services), keine Frontend-Komponenten die dynamische Daten rendern. Alle Module sind Request-Handler.

### Behavioral Spot-Checks

| Verhalten | Kommando | Ergebnis | Status |
|-----------|----------|----------|--------|
| Rate Limiting blockiert nach 5 Versuchen | 6x POST /api/login, 6. gibt 429 | Nicht testbar (kein laufender Server) | ? SKIP |
| Passwort-Validierung 400 bei schwachem Passwort | POST /api/reset-password mit 'abc' | Nicht testbar (kein laufender Server) | ? SKIP |
| Helmet X-Content-Type-Options Header | `curl -I http://localhost:3000/api/verify-token` | Nicht testbar (kein laufender Server) | ? SKIP |
| Keine Credential-Logs beim Start | `grep -n "console.log.*password" backend/server.js` | 0 Treffer | ✓ PASS |
| server.js als reiner Bootstrapper | `wc -l backend/server.js` | 35 Zeilen | ✓ PASS |
| rejectUnauthorized: false entfernt | `grep -n "rejectUnauthorized: false" backend/services/emailService.js` | 0 Treffer | ✓ PASS |
| ALLOWED_TABLES Whitelist in db/pool.js | `grep -c "ALLOWED_TABLES" backend/db/pool.js` | 4 (1 Def + 3 Guards) | ✓ PASS |
| CORS kein Wildcard | `grep "origin.*\*" backend/app.js` | 0 Treffer | ✓ PASS |

Hinweis: node_modules sind nicht lokal installiert (`ls backend/node_modules` → kein Verzeichnis). node -c Syntax-Checks liefen erfolgreich; require()-Tests (Laufzeit) nicht möglich. Dies ist konsistent mit dem in 01-05-SUMMARY dokumentierten Node v25 / jsonwebtoken-Inkompatibilitätsproblem — der Docker-Container (Node 23) ist die Produktions-Laufzeitumgebung.

### Requirements Coverage

| Requirement | Plan | Beschreibung | Status | Evidence |
|-------------|------|--------------|--------|---------|
| SEC-01 | 01-03, 01-05 | Rate Limiting auf Login/Reset/Verification (5/15min) | ✓ SATISFIED | loginLimiter/superLoginLimiter/resetLimiter/verificationLimiter in routes/auth.js aktiv |
| SEC-02 | 01-02 | SQL-Injection in DDL-Statements gefixt (ALLOWED_TABLES-Whitelist) | ✓ SATISFIED | ALLOWED_TABLES 4 Treffer in db/pool.js; `Ungültiger Tabellenname` Guard an 3 DDL-Stellen |
| SEC-03 | 01-02 | Credential-Logging entfernt | ✓ SATISFIED | 0 Treffer für console.log+password/DB_PASSWORD in server.js und allen neuen Dateien |
| SEC-04 | 01-01 | CORS-Wildcard-Fallback entfernt, URL als Pflicht-Env-Var | ✓ SATISFIED | app.js: `process.exit(1)` wenn URL fehlt; `origin: process.env.URL.split(',')` — kein Wildcard |
| SEC-05 | 01-02 | TLS-Validierung für E-Mail-Transport aktiviert | ✓ SATISFIED | 0 Treffer für `rejectUnauthorized: false` in emailService.js; Kommentar bestätigt sichere Defaults |
| SEC-06 | 01-03, 01-05 | Passwort-Validierungsregeln (min 8, Komplexität) | ✓ SATISFIED (strukturell) | `isLength({ min: 8 })`, `/[A-Z]/`, `/[0-9]/`, `/[^A-Za-z0-9]/` in validation.js; auf /reset-password, /set-password, /users/change-password aktiv |
| SEC-07 | 01-01 | Helmet Security Headers aktiviert | ✓ SATISFIED (strukturell) | app.js Zeile 28: `app.use(helmet({...}))` als erste Middleware mit vollständiger CSP-Konfiguration |
| SEC-08 | 01-03, 01-05 | Input-Validierung auf allen API-Endpoints | ✓ SATISFIED | loginValidation, emailValidation, passwordValidation, userCreateValidation, userUpdateValidation, changeEmailValidation auf allen HIGH-Risk-Endpunkten aktiv |
| BACK-01 | 01-03, 01-04, 01-05 | server.js modularisiert | ✓ SATISFIED | middleware/ (3), routes/ (9), services/ (2), db/ (1) — server.js 35 Zeilen Bootstrapper |
| BACK-02 | 01-01, 01-05 | Middleware-Reihenfolge dokumentiert und erhalten | ✓ SATISFIED | app.js Zeilen 22-65: nummerierte Kommentare (1-7) dokumentieren Reihenfolge; bei Modularisierung erhalten |

Alle 10 Requirements aus Phase 1 (SEC-01 bis BACK-02) sind durch konkrete Codebase-Evidenz abgedeckt. REQUIREMENTS.md zeigt alle als "Pending" — das Traceability-Dokument wurde noch nicht aktualisiert (manueller Schritt).

### Anti-Patterns Found

| Datei | Zeile | Pattern | Schwere | Impact |
|-------|-------|---------|---------|--------|
| `backend/routes/auth.js` | ca. 50 | `console.log('Super-login attempt received')` | ℹ️ Info | Nicht sicherheitskritisch — loggt keinen Credential-Wert, nur Statusmeldung; kein Passwort exposiert |

Keine Blocker-Anti-Patterns gefunden. Eine einzige Info-Log-Zeile im super-login Handler (protokolliert nur "attempt received", kein sensitives Datum).

### Human Verification Required

#### 1. Rate Limiting Laufzeit-Test

**Test:** Server starten mit `cd backend && URL=https://hymnoscribe.de node server.js`, dann 6 Login-Anfragen senden:
```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"usernameOrEmail":"test@test.de","password":"wrong"}';
done
```
**Expected:** Erste 5 Antworten: 401, 6. Antwort: 429 (Too Many Requests)
**Why human:** node_modules nicht lokal installiert; Node v25 inkompatibel mit jsonwebtoken@9.0.2 — Docker (Node 23) benötigt

#### 2. Passwort-Validierung Laufzeit-Test

**Test:** Nach Server-Start:
```bash
curl -X POST http://localhost:3000/api/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"dummy","newPassword":"abc"}'
```
**Expected:** HTTP 400 mit JSON-Body `{"errors":[...]}`  (nicht 500)
**Why human:** Benötigt laufenden Server mit node_modules

#### 3. Helmet Security Headers

**Test:** Nach Server-Start:
```bash
curl -I http://localhost:3000/api/verify-token
```
**Expected:** Response enthält `X-Content-Type-Options: nosniff` und `X-Frame-Options: SAMEORIGIN`
**Why human:** Benötigt laufenden Server

### Gaps Summary

Keine blockierenden Gaps gefunden. Alle 10 Requirements sind durch strukturelle Codebase-Analyse verifiziert. Drei Verhaltenstests konnten nicht automatisiert durchgeführt werden, weil node_modules lokal fehlen — das ist eine Umgebungsbeschränkung, kein Code-Problem. Im Docker-Container (Node 23, Produktions-Setup) sind alle Dependencies verfügbar.

Das einzige offene Element ist die Traceability: REQUIREMENTS.md zeigt alle Phase-1-Requirements noch als "Pending". Dies sollte nach Abschluss der human verification manuell auf "Done" gesetzt werden.

---

_Verified: 2026-04-08T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
