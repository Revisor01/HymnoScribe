# Phase 1: Security & Backend - Research

**Researched:** 2026-04-08
**Domain:** Express.js Security Hardening + Backend-Modularisierung (Brownfield)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Keine expliziten User-Entscheidungen — reine Infrastruktur-Phase. Alle Implementierungsentscheidungen liegen im Ermessen von Claude.

Vorab identifizierte Leitlinien aus CONTEXT.md:
- Security-Fixes haben Abhängigkeiten untereinander — Dependency-Map als erstes Deliverable
- SQL-Injection in DDL: mysql2 unterstützt kein Parameter-Binding für SHOW TABLES — Whitelist-Validierung nötig
- Credential-Logging-Fix ist kein isolierter Fix — Logging entfernen + Passwort rotieren + alte Logs löschen
- Monolith-Split: Express Middleware-Reihenfolge vorher dokumentieren
- Empfohlene Libraries: helmet@8.1.0, express-rate-limit@8.3.2, express-validator@7.3.2

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
Keine deferrierten Ideen (discuss phase skipped).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Rate Limiting auf Login-, Password-Reset- und Verification-Endpoints (5 Versuche/15min pro IP) | express-rate-limit@8.3.2 — selektiv auf 6 Endpunkte anwenden; `skip`-Option für interne IPs |
| SEC-02 | SQL-Injection in DDL-Statements gefixt (Whitelist-Validierung für Tabellennamen) | mysql2 unterstützt kein Binding für SHOW TABLES; Whitelist gegen hardcodierte Tabellenliste |
| SEC-03 | Credential-Logging beim Server-Start entfernt, DB-Passwort rotiert | Zeilen 17-22 entfernen; Passwort-Rotation als separater manueller Schritt dokumentiert |
| SEC-04 | CORS-Wildcard-Fallback entfernt, nur explizite Origins erlaubt | Env-Var `URL` als Pflichtfeld beim Start validieren; App-Start abbrechen wenn nicht gesetzt |
| SEC-05 | TLS-Validierung für E-Mail-Transport aktiviert (rejectUnauthorized: true) | `tls`-Block aus createTransporter() entfernen — Nodemailer sichere Defaults greifen |
| SEC-06 | Passwort-Validierungsregeln (Mindestlänge 8 Zeichen, Komplexitätsregeln) | express-validator@7.3.2 — Server-seitig; frontend client-seitige Spiegelung der Regeln |
| SEC-07 | Helmet Security Headers aktiviert | helmet@8.1.0 — als erste Middleware vor cors() registrieren |
| SEC-08 | Input-Validierung mit express-validator auf allen API-Endpoints | express-validator@7.3.2 — systematisch für alle POST/PUT-Routen |
| BACK-01 | server.js modularisiert in Routes, Controller, Middleware, Services | Middleware-Reihenfolge zuerst dokumentieren; dann extrahieren |
| BACK-02 | Middleware-Reihenfolge dokumentiert und durch Modularisierung erhalten | Kommentierte Reihenfolge in neuem app.js als Blaupause |
</phase_requirements>

---

## Summary

Phase 1 ist eine reine Sicherheits- und Strukturverbesserungsphase auf einem laufenden Produktivsystem. Es gibt keine neuen Features — nur Fixes und Refactoring. Die größte Gefahr ist nicht, dass ein Fix nicht funktioniert, sondern dass ein Fix ein anderes bestehendes Feature bricht.

Die kritischste Abhängigkeit: Der CORS-Fix (SEC-04) erfordert zwingend eine Env-Var-Validierung beim Start — sonst ist der Fix in Produktions-Deployments ohne korrekte `URL`-Env-Var wirkungslos oder bricht die App. Rate Limiting (SEC-01) muss selektiv auf genau die richtigen Endpunkte angewendet werden, ohne allgemeine API-Calls zu drosseln.

Der Monolith-Split (BACK-01/BACK-02) birgt das Risiko, die implizite Express-Middleware-Reihenfolge zu zerstören. Gegenmittel: Reihenfolge als kommentierte Liste dokumentieren, bevor eine einzige Zeile verschoben wird, und die neue `app.js` nach dieser Liste aufbauen.

