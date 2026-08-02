# Stack Research

**Domain:** WYSIWYG Songsheet/PDF Editor (Brownfield, Unified Layout Engine + Security Hardening)
**Researched:** 2026-04-07
**Confidence:** MEDIUM — Core approach (custom layout abstraction) based on verified constraints; library versions verified via npm; VMPrint LOW confidence (niche library, 544 stars, keine Community-Bewertungen auffindbar)

---

## Empfohlener Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pdf-lib | 1.17.1 (bereits vorhanden) | PDF-Generierung clientseitig | Constraint: bleibt gesetzt. Stabil, browserkompatibel, kein Server nötig. |
| Canvas API (nativ) | Browser-nativ | WYSIWYG-Preview-Rendering | Kein zusätzliches Bundle nötig; deterministische Pixel-Ausgabe wie PDF. Canvas und pdf-lib teilen dasselbe Koordinatenmodell (Punkte/pt), was Konvergenz der Layout-Engine erleichtert. |
| Custom Layout Abstraction Layer | — (selbst zu bauen) | Gemeinsamer Renderer für Canvas + pdf-lib | Einziger Ansatz, der "pdf-lib bleibt" + "eine Engine" vereint. Renderer erhält Draw-Commands (DrawText, DrawImage, DrawRect), zwei Backends führen sie aus: CanvasBackend (Preview) + PdfLibBackend (Export). |

**Begründung für "Custom Layout Abstraction" statt VMPrint:**

VMPrint (cosmiciron/vmprint, v1.1.0) löst dasselbe Problem konzeptionell richtig, ist aber inkompatibel mit dem Constraint "pdf-lib bleibt": Es ist ein vollständiges Ersatz-System mit eigenem AST-Document-Modell und eigener PDF-Ausgabe — keine Integration in bestehende Codebasen möglich. Der Migrationsaufwand wäre vergleichbar mit einem Neuschreiben des gesamten Rendering-Pfads. Außerdem: 544 Stars, Version 1.1.0, keine bekannten Production-Deployments — zu wenig Evidenz für eine kritische Abhängigkeit.

---

### Supporting Libraries — Security Hardening

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| helmet | 8.1.0 | HTTP Security Headers (CSP, HSTS, X-Content-Type-Options, etc.) | Immer — als erste Middleware in Express einbinden. Setzt ~14 Security-Header automatisch korrekt. |
| express-rate-limit | 8.3.2 | IP-basiertes Rate Limiting | Auth-Endpoints (Login, Passwort-Reset): max 5 req/15 min. Allgemeine API: großzügiger (z.B. 100/min). |
| express-validator | 7.3.2 | Input-Validierung und -Sanitisierung | Alle POST/PUT-Routen mit User-Input. Löst die dokumentierten SQL-Injection-Lücken auf Eingabeebene (zusätzlich zu Parameterized Queries). |
| zod | 4.3.6 | Schema-Validierung (TypeScript-freundlich) | Alternativ zu express-validator, wenn Schemas auch im Frontend wiederverwendet werden sollen. Für dieses Projekt: express-validator reicht (kein TypeScript im Backend). |

**Confidence:** HIGH — alle Versionen über npm verifiziert, alle Packages sind aktiv gepflegt (express-rate-limit 8.3.2 wurde am 31. März 2026 veröffentlicht).

---

### Supporting Libraries — Drag & Resize (Frontend)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| interact.js | 1.2.8 | Drag-Resize-Handles für Layout-Elemente | Wenn Vanilla JS bleibt und mehrere Elemente resizable sein sollen (Abstands-Regler, Bilder). Unterstützt snap-to-grid, inertia, multi-touch. Standalone, kein jQuery. |
| Eigene Implementation (mousedown/mousemove/mouseup) | — | Einfache 1D-Resize-Handles (z.B. Abstands-Regler) | Wenn nur vertikale Drag-Regler für Abstände (keine freie Resize-Box) gebraucht werden — spart ~25 KB Bundle. Kann parallel zu interact.js für Bildgrößen existieren. |

**Empfehlung:** Hybridansatz — interact.js für Bild-Resize (2D, komplex), Custom-Handler für 1D-Abstandsregler (einfach, kein Overhead).

**Confidence:** MEDIUM — interact.js ist etabliert (GitHub: taye/interact.js), aber letzter Release 1.2.8 ist von 2022; aktive Wartung ungewiss. Für Vanilla JS ohne Framework-Anforderungen ist es trotzdem die beste verfügbare Option.

---

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Keine Änderungen | — | Docker-Workflow (node:23-slim) bleibt unverändert. Kein Build-Tool nötig, da kein TypeScript/Bundler. |

---

## Installation

```bash
# Security Hardening (Backend)
npm install helmet express-rate-limit express-validator

# Drag & Resize (Frontend, optional als npm-Paket oder CDN)
# Entweder:
npm install interactjs
# Oder via CDN in HTML: https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js
```

