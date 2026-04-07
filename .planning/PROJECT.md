# HymnoScribe

## What This Is

HymnoScribe ist eine Multi-Tenant Web-App zum Erstellen von Liedblättern (Songsheets) als PDF. Gemeinden und Institutionen verwalten eigene Bibliotheken mit Liedern, Liturgien, Gebeten und Lesungen und kombinieren diese per Drag-and-Drop zu druckfertigen Liedblättern in verschiedenen Formaten (A5, A4, A3, DIN-Lang). Die App ist live unter hymnoscribe.de und wird bereits von Testern genutzt.

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

### Active

- [ ] Security-Härtung: Rate Limiting, SQL-Injection-Fixes, Credential-Logging entfernen, CORS absichern, TLS-Validierung, Passwort-Regeln
- [ ] WYSIWYG-Vorschau: Vorschau zeigt 1:1 das spätere PDF — eine einzige Layout-Engine für beides
- [ ] Live-Feinsteuerung: Abstände zwischen Objekten, zwischen Text und Noten per Drag-Regler einstellbar
- [ ] Freie Textformatierung: Über H1/H2/H3 hinaus — Schriftgröße, Stil frei wählbar
- [ ] Bildgrößen frei einstellbar: Notenbilder nicht mehr automatisch auf volle Seitenbreite skaliert
- [ ] Umbrüche innerhalb von Elementen: Strophen/Refrains können auf der nächsten Seite fortgesetzt werden
- [ ] Flexible Element-Reihenfolge: Refrain kann auch als erstes Element eines Liedes gesetzt werden
- [ ] Backend-Modularisierung: server.js in Routes, Controller, Middleware aufteilen

### Out of Scope

- Mobile App — Web-first, responsive reicht für v1
- OAuth/Social Login — E-Mail/Passwort funktioniert, Aufwand lohnt nicht jetzt
- Echtzeit-Kollaboration — Einzelnutzer-Editing reicht
- Audio/Video-Einbettung — Liedblätter sind Print-Produkte
- Automatische Lied-Datenbank — jede Institution baut eigene Bibliothek (Copyright)

## Context

- App ist live unter hymnoscribe.de, wird bereits von Testern genutzt
- Backend: Express.js (monolithischer server.js mit 1.463 Zeilen), MySQL 9.0, Docker
- Frontend: Vanilla JS (kein Framework), PDF-Generierung mit pdf-lib clientseitig
- Größtes Problem: PDF-Vorschau und PDF-Export sind zwei getrennte Systeme mit unterschiedlichen Konstanten — Vorschau stimmt nicht mit Export überein
- Kein einziger Test vorhanden
- Mehrere Security-Schwachstellen dokumentiert (SQL-Injection, fehlende Rate Limits, Credential-Logging)
- Codebase-Map unter `.planning/codebase/` mit detaillierter Analyse

## Constraints

- **Tech Stack**: Express.js Backend bleibt — Neuschreiben nicht gerechtfertigt
- **Frontend**: Vanilla JS bevorzugt — kein schweres Framework (React etc.) einführen
- **PDF-Library**: pdf-lib bleibt (clientseitig, gut genug) — aber eine einzige Rendering-Engine für Vorschau und PDF
- **Multi-Tenant**: Institution-Scoping muss in allen neuen Features berücksichtigt werden
- **Deployment**: Docker-basiert, muss weiterhin funktionieren
- **Nutzer**: Nicht-technisch — UI muss intuitiv bleiben, keine versteckten Power-Features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Weiterentwickeln statt Neuanfang | Architektur (Multi-Tenant, Datenmodell) ist solide, nur PDF-System und Security müssen modernisiert werden | — Pending |
| Eine Layout-Engine für Vorschau + PDF | Zwei getrennte Systeme (generatePDF.js + previewPageBreaks.js) mit divergierenden Konstanten sind die Wurzel des Trial-and-Error-Problems | — Pending |
| Vanilla JS beibehalten | Kein Framework-Overhead für eine App dieser Größe, Team-Vertrautheit | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-07 after initialization*