**Primary recommendation:** Security-Fixes und Modularisierung in parallelen Waves, aber die Middleware-Reihenfolge-Dokumentation MUSS vor dem ersten Modularisierungs-Commit stehen.

---

## Standard Stack

### Core (neu zu installieren)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| helmet | 8.1.0 | HTTP Security Headers (CSP, HSTS, X-Content-Type-Options etc.) | Express-offiziell empfohlen; setzt ~14 Header korrekt; eine Zeile Middleware |
| express-rate-limit | 8.3.2 | IP-basiertes Rate Limiting | Defacto-Standard für Express; lightweight, kein Redis nötig (Single-Instance) |
| express-validator | 7.3.2 | Input-Validierung und -Sanitisierung | Nativ für Express; Chain-API passt zu bestehendem Muster |

[VERIFIED: npm registry — alle Versionen aktuell, Stand 2026-04-08]

### Bereits vorhanden (keine Änderung)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| express | 4.18.2 | HTTP Framework | Kompatibel mit helmet@8, rate-limit@8, validator@7 |
| mysql2 | 3.10.3 | DB-Queries | Parameterized Queries für DML bereits korrekt genutzt |
| jsonwebtoken | 9.0.2 | JWT Auth | Kein Änderungsbedarf für Phase 1 |
| nodemailer | 6.9.14 | E-Mail | TLS-Fix: nur `tls`-Block entfernen, Library bleibt |
| bcrypt | 5.1.1 | Passwort-Hashing | Bleibt unverändert |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| express-rate-limit | rate-limiter-flexible | Nur sinnvoll bei Multi-Instance mit Redis-Backend — für Single-Instance Overkill |
| express-validator | zod | Besser bei TypeScript; für Vanilla JS Backend unnötig |
| helmet | Manuelle Header | Helmet kennt Edge Cases (Content-Security-Policy, Vary-Header) die manuell übersehen werden |

**Installation:**
```bash
cd backend && npm install helmet express-rate-limit express-validator
```

**Versions-Verifikation:**
```
helmet:               8.1.0  [VERIFIED: npm view helmet version]
express-rate-limit:   8.3.2  [VERIFIED: npm view express-rate-limit version]
express-validator:    7.3.2  [VERIFIED: npm view express-validator version]
```

---

## Architecture Patterns

### Empfohlene Verzeichnisstruktur nach Modularisierung (BACK-01)

```
backend/
├── server.js               # Nur noch: app.listen() nach initializeDatabase()
├── app.js                  # Express-App, Middleware-Registrierung in korrekter Reihenfolge
├── middleware/
│   ├── auth.js             # authenticateToken, authenticateAdmin, authenticateSuperAdmin, checkRole
│   ├── rateLimits.js       # loginLimiter, resetLimiter, verificationLimiter
│   └── validation.js       # express-validator Chains für alle Endpunkte
├── routes/
│   ├── auth.js             # /login, /super-login, /verify-token, /request-password-reset, /reset-password, /set-password
│   ├── users.js            # /admin/user, /admin/users, /user/*
│   ├── institutions.js     # /admin/institution, /admin/institutions
│   ├── objekte.js          # /objekte (CRUD)
│   ├── sessions.js         # /sessions (CRUD)
│   ├── vorlagen.js         # /vorlagen (CRUD)
│   ├── uploads.js          # /upload-logo, /upload-custom-image
│   └── contact.js          # /contact
├── controllers/
│   ├── authController.js   # Login-Logik, Token-Erstellung
│   ├── userController.js   # User-CRUD
│   └── [...]
├── services/
│   ├── emailService.js     # createTransporter, sendPasswordResetEmail, sendEmailVerification, etc.
│   └── imageCleanupService.js # cleanupUnusedImages
├── db/
│   └── pool.js             # MySQL Pool-Konfiguration, initializeDatabase
└── package.json
```

### Pattern 1: Express Middleware-Registrierungsreihenfolge (BACK-02)

Die aktuelle Reihenfolge in `server.js` (zu erhalten und zu dokumentieren):