**Hinweis:** pdf-lib und fontkit werden bereits über CDN geladen — keine Änderung nötig.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom Layout Abstraction Layer | VMPrint (@vmprint/engine 1.1.0) | Wenn pdf-lib kein Constraint wäre und ein Greenfield-Projekt gestartet würde. VMPrint löst das Problem architektonisch sauber, erfordert aber vollständige Migration des Rendering-Stacks. |
| Custom Layout Abstraction Layer | Paged.js | Wenn das Layout ausschließlich über HTML/CSS + CSS Paged Media Spec definiert werden soll. Nicht geeignet: erfordert Headless-Browser (Puppeteer) für PDF-Export — bricht clientseitige Anforderung. |
| Custom Layout Abstraction Layer | html2canvas + jsPDF | Klassischer Ansatz, aber notorisch unpräzise — Schriften, Abstände und Zeilenumbrüche weichen zwischen Canvas-Screenshot und PDF ab. Löst das Kernproblem nicht. |
| express-rate-limit | rate-limiter-flexible | Wenn Redis-Backend für Rate Limiting über mehrere Instanzen hinweg benötigt wird. Für Single-Instance-Deployment reicht express-rate-limit. |
| express-validator | zod | Wenn TypeScript im Backend eingeführt wird oder Schemas zwischen Frontend und Backend geteilt werden sollen. |
| interact.js | moveable (daybrush/moveable) | Wenn Rotate-Handles oder SVG-Element-Manipulation gebraucht wird. Für diesen Use Case Overkill. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| html2canvas + jsPDF | Screenshot-basierter Ansatz — Schrift-Rendering-Abweichungen zwischen Canvas und PDF unvermeidlich. Löst das Trial-and-Error-Problem nicht, ersetzt es durch andere Abweichungen. | Custom Layout Abstraction Layer mit pdf-lib |
| Quill.js für Layout-Steuerung | Quill ist ein Rich-Text-Editor, kein Layout-System. Bereits im Projekt für Text-Editing vorhanden — nicht für Seitenlayout-Logik erweitern. | Separates Layout-System mit Draw-Commands |
| VMPrint in Brownfield-Projekt mit pdf-lib | Erfordert vollständigen Austausch des Rendering-Stacks; kein Integrationspfad mit bestehenden pdf-lib-Calls. Unreifes Ökosystem (v1.1.0, keine bekannten Production-Deployments). | Custom Layout Abstraction Layer |
| CORS-Wildcard (`origin: '*'`) | Aktuell dokumentierte Schwachstelle — erlaubt Cross-Site-Requests von beliebigen Origins. | `cors({ origin: process.env.URL })` mit expliziter Whitelist |
| Credential-Logging (console.log mit Passwörtern/Tokens) | Dokumentierte Schwachstelle in bestehendem server.js — Credentials landen in Docker-Logs. | Logging-Middleware (morgan) mit redaktion, oder manuell entfernen. |

---

## Layout Engine Architektur-Pattern (konkret)

Das ist die empfohlene Umsetzung der "unified layout engine":

**Schicht 1: Layout-Berechnung (layout-engine.js)**
- Nimmt Liedblatt-Daten entgegen, berechnet Positionen aller Elemente (Texte, Bilder, Seitenumbrüche) in pt
- Gibt eine flache Liste von Draw-Commands zurück: `{ type: 'text', x, y, text, font, size }`, `{ type: 'image', x, y, w, h, src }`, etc.
- Kein Rendering-Code hier — nur Geometrie-Berechnung

**Schicht 2: Rendering-Backends**
- `CanvasRenderer.js` — nimmt Draw-Commands, zeichnet auf `<canvas>` für Preview
- `PdfLibRenderer.js` — nimmt dieselben Draw-Commands, schreibt in pdf-lib PDFDocument

**Warum pt als gemeinsame Einheit:** pdf-lib arbeitet nativ in pt (1 pt = 1/72 inch). Canvas arbeitet in CSS-Pixeln — Konversionsfaktor: `px = pt * (96/72) = pt * 1.333`. Dieser Faktor wird einmalig im CanvasRenderer angewendet. Layout-Berechnung erfolgt immer in pt.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| helmet@8.1.0 | express@4.x, Node 18+ | Kompatibel mit bestehendem Express 4.18.2 |
| express-rate-limit@8.3.2 | express@4.x und 5.x | Kompatibel mit bestehendem Express 4.18.2 |
| express-validator@7.3.2 | express@4.x | Kompatibel; v7 brachte Breaking Changes zu v6 (chain API geändert) |
| interactjs@1.2.8 | Modern browsers (kein IE-Bedarf) | Vanilla JS, keine Framework-Abhängigkeit |
| pdf-lib@1.17.1 (bestehend) | fontkit@1.1.1 (bestehend) | Keine Änderung; bleibt über CDN geladen |

---

## Sources

- npm registry (direkt abgefragt) — helmet@8.1.0, express-rate-limit@8.3.2, express-validator@7.3.2, zod@4.3.6, interactjs@1.2.8, @vmprint/engine@1.1.0 (HIGH confidence)
- [VMPrint GitHub Repository](https://github.com/cosmiciron/vmprint) — Architektur, Integrationsmöglichkeiten, Limitierungen (LOW confidence — nisches Projekt)
- [Express Rate Limit npm](https://www.npmjs.com/package/express-rate-limit) — Versionsgeschichte, Downloads (HIGH confidence)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html) — offizielle Express.js Docs (HIGH confidence)
- [interact.js](https://interactjs.io/) — Feature-Set und Browser-Kompatibilität (MEDIUM confidence — letzter Release 2022)
- [Corgea: Express Security Best Practices 2025](https://corgea.com/learn/express-js-security-best-practices-2025/) — Middleware-Reihenfolge, Library-Empfehlungen (MEDIUM confidence)

---

*Stack research for: HymnoScribe — Unified WYSIWYG Preview + PDF Export + Security Hardening*
*Researched: 2026-04-07*
