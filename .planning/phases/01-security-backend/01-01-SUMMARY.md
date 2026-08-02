---
phase: 01-security-backend
plan: "01"
subsystem: infra
tags: [helmet, express-rate-limit, express-validator, cors, csp, security]

# Dependency graph
requires: []
provides:
  - helmet@8.1.0, express-rate-limit@8.3.2, express-validator@7.3.2 installiert
  - backend/app.js: Express-App Grundgerüst mit dokumentierter Middleware-Reihenfolge
  - Env-Var-Validierung: process.exit(1) bei fehlender URL oder anderen Pflicht-Vars
  - CORS ohne Wildcard-Fallback (SEC-04)
  - helmet() als erste Middleware mit CDN-CSP (BACK-02)
affects:
  - 01-02 (rate-limiting verwendet express-rate-limit aus diesem Plan)
  - 01-05 (BACK-01 Modularisierung baut auf app.js auf)

# Tech tracking
tech-stack:
  added:
    - helmet@8.1.0
    - express-rate-limit@8.3.2
    - express-validator@7.3.2
  patterns:
    - Env-Var-Validierung vor App-Initialisierung (SEC-04)
    - helmet() als erste Middleware (vor cors, vor compression)
    - Nummerierte Middleware-Reihenfolge als Dokumentationskommentar

key-files:
  created:
    - backend/app.js
  modified:
    - backend/package.json
    - backend/package-lock.json

key-decisions:
  - "URL als Pflicht-Env-Var — process.exit(1) bei Start ohne URL verhindert Wildcard-CORS-Fallback"
  - "helmet() als erste Middleware — setzt Security-Headers bevor CORS oder andere Middleware greifen"
  - "API-Router-Hook in app.js auskommentiert gelassen — wird in Plan 05 aktiviert wenn Routes extrahiert sind"

patterns-established:
  - "Env-Validierung-First: Pflicht-Env-Vars werden ganz oben validiert, bevor irgendwelche Requires oder Initialisierungen stattfinden"
  - "Nummerierte Middleware-Reihenfolge: Jeder app.use()-Block hat eine Nummer und einen Kommentar"

requirements-completed: [SEC-04, BACK-02]

# Metrics
duration: 5min
completed: 2026-04-07
---

# Phase 01 Plan 01: Libraries + app.js Grundgerüst Summary

**helmet@8.1.0 als erste Middleware mit CDN-CSP, CORS ohne Wildcard-Fallback via URL-Env-Validierung (process.exit), und drei Security-Libraries installiert**

## Performance

- **Duration:** ca. 5 min
- **Started:** 2026-04-07T22:17:00Z
- **Completed:** 2026-04-07T22:22:30Z
- **Tasks:** 2
- **Files modified:** 3 (package.json, package-lock.json, app.js)

## Accomplishments

- helmet@8.1.0, express-rate-limit@8.3.2, express-validator@7.3.2 installiert und per `require()` ladbar
- backend/app.js mit nummerierter Middleware-Reihenfolge (BACK-02), Env-Var-Validierung (SEC-04) und helmet()-CSP für CDN-Ressourcen (pdf-lib, Quill, fontkit)
- CORS-Wildcard-Fallback eliminiert: URL ist Pflicht-Env-Var, process.exit(1) wenn nicht gesetzt

## Installierte Library-Versionen

| Library | Version | Zweck |
|---------|---------|-------|
| helmet | 8.1.0 | HTTP Security Headers (CSP, HSTS, X-Content-Type-Options, entfernt X-Powered-By) |
| express-rate-limit | 8.3.2 | IP-basiertes Rate Limiting (für Plan 02) |
| express-validator | 7.3.2 | Input-Validierung und -Sanitisierung (für Plan 03) |

## CSP-Konfiguration (freigegebene CDN-Origins)

```javascript
contentSecurityPolicy: {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "unpkg.com", "cdnjs.cloudflare.com"],
        connectSrc: ["'self'"]
    }
}
```

- `cdn.jsdelivr.net` — Quill 2.0.2
- `cdnjs.cloudflare.com` — pdf-lib 1.17.1
- `unpkg.com` — fontkit 1.1.1

## Env-Vars als Pflichtfelder validiert

```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, URL
```

Fehlende Var → `FEHLER: Pflicht-Env-Var {var} nicht gesetzt. Server wird beendet.` + `process.exit(1)`

## Middleware-Reihenfolge (BACK-02 Nachweis)

1. Security Headers: `helmet()` mit CSP-Konfiguration — ERSTE Middleware
2. HTTP-Kompression: `compression()`
3. Body-Parser: `express.json({ limit: '50mb' })` + `express.urlencoded({ limit: '50mb' })`
4. CORS: `cors({ origin: process.env.URL.split(',') })` — kein Wildcard
5. Static Files: `/api/icons`, `/api/uploads`, `/api/ttf`
6. API-Router: auskommentiert (wird in Plan 05 aktiviert)
7. Frontend Static Serving: `express.static('../frontend')`

## Task Commits

1. **Task 1: Libraries installieren** - `e01fbd8` (chore)
2. **Task 2: app.js mit Middleware-Reihenfolge** - `405451a` (feat)

## Files Created/Modified

- `backend/app.js` — Express-App Grundgerüst, exportiert `app`, wird in Plan 05 von server.js importiert
- `backend/package.json` — helmet, express-rate-limit, express-validator als Dependencies hinzugefügt
- `backend/package-lock.json` — Lock-File aktualisiert

## Decisions Made

- URL als Pflicht-Env-Var mit process.exit(1) — verhindert, dass ein fehlkonfiguriertes Deployment mit Wildcard-CORS läuft
- API-Router-Hook auskommentiert gelassen — app.js soll standalone loadbar bleiben bis Plan 05 die Routes extrahiert
- CSP mit 'unsafe-inline' für Styles — Quill-Editor benötigt inline Styles; Scripts ohne 'unsafe-eval' oder 'unsafe-inline'

## Deviations from Plan

None — Plan wurde exakt ausgeführt.

## Issues Encountered

None.

## User Setup Required

None — keine externen Services oder neue Env-Vars erforderlich (URL war bereits in example.env).

## Next Phase Readiness

- Plan 02 (Rate Limiting): express-rate-limit ist installiert und bereit
- Plan 03 (Input-Validierung): express-validator ist installiert und bereit
- Plan 05 (BACK-01 Modularisierung): app.js mit auskommentiertem API-Router-Hook wartet auf Routes-Extraktion
- server.js ist unverändert — Produktivsystem läuft weiterhin stabil

---

*Phase: 01-security-backend*
*Completed: 2026-04-07*