```
1.  compression()                     # Zeile 37  — HTTP-Kompression
2.  express.json()                    # Zeile 38  — Body-Parser (klein, vor CORS)
3.  cors({ origin: [...] })           # Zeile 39  — CORS vor Routen
4.  express.static('/api/icons')      # Zeile 45  — Static Files
5.  express.static('/api/uploads')    # Zeile 46
6.  express.static('/api/ttf')        # Zeile 47
7.  apiRouter (app.use('/api', ...))  # Zeile 151 — API-Routen
8.  express.json({ limit: '50mb' })   # Zeile 154 — Upload-Body-Limit (redundant aber vorhanden)
9.  express.urlencoded(...)           # Zeile 157
10. express.static('../frontend')     # Zeile 159 — Frontend-Serving
```

**Hinweis:** Nach der Modularisierung muss `helmet()` als ERSTE Middleware eingetragen werden (vor compression). [ASSUMED: helmet vor compression ist üblich; keine Reihenfolge-Abhängigkeit dokumentiert, aber best practice]

Neue Reihenfolge in `app.js`:
```
1.  helmet()                          # NEU — Security Headers
2.  compression()
3.  express.json({ limit: '50mb' })   # Zusammenführung der zwei express.json()-Aufrufe
4.  express.urlencoded(...)
5.  cors({ origin: [...] })           # Nach Env-Var-Validierung
6.  Static-Files (icons, uploads, ttf, frontend)
7.  apiRouter
```

### Pattern 2: Rate Limiter — selektiv, nicht global

**Endpunkte mit Rate Limiting (SEC-01):**

| Endpunkt | Zeile | Limit | Limiter-Name |
|----------|-------|-------|--------------|
| POST `/login` | 349 | 5/15min | `loginLimiter` |
| POST `/request-password-reset` | 226 | 5/15min | `resetLimiter` |
| POST `/reset-password` | 331 | 5/15min | `resetLimiter` |
| POST `/set-password` | 270 | 5/15min | `resetLimiter` |
| POST `/request-email-verification` | 246 | 5/15min | `verificationLimiter` |
| POST `/verify-email` | 879 | 5/15min | `verificationLimiter` |
| POST `/super-login` | 375 | 3/15min | `superLoginLimiter` (strenger) |

**Alle anderen Endpunkte: kein Limiter** — authentifizierte API-Calls werden nicht gedrosselt.

```javascript
// Source: express-rate-limit@8.3.2 offiziell
const { rateLimit } = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 5,
    standardHeaders: 'draft-7', // Sendet RateLimit-* Header (RFC 9110)
    legacyHeaders: false,
    message: { error: 'Zu viele Anmeldeversuche, bitte versuchen Sie es in 15 Minuten erneut.' }
});

// Anwendung:
apiRouter.post('/login', loginLimiter, async (req, res) => { ... });
```

[VERIFIED: express-rate-limit Dokumentation via npm — `standardHeaders: 'draft-7'` ist aktueller Standard in v8]

### Pattern 3: CORS mit Pflicht-Env-Var (SEC-04)

Aktueller Code (Zeile 39-43) — unsicher:
```javascript
origin: process.env.URL ? process.env.URL.split(',') : ['*', 'https://hymnoscribe.de']
```

Korrekter Ansatz — Env-Var-Validierung beim Start:
```javascript
// In db/pool.js oder app.js — vor app.listen()
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FEHLER: Pflicht-Env-Var ${envVar} nicht gesetzt. Server wird beendet.`);
        process.exit(1);
    }
}

