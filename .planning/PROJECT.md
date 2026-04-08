# HymnoScribe

## What This Is

HymnoScribe ist eine Multi-Tenant Web-App zum Erstellen von Liedblättern (Songsheets) als PDF. Gemeinden und Institutionen verwalten eigene Bibliotheken mit Liedern, Liturgien, Gebeten und Lesungen und kombinieren diese per Drag-and-Drop zu druckfertigen Liedblättern in verschiedenen Formaten (A5, A4, A3, DIN-Lang). Die App ist live unter app.hymnoscribe.de. Das Backend ist modular strukturiert (Routes, Controller, Middleware, Services), die Vorschau ist eine seitenweise WYSIWYG-Darstellung die 1:1 dem PDF-Export entspricht.

## Core Value

Ein Liedblatt zusammenstellen und sofort sehen, wie es gedruckt aussieht — ohne Trial-and-Error.

## Requirements

### Validated

- ✓ Multi-Tenant-Architektur mit Institution-Scoping — existing
- ✓ JWT-basierte Authentifizierung mit Rollen (super-admin, admin, user) — existing
- ✓ Bibliothek-Verwaltung: Lieder, Liturgien, Gebete, Lesungen (CRUD) — existing
- ✓ Drag-and-Drop-Zusammenstellung von Liedblättern — existing
- ✓ PDF-Export in A5, A4, A3, DIN-Lang — existing
- ✓ Sessions: Entwürfe speichern und laden — existing
- ✓ Vorlagen: Wiederverwendbare Liedblatt-Konfigurationen — existing
- ✓ Notenbilder hochladen und in Liedblätter einbinden — existing
- ✓ Passwort-Reset per E-Mail — existing
- ✓ E-Mail-Verifizierung — existing
- ✓ Kontaktformular — existing
- ✓ Institutions-Logos auf Liedblättern — existing
- ✓ Docker-basiertes Deployment — existing
- ✓ Datenbank-Migrations-System — existing
- ✓ Security-Härtung (Rate Limiting, SQL-Injection-Fix, CORS, Helmet, Passwort-Regeln, Input-Validierung) — v1.0
- ✓ Backend-Modularisierung (server.js → Routes, Controller, Middleware, Services) — v1.0
- ✓ WYSIWYG-Vorschau mit einheitlicher Layout-Engine (Vorschau = PDF) — v1.0
- ✓ Live-Feinsteuerung (Drag-Regler für Abstände, Bildgrößen) — v1.0
- ✓ Freie Schriftgrößenwahl (Presets + per-Element Override) — v1.0
- ✓ Flexible Element-Reihenfolge (SortableJS, Refrain duplizierbar, Strophenauswahl) — v1.0
- ✓ Intra-Element-Umbrüche (Strophen splitten über Seitengrenzen) — v1.0

### Active

(None — v1.0 shipped. Define next milestone with `/gsd-new-milestone`)

### Out of Scope

- Mobile App — Web-first, responsive reicht
- OAuth/Social Login — E-Mail/Passwort funktioniert
- Echtzeit-Kollaboration — Einzelnutzer-Editing reicht
- Audio/Video-Einbettung — Liedblätter sind Print-Produkte
- Automatische Lied-Datenbank — jede Institution baut eigene Bibliothek (Copyright)

## Context

- App live unter app.hymnoscribe.de (beta Tag auf Loading-Optimization Branch)
- Backend: Express.js modular (server.js 35 Zeilen Bootstrapper), MySQL 8.0, Docker
- Frontend: Vanilla JS mit ES6 Modulen, pdf-lib clientseitig
- Layout-Engine: `frontend/js/layout/` — engine.js, constants.js, fontManager.js, domRenderer.js, pdfRenderer.js, overrideState.js
- SortableJS für Element-Reihenfolge, Custom Pointer-Events für Drag-Handles
- Session-Format v1 mit Override-Persistenz (backward-compatible)
- Keine Tests vorhanden (Testinfrastruktur wäre ein guter v1.1 Kandidat)
- Dependabot meldet 31 Vulnerabilities auf master (19 high) — separate Aufgabe

## Constraints

- **Tech Stack**: Express.js Backend bleibt
- **Frontend**: Vanilla JS bevorzugt — kein Framework
- **PDF-Library**: pdf-lib bleibt, eine Layout-Engine für Vorschau und PDF
- **Multi-Tenant**: Institution-Scoping in allen Features
- **Deployment**: Docker-basiert
- **Nutzer**: Nicht-technisch — UI muss intuitiv bleiben

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Weiterentwickeln statt Neuanfang | Architektur (Multi-Tenant, Datenmodell) ist solide | ✓ Good — v1.0 shipped |
| Eine Layout-Engine für Vorschau + PDF | Zwei getrennte Systeme waren die Wurzel des Trial-and-Error-Problems | ✓ Good — engine.js + zwei Renderer |
| Vanilla JS beibehalten | Kein Framework-Overhead, Team-Vertrautheit | ✓ Good — ES6 Module reichen |
| pt als kanonische Einheit | pdf-lib arbeitet nativ in pt, DOM konvertiert pt→px | ✓ Good — keine Divergenz |
| Inline-Refactoring statt parallele Dateien | Keine Code-Duplikation, direkter Umbau | ✓ Good — sauber umgesetzt |
| PDF-Werte gewinnen bei Konstantendivergenz | Das gedruckte Ergebnis ist das Maß | ✓ Good — Vorschau passt sich an |
| SortableJS für Element-Reihenfolge | Leichtgewichtig, gut gepflegt, CDN-verfügbar | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after v1.0 milestone*
