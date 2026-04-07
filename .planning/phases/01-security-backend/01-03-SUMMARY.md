---
phase: 01-security-backend
plan: 03
subsystem: auth
tags: [jwt, express-rate-limit, express-validator, middleware, rate-limiting, input-validation]

# Dependency graph
requires:
  - phase: 01-security-backend/01-01
    provides: Helmet Security-Header-Middleware (app.js)
  - phase: 01-security-backend/01-02
    provides: Datenbankmigrationen fuer User-Schema-Haertung
provides:
  - backend/middleware/auth.js mit authenticateToken, authenticateAdmin, authenticateSuperAdmin, checkRole
  - backend/middleware/rateLimits.js mit loginLimiter, resetLimiter, verificationLimiter, superLoginLimiter
  - backend/middleware/validation.js mit loginValidation, emailValidation, passwordValidation, userCreateValidation, userUpdateValidation, changeEmailValidation, handleValidationErrors
affects: [01-security-backend/01-05, routes-extraction, server-refactoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Middleware-Extraktion: Auth-Funktionen aus monolithischem server.js in eigene Module auslagern"
    - "Rate Limiter mit standardHeaders: draft-7 (RFC-konform, kein legacyHeaders)"
    - "Healthcheck-Ausnahme im loginLimiter (skip fuer 127.0.0.1 und ::1)"
    - "Zentraler handleValidationErrors-Handler fuer alle Validierungsketten"

key-files:
  created:
    - backend/middleware/auth.js
    - backend/middleware/rateLimits.js
    - backend/middleware/validation.js
  modified: []

key-decisions:
  - "server.js bleibt unveraendert — Middleware-Module werden vorbereitet, Integration erst in Plan 05"
  - "pool.js-Import in auth.js ist vorbereitend — wird in Plan 04 aufgeloest"
  - "superLoginLimiter strenger (3 Versuche) als loginLimiter (5 Versuche) — Super-Admin-Endpunkt hat hoeheres Risikoprofil"
  - "changeEmailValidation zusaetzlich zu den geplanten Validierungen ergaenzt (Vollstaendigkeit der HIGH-Risk-Endpoints)"

patterns-established:
  - "Middleware-Module exportieren benannte Funktionen/Objekte via module.exports"
  - "Validierungsketten sind reine Arrays von express-validator body()-Chains"
  - "Rate Limiter: einheitlich windowMs=15min, standardHeaders draft-7, kein legacyHeaders"

requirements-completed: [SEC-01, SEC-06, SEC-07, SEC-08, BACK-01]

# Metrics
duration: 15min
completed: 2026-04-08
---

# Phase 01 Plan 03: Middleware-Module Summary

**Auth-Middleware extrahiert, Rate Limiter (4 Instanzen, 3-5 Versuche/15min) und Input-Validierungsketten (7 Chains) fuer alle HIGH-Risk-Endpoints erstellt**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3 (alle neu erstellt)

## Accomplishments

- Auth-Middleware (authenticateToken, authenticateAdmin, authenticateSuperAdmin, checkRole) exakt aus server.js extrahiert in backend/middleware/auth.js
- Vier Rate Limiter in rateLimits.js: loginLimiter (5/15min mit Healthcheck-Skip), resetLimiter (5/15min), verificationLimiter (5/15min), superLoginLimiter (3/15min strenger)
- Sieben Validierungsketten in validation.js: passwordValidation erzwingt min. 8 Zeichen, Grossbuchstabe, Zahl, Sonderzeichen (SEC-06)

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: middleware/auth.js erstellen** - `c9145c6` (feat)
2. **Task 2: rateLimits.js und validation.js erstellen** - `91d0e51` (feat)

**Plan metadata:** (wird nach SUMMARY-Commit hinzugefuegt)

## Files Created/Modified

- `backend/middleware/auth.js` - Auth-Middleware: authenticateToken, authenticateAdmin, authenticateSuperAdmin, checkRole (extrahiert aus server.js Zeilen 97-142)
- `backend/middleware/rateLimits.js` - Rate Limiter fuer Login, Password-Reset, Email-Verifizierung und Super-Admin-Login
- `backend/middleware/validation.js` - Input-Validierungsketten fuer alle HIGH-Risk-Endpunkte

## Rate-Limiter-Konfiguration

| Limiter | Endpunkte | max | windowMs | Besonderheit |
|---------|-----------|-----|----------|--------------|
| loginLimiter | POST /login | 5 | 15min | skip: 127.0.0.1, ::1 |
| resetLimiter | /request-password-reset, /reset-password, /set-password | 5 | 15min | — |
| verificationLimiter | /request-email-verification, /verify-email | 5 | 15min | — |
| superLoginLimiter | POST /super-login | 3 | 15min | strenger wegen hohes Risiko |

Alle Limiter: `standardHeaders: 'draft-7'`, `legacyHeaders: false`

## Passwort-Validierungsregeln (passwordValidation)

Fuer `body('newPassword')`:
- `.isLength({ min: 8 })` — Mindestens 8 Zeichen
- `.matches(/[A-Z]/)` — Mindestens ein Grossbuchstabe
- `.matches(/[0-9]/)` — Mindestens eine Zahl
- `.matches(/[^A-Za-z0-9]/)` — Mindestens ein Sonderzeichen

## Endpunkte ohne Validierung (Prioritaet 2+3 fuer Plan 05)

Die folgenden Endpunkte haben noch keine Validierungsketten in validation.js (werden in Plan 05 bei Route-Extraktion angehaengt):

**Prioritaet 2 (Mittel):**
- POST /contact — Kontaktformular (name, email, message, inquiryType)
- PUT /user/profile — Profil-Update (username, email)
- POST /objekte — Objekt anlegen (titel, typ, strophen, copyright)
- PUT /objekte/:id — Objekt aktualisieren
- POST /sessions — Session speichern (name, data)
- POST /vorlagen — Vorlage speichern

**Prioritaet 3 (Niedrig, da authentifiziert):**
- GET-Endpunkte generell (Query-Parameter-Validierung optional)
- DELETE-Endpunkte (nur ID-Parameter, bereits per Route-Pattern begrenzt)

## Decisions Made

- server.js bleibt unveraendert bis Plan 05 — Module werden vorbereitet, nicht integriert
- pool.js-Import in auth.js ist Platzhalter fuer Plan 04 (db/pool.js-Extraktion)
- changeEmailValidation als zusaetzliche Validierung ergaenzt (nicht im Plan spezifiziert, aber logisch vollstaendig)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] changeEmailValidation ergaenzt**
- **Found during:** Task 2 (validation.js Erstellung)
- **Issue:** Plan spezifizierte 6 Validierungsketten; PUT /user/change-email (Endpunkt mit Passwort + E-Mail-Aenderung) fehlte
- **Fix:** changeEmailValidation mit newEmail (isEmail, normalizeEmail) und password (notEmpty) hinzugefuegt und exportiert
- **Files modified:** backend/middleware/validation.js
- **Verification:** Alle 7 Exports in module.exports enthalten, Syntax-Check besteht
- **Committed in:** 91d0e51 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical)
**Impact on plan:** Vollstaendige Abdeckung aller authentication-relevanten HIGH-Risk-Endpunkte. Kein Scope-Creep.

## Issues Encountered

- node_modules nicht im Worktree installiert (nur Docker-Kontext) — Laufzeit-Verifikation via `node -e "require(...)"` nicht moeglich. Stattdessen: node -c Syntax-Check + manuelle Acceptance-Criteria-Pruefung. Pakete (express-rate-limit, express-validator) sind korrekt in package.json deklariert.

## Next Phase Readiness

- backend/middleware/ Verzeichnis vollstaendig mit auth.js, rateLimits.js, validation.js
- Plan 04 kann db/pool.js erstellen — auth.js-Import wird dann aufloesbar
- Plan 05 (Route-Extraktion) kann alle drei Middleware-Module direkt importieren
- Rate Limiter und Validierungsketten sind bereit zum Einhaengen in Express-Router

---
*Phase: 01-security-backend*
*Completed: 2026-04-08*


## Self-Check: PASSED

- backend/middleware/auth.js: FOUND
- backend/middleware/rateLimits.js: FOUND
- backend/middleware/validation.js: FOUND
- .planning/phases/01-security-backend/01-03-SUMMARY.md: FOUND
- Commit c9145c6 (auth.js): FOUND
- Commit 91d0e51 (rateLimits.js + validation.js): FOUND