// CORS nur mit expliziter URL
const corsOptions = {
    origin: process.env.URL.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
```

[ASSUMED: `credentials: true` — wird benötigt wenn Frontend Cookies sendet; bei JWT-only nicht zwingend, aber schadet nicht]

### Pattern 4: SQL-Injection-Fix für DDL (SEC-02)

mysql2 unterstützt kein Paramater-Binding für `SHOW TABLES LIKE ?` und `ALTER TABLE`. Fix über Whitelist:

```javascript
// In db/pool.js oder db/migrations.js
const ALLOWED_TABLES = ['users', 'institutions', 'objekte', 'sessions', 'vorlagen'];

async function createOrUpdateTable(conn, tableName, createTableSQL) {
    if (!ALLOWED_TABLES.includes(tableName)) {
        throw new Error(`Ungültiger Tabellenname: ${tableName}`);
    }
    const [rows] = await conn.query(`SHOW TABLES LIKE '${tableName}'`); // Safe: whitelist-validiert
    // ...
}
```

[CITED: PITFALLS.md — "mysql2 DDL-Statements unterstützen kein Parameter-Binding"]
[VERIFIED: Codebase — server.js Zeilen 1235, 1252, 1255 sind die drei Stellen]

### Pattern 5: Passwort-Validierung (SEC-06)

```javascript
// In middleware/validation.js
const { body, validationResult } = require('express-validator');

const passwordValidation = body('newPassword')
    .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen haben')
    .matches(/[A-Z]/).withMessage('Passwort muss mindestens einen Großbuchstaben enthalten')
    .matches(/[0-9]/).withMessage('Passwort muss mindestens eine Zahl enthalten')
    .matches(/[^A-Za-z0-9]/).withMessage('Passwort muss mindestens ein Sonderzeichen enthalten');

// Anwendung auf /reset-password, /set-password, /user/change-password:
apiRouter.post('/reset-password', resetLimiter, passwordValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // ...
});
```

[VERIFIED: express-validator@7.3.2 Dokumentation via npm registry — chain API korrekt]

### Anti-Patterns to Avoid

- **helmet() nach cors() registrieren:** Helmet muss als erste Middleware stehen, um Security-Header bei jeder Response zu setzen — auch bei CORS-Preflight-Responses
- **Rate Limiter global auf alle Routen:** Drosselt authentifizierte Nutzer-API-Calls und Healthchecks; nur Auth-Endpunkte limitieren
- **CORS-Fix ohne Env-Var-Validierung:** Fix sieht vollständig aus, greift aber nicht wenn `URL` leer ist
- **DDL mit Parameter-Binding versuchen:** mysql2 wirft Fehler; Whitelist ist der einzige korrekte Weg
- **Middleware-Reihenfolge bei Extraktion nicht dokumentieren:** Nach Refactoring sporadische 401/CORS-Fehler — schwer zu debuggen

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Security HTTP-Header | Manuelle `res.setHeader()` Calls | helmet@8.1.0 | 14 Header mit edge-case-korrekte Werte; X-Content-Type-Options, HSTS, CSP-Defaults korrekt |
| IP-basiertes Rate Limiting | Eigener Counter in Memory/DB | express-rate-limit@8.3.2 | Slidingwindow, `Retry-After`-Header, standardkonforme RateLimit-Header; kein Wheel reinventing |
| Input-Validierung | Manuelle `if (!req.body.x || typeof x !== 'string')` | express-validator@7.3.2 | Strukturierte Errors, sanitization (trim, escape), einfache Chain-Komposition |

**Key insight:** Security-Libraries kennen Edge Cases (Header-Injection, Encoding-Bypässe, X-Forwarded-For-Spoofing), die in Custom-Implementierungen regelmäßig übersehen werden.

---

## Common Pitfalls

### Pitfall 1: CORS-Fix ohne Env-Var-Validierung
**What goes wrong:** `process.env.URL` ist in einem Deployment leer → Wildcard greift weiterhin
**Why it happens:** Der Fix sieht im Code vollständig aus; das Problem tritt erst in Produktion auf
**How to avoid:** App-Start mit `process.exit(1)` abbrechen wenn `URL` nicht gesetzt
**Warning signs:** Nach Deployment funktioniert CORS noch mit beliebigen Origins

### Pitfall 2: Credential-Logging nur halb gefixt
**What goes wrong:** Zeile 17-22 gelöscht, aber Docker-Logs enthalten Passwort aus vergangenen Starts
**Why it happens:** Fix wird als reines Code-Problem behandelt, nicht als Incident
**How to avoid:** Fix-Paket = Code-Fix + Passwort-Rotation + `docker logs`-Rotation
**Warning signs:** `docker logs hymnoscribe | grep -i password` zeigt noch Einträge

### Pitfall 3: Rate Limiter bricht Login-Monitoring / Tests
**What goes wrong:** Test-Suite oder Monitoring-Healthcheck triggert Rate Limit
**Why it happens:** Limiter ohne `skip`-Option für bekannte IPs/User-Agents
**How to avoid:** `skip: (req) => req.ip === '127.0.0.1'` für lokale Healthchecks
**Warning signs:** CI/CD-Tests schlagen nach wenigen Runs fehl

### Pitfall 4: Middleware-Reihenfolge nach Refactoring falsch
**What goes wrong:** CORS oder Auth-Middleware landet nach den Routen in der neuen app.js
**Why it happens:** Thematische Extraktion (alle Auth-Files) ignoriert Ausführungsreihenfolge
**How to avoid:** Middleware-Reihenfolge als nummerierte Liste vor erstem Commit dokumentieren
**Warning signs:** API-Calls bekommen nach Refactoring unerwartet 401 oder CORS-Fehler

### Pitfall 5: TLS-Fix Nodemailer — Produktions-SMTP braucht Validierung
**What goes wrong:** `rejectUnauthorized: false` entfernt → SMTP-Verbindung mit selbstsigniertem Zertifikat schlägt fehl
**Why it happens:** Wenn SMTP-Server ein selbstsigniertes Zertifikat hat (z.B. lokale Mailhog-Instanz)
**How to avoid:** Vor dem Deployment TLS-Verbindung mit dem echten SMTP-Server testen
**Warning signs:** E-Mails werden nach dem Fix nicht mehr gesendet; SMTP-TLS-Fehler in Logs

### Pitfall 6: Login-Endpunkt loggt Passwort mit
**What goes wrong:** `console.log('Login attempt:', req.body)` auf Zeile 350 loggt Klartext-Passwort
**Why it happens:** Debug-Log vergessen zu entfernen
**How to avoid:** Bei SEC-03 (Credential-Logging) auch Login-Debug-Logs prüfen und entfernen
**Warning signs:** `docker logs hymnoscribe | grep password` zeigt Login-Versuche mit Passwörtern

---

## Code Examples

### Helmet Setup (SEC-07)

```javascript
// In app.js — als erste Middleware
const helmet = require('helmet');
const app = express();

app.use(helmet()); // Alle Defaults aktivieren
// Konfiguration nur wenn CSP Probleme mit CDN-Ressourcen macht:
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             scriptSrc: ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"],
//             imgSrc: ["'self'", "data:"]
//         }
//     }
// }));
```

**Achtung:** Die App lädt pdf-lib, fontkit und Quill über CDN (cdn.jsdelivr.net, cdnjs.cloudflare.com, unpkg.com). helmet() mit Default-CSP blockiert diese. CSP muss diese Origins explizit erlauben. [VERIFIED: CLAUDE.md Stack-Sektion — CDN-Abhängigkeiten dokumentiert]

### express-validator Middleware-Extraktion (SEC-08)

```javascript
// In middleware/validation.js
const { body, param, validationResult } = require('express-validator');

// Wiederverwendbare Validierungsketten
const loginValidation = [
    body('usernameOrEmail').trim().notEmpty().withMessage('Benutzername oder E-Mail erforderlich'),
    body('password').notEmpty().withMessage('Passwort erforderlich')
];

const passwordValidation = [
    body('newPassword')
        .isLength({ min: 8 }).withMessage('Mindestens 8 Zeichen')
        .matches(/[A-Z]/).withMessage('Mindestens ein Großbuchstabe')
        .matches(/[0-9]/).withMessage('Mindestens eine Zahl')
        .matches(/[^A-Za-z0-9]/).withMessage('Mindestens ein Sonderzeichen')
];

// Validierungsfehler-Handler als Middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = { loginValidation, passwordValidation, handleValidationErrors };
```

### Vollständige Middleware-Reihenfolge in app.js (BACK-02)

```javascript
// backend/app.js — Blaupause für Modularisierung
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

// Env-Var-Validierung beim Start
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FEHLER: Pflicht-Env-Var ${envVar} nicht gesetzt.`);
        process.exit(1);
    }
}

const app = express();

// 1. Security Headers — IMMER ERSTE MIDDLEWARE
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            scriptSrc: ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"],
            imgSrc: ["'self'", "data:", "blob:"]
        }
    }
}));

// 2. Kompression
app.use(compression());

// 3. Body-Parser (50MB für Bild-Uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 4. CORS
app.use(cors({
    origin: process.env.URL.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 5. Static Files
app.use('/api/icons', express.static(path.join(__dirname, 'icons')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/ttf', express.static(path.join(__dirname, 'ttf')));

// 6. API-Router
const apiRouter = require('./routes');
app.use('/api', apiRouter);

// 7. Frontend Static Serving
app.use(express.static(path.join(__dirname, '../frontend')));

module.exports = app;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `X-Powered-By: Express` Header | Helmet entfernt diesen Header automatisch | Helmet v3+ | Kein Fingerprinting des Servers |
| `RateLimit-*` Legacy-Header | RFC 9110 `RateLimit-*` Standard-Header | express-rate-limit v7+ | Standardisierte Client-Behandlung |
| express-validator v6 Chain-API | v7 Chain-API — `body('x').trim()` statt `check('x')` | express-validator v7 | Breaking Change: v6 Syntax nicht mehr verwenden |

**Deprecated/outdated:**
- `express-rate-limit` `headers: true` Option: Seit v7 durch `standardHeaders` und `legacyHeaders` ersetzt
- `express-validator` `check()` Funktion aus v6: In v7 durch `body()`, `param()`, `query()` ersetzt

---

## Bekannte Endpoint-Inventur (für SEC-08 Input-Validierung)

Alle Endpunkte mit User-Input — Priorität nach Risiko:

| Endpunkt | Typ | User-Input | Risiko | Priorität |
|----------|-----|-----------|--------|-----------|
| POST `/login` | Auth | usernameOrEmail, password | HIGH | 1 |
| POST `/request-password-reset` | Auth | email | HIGH | 1 |
| POST `/reset-password` | Auth | token, newPassword | HIGH | 1 |
| POST `/set-password` | Auth | token, newPassword | HIGH | 1 |
| POST `/request-email-verification` | Auth | email | MEDIUM | 2 |
| POST `/super-login` | Auth | superPassword | HIGH | 1 |
| POST `/admin/institution` | Admin | name | MEDIUM | 2 |
| POST `/admin/user` | Admin | institution_id, username, email, role | HIGH | 1 |
| PUT `/admin/users/:id` | Admin | username, email, role, password | HIGH | 1 |
| PUT `/users/change-password` | User | currentPassword, newPassword | HIGH | 1 |
| PUT `/user/change-email` | User | newEmail, password | HIGH | 1 |
| POST `/contact` | Public | name, email, message, inquiryType | MEDIUM | 2 |
| POST `/objekte` | Admin | titel, typ, strophen, ... | MEDIUM | 2 |
| PUT `/objekte/:id` | Admin | (wie POST) | MEDIUM | 2 |
| POST `/sessions` | User | name, data | LOW | 3 |
| POST `/vorlagen` | User | name, data | LOW | 3 |

---

## Spezifische Code-Stellen (mit Zeilennummern)

Für jeden Fix die exakten Stellen in server.js:

| Fix | Anforderung | Zeile(n) | Aktion |
|-----|-------------|---------|--------|
| Credential-Logging entfernen | SEC-03 | 17-22 | `console.log` Block löschen |
| Login-Debug-Log entfernen | SEC-03 | 350, 354 | `console.log('Login attempt:')` löschen |
| CORS Wildcard entfernen | SEC-04 | 40 | Fallback `['*', ...]` durch process.exit ersetzen |
| TLS rejectUnauthorized entfernen | SEC-05 | 1288-1291 | `tls:` Block aus createTransporter() löschen |
| Rate Limit /login | SEC-01 | 349 | loginLimiter als Middleware hinzufügen |
| Rate Limit /request-password-reset | SEC-01 | 226 | resetLimiter hinzufügen |
| Rate Limit /reset-password | SEC-01 | 331 | resetLimiter hinzufügen |
| Rate Limit /set-password | SEC-01 | 270 | resetLimiter hinzufügen |
| Rate Limit /request-email-verification | SEC-01 | 246 | verificationLimiter hinzufügen |
| Rate Limit /verify-email (POST) | SEC-01 | 879 | verificationLimiter hinzufügen |
| SQL-Injection SHOW TABLES | SEC-02 | 1235 | Whitelist-Validierung vor Query |
| SQL-Injection INFORMATION_SCHEMA | SEC-02 | 1252 | Whitelist-Validierung vor Query |
| SQL-Injection ALTER TABLE | SEC-02 | 1255 | Whitelist-Validierung vor Query |
| Passwort-Validierung /reset-password | SEC-06 | 331-345 | express-validator passwordValidation |
| Passwort-Validierung /set-password | SEC-06 | 270-285 | express-validator passwordValidation |
| Passwort-Validierung /change-password | SEC-06 | 763-806 | express-validator passwordValidation |

---

## Environment Availability

Step 2.6: Externe Abhängigkeiten beschränken sich auf npm-Packages — keine systemseitigen Tools nötig.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend | ✓ | 23-slim (Docker) | — |
| npm | Package install | ✓ | 10+ | — |
| helmet | SEC-07 | ✗ (not installed) | — | npm install |
| express-rate-limit | SEC-01 | ✗ (not installed) | — | npm install |
| express-validator | SEC-06, SEC-08 | ✗ (not installed) | — | npm install |
| MySQL | DB | ✓ | 9.0 (Docker Service) | — |

**Missing dependencies with no fallback:** Keine — alle per `npm install` lösbar.

**Missing dependencies with fallback:** Keine — die drei neuen Libraries sind die definierten Standards, keine Alternativen nötig.

---

## Validation Architecture

Hinweis: Kein Test-Framework vorhanden (package.json Zeile 9: `exit 1`). Für Phase 1 werden keine automatisierten Tests als Precondition gefordert — die CONCERNS.md benennt dies als Tech Debt. Manuelle Verifikation ist der realistische Ansatz.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Rate Limit blockiert nach 5 Versuchen | manual-only | — | ❌ kein Test-Framework |
| SEC-02 | SQL-Injection in DDL gefixt | manual-only | — | ❌ |
| SEC-03 | Kein Credential-Logging im Start-Output | smoke | `docker logs [container] \| grep -i password` | ❌ |
| SEC-04 | CORS ohne URL-Env-Var bricht Start | smoke | `URL="" node server.js` (erwartet: process.exit) | ❌ |
| SEC-05 | TLS-Validierung aktiv | manual-only | — | ❌ |
| SEC-06 | Kurzes Passwort wird abgelehnt | manual-only (curl) | `curl -X POST .../reset-password -d '{"token":"x","newPassword":"abc"}'` | ❌ |
| SEC-07 | Helmet-Header im Response | smoke | `curl -I https://hymnoscribe.de/api/verify-token` | ❌ |
| SEC-08 | Invalide Inputs geben 400 | manual-only (curl) | — | ❌ |
| BACK-01 | server.js aufgeteilt | code-review | `wc -l backend/server.js` (erwarte: <50) | ❌ |
| BACK-02 | Middleware-Reihenfolge erhalten | code-review | Diff alter vs. neuer app.js Middleware-Sequenz | ❌ |

### Wave 0 Gaps
- [ ] `backend/tests/` — Verzeichnis nicht vorhanden; kein Framework installiert
- [ ] Framework install: `npm install --save-dev jest supertest` — für Integration-Tests gegen Express-App

**Empfehlung:** Wave 0 der Phase legt explizit keine Tests an (zu hoher Aufwand für Phase 1). Verifikation läuft über curl-Smoke-Tests und Code-Review. Test-Infrastruktur ist für Phase 2 als separater BACK-03 aufzunehmen.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | ja | Rate Limiting (express-rate-limit), Passwort-Komplexität (express-validator) |
| V3 Session Management | teilweise | JWT 3h Lifetime — bleibt für Phase 1 unverändert (kein Refresh-Token in Scope) |
| V4 Access Control | ja (bereits implementiert) | checkRole() Middleware — kein Änderungsbedarf in Phase 1 |
| V5 Input Validation | ja | express-validator auf allen POST/PUT-Endpunkten |
| V6 Cryptography | ja (bereits korrekt) | bcrypt für Passwörter — saltRounds: 10; kein Hand-Roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Brute-Force Login | Tampering | express-rate-limit — 5/15min pro IP |
| SQL Injection (DDL) | Tampering | Whitelist-Validierung tableName |
| Credential Exposure (Logs) | Information Disclosure | console.log entfernen + Passwort rotieren |
| MITM auf SMTP | Information Disclosure | TLS rejectUnauthorized: true |
| Cross-Origin Request Forgery | Spoofing | CORS ohne Wildcard-Fallback |
| Weak Password | Tampering | Mindest-Komplexitätsregeln via express-validator |
| Missing Security Headers | Elevation of Privilege | helmet() — CSP, HSTS, X-Content-Type-Options |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `helmet()` vor `compression()` als erste Middleware | Architecture Patterns | Helm-Header bei komprimierten Responses falsch gesetzt — niedrig, da Header unabhängig von Kompression |
| A2 | `credentials: true` in CORS-Config schadet nicht bei JWT-only-Auth | Pattern 3 | Potenzielle CORS-Fehler wenn Frontend keine Cookies sendet und Server Credentials fordert — kann weggelassen werden |
| A3 | CSP muss CDN-URLs erlauben (jsdelivr, cdnjs, unpkg) | Code Examples | Helmet CSP blockiert pdf-lib/Quill/fontkit — kritisch, muss getestet werden |
| A4 | Test-Infrastruktur wird in Phase 1 nicht aufgebaut | Validation Architecture | Kein Regressions-Netz bei Refactoring — akzeptiertes Risiko |

---

## Open Questions

1. **CSP-Kompatibilität mit existierenden CDN-Abhängigkeiten**
   - Was wir wissen: helmet() setzt Default-CSP; App lädt pdf-lib/fontkit/Quill über 3 verschiedene CDNs
   - Was unklar: Welche CDN-Domains genau nötig (auch für Fonts, Bilder aus CDN?)
   - Empfehlung: Bei helmet-Installation zuerst CSP in Report-Only-Mode testen: `helmet.contentSecurityPolicy({ reportOnly: true })`; Browser-Konsole prüfen welche Domains blockiert werden

2. **Login-Debug-Logs auf Zeile 350/354**
   - Was wir wissen: `console.log('Login attempt:', req.body)` loggt Klartext-Passwort
   - Was unklar: Ob diese Logs bewusst für Debugging in Produktion belassen wurden
   - Empfehlung: Entfernen als Teil von SEC-03 (Credential-Logging)

3. **Passwort-Rotation — wer hat Zugriff auf Docker-Logs?**
   - Was wir wissen: DB-Passwort wurde seit Produktionsstart in Docker-Logs geschrieben
   - Was unklar: Ob Logs extern gespeichert oder weitergeleitet werden (Papertrail, Datadog etc.)
   - Empfehlung: In der Passwort-Rotations-Anleitung explizit fragen ob externe Log-Dienste konfiguriert sind

---

## Sources

### Primary (HIGH confidence)
- `backend/server.js` — direkter Codebase-Scan, alle Zeilennummern verifiziert
- `backend/package.json` — Dependencies und Versionen
- `.planning/codebase/CONCERNS.md` — dokumentierte Schwachstellen mit Zeilennummern
- npm registry (direkt abgefragt): helmet@8.1.0, express-rate-limit@8.3.2, express-validator@7.3.2 [VERIFIED]

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — vorab recherchierte Library-Empfehlungen
- `.planning/research/PITFALLS.md` — dokumentierte Pitfalls mit Codebase-Belegen
- `.planning/phases/01-security-backend/01-CONTEXT.md` — Phase-Entscheidungen

### Tertiary (LOW confidence)
- [ASSUMED: Middleware-Reihenfolge helmet vor compression] — best practice, nicht offiziell dokumentiert

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — Versionen direkt via npm verifiziert
- Security-Fix-Details: HIGH — Zeilennummern aus direkter Code-Inspektion
- Architecture (Modularisierung): MEDIUM — Standard Express-Muster, aber Refactoring-Risiken bleiben
- Pitfalls: HIGH — aus Codebase-Analyse und vorhandener PITFALLS.md belegt

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stabile Libraries; express-rate-limit und helmet werden selten breaking-changed)
