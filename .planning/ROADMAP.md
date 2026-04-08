# Roadmap: HymnoScribe

## Overview

HymnoScribe wird in vier Phasen modernisiert: Zuerst werden kritische Sicherheitslucken geschlossen und das Backend strukturiert, dann eine einheitliche Layout-Engine gebaut, die Vorschau und PDF-Export erstmals identisch macht. Darauf aufbauend kommen WYSIWYG-Controls und flexible Element-Reihenfolge. Abschliessend werden Umbruche innerhalb von Elementen ermoglicht — die komplexeste Anforderung, die auf einer stabilen Engine aufbaut.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Security & Backend** - Sicherheitslucken schliessen, server.js modularisieren
- [ ] **Phase 2: Unified Layout Engine** - Eine einzige Layout-Engine fur Vorschau und PDF-Export
- [ ] **Phase 3: WYSIWYG Controls & Element-Reihenfolge** - Feinsteuerung und flexible Lied-Struktur
- [ ] **Phase 4: Intra-Element-Umbruche** - Strophen und Refrains uber Seiten fortsetzen

## Phase Details

### Phase 1: Security & Backend
**Goal**: Die App ist gegen bekannte Angriffsvektoren gehartet und das Backend ist wartbar strukturiert
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, BACK-01, BACK-02
**Success Criteria** (what must be TRUE):
  1. Login- und Password-Reset-Endpoints blockieren Brute-Force-Versuche nach 5 Fehlversuchen
  2. Das DB-Passwort erscheint nicht mehr in Server-Logs beim Start
  3. Anfragen von nicht-autorisierten Origins werden vom Server abgelehnt
  4. Ein neues Passwort wird nur akzeptiert, wenn es mindestens 8 Zeichen und Komplexitatsregeln erfullt
  5. server.js ist aufgeteilt — Routes, Controller und Middleware liegen in eigenen Dateien
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md — Libraries installieren + app.js Grundgerüst mit Middleware-Reihenfolge (SEC-04, BACK-02)
- [x] 01-02-PLAN.md — Hotfixes in server.js: Credential-Logging, TLS, SQL-Injection (SEC-02, SEC-03, SEC-05)
- [x] 01-03-PLAN.md — Middleware-Module: Auth, Rate Limiter, Validierungsketten (SEC-01, SEC-06, SEC-07, SEC-08)
- [x] 01-04-PLAN.md — Services: db/pool.js, emailService.js, imageCleanupService.js (BACK-01)
- [x] 01-05-PLAN.md — Routes extrahieren + server.js als Bootstrapper + Checkpoint (BACK-01, SEC-01, SEC-06, SEC-08)
**UI hint**: no

### Phase 2: Unified Layout Engine
**Goal**: Vorschau und PDF-Export nutzen dieselbe Layout-Engine und liefern pixelgenaue Ergebnisse
**Depends on**: Phase 1
**Requirements**: LYOT-01, LYOT-02, LYOT-03, LYOT-04, LYOT-05, LYOT-06
**Success Criteria** (what must be TRUE):
  1. Was in der Vorschau zu sehen ist, erscheint im exportierten PDF identisch (kein Trial-and-Error mehr)
  2. Seitenumbruche in Vorschau und PDF liegen an denselben Stellen
  3. Es existiert eine einzige constants.js — divergierende Konstanten (STROPHE_SPACING, DEFAULT_OBJECT_SPACING etc.) sind zusammengefuhrt
  4. window.lastCalculatedBreakPositions wird nicht mehr als globale Variable genutzt
**Plans**: 4 plans
Plans:
- [ ] 02-01-PLAN.md — constants.js + fontManager.js: Foundation mit Konstanten und Font-Abstraktion (LYOT-05)
- [ ] 02-02-PLAN.md — engine.js: calculateLayout() als pure Funktion (LYOT-01)
- [ ] 02-03-PLAN.md — pdfRenderer.js + domRenderer.js: Zwei Renderer auf einem LayoutResult (LYOT-02, LYOT-03)
- [ ] 02-04-PLAN.md — Integration: generatePDF.js + previewPageBreaks.js als Thin-Wrapper + Checkpoint (LYOT-04, LYOT-06)
**UI hint**: yes

### Phase 3: WYSIWYG Controls & Element-Reihenfolge
**Goal**: Nutzer konnen Abstande, Bildgroessen und Schriftgroessen direkt im Editor steuern und Lied-Elemente frei anordnen
**Depends on**: Phase 2
**Requirements**: WYSI-01, WYSI-02, WYSI-03, WYSI-04, WYSI-05, ELEM-01, ELEM-02
**Success Criteria** (what must be TRUE):
  1. Notenbilder konnen per Drag-Handle in der Breite angepasst werden (nicht mehr immer volle Seitenbreite)
  2. Abstande zwischen Elementen konnen per Drag-Regler live verandert werden — die Vorschau aktualisiert sich sofort
  3. Schriftgrosse kann frei gewahlt werden (nicht mehr nur H1/H2/H3)
  4. Das Format (A5/A4/A3/DIN-Lang) kann gewechselt werden und die Vorschau baut sich sofort neu auf
  5. Ein Refrain kann als erstes Element eines Liedes gesetzt und die Reihenfolge aller Elemente verandert werden
**Plans**: TBD
**UI hint**: yes

### Phase 4: Intra-Element-Umbruche
**Goal**: Strophen und Refrains konnen uber Seitengrenzen fortgesetzt werden, ohne manuellen Workaround
**Depends on**: Phase 2
**Requirements**: ELEM-03
**Success Criteria** (what must be TRUE):
  1. Eine Strophe, die nicht mehr auf die aktuelle Seite passt, wird automatisch auf der nachsten Seite fortgesetzt
  2. Der Seitenumbruch innerhalb einer Strophe ist in der Vorschau sichtbar und stimmt mit dem PDF uberein
  3. Manuell gesetzte Umbruche innerhalb eines Elements bleiben beim PDF-Export erhalten
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Backend | 0/5 | Not started | - |
| 2. Unified Layout Engine | 0/4 | Not started | - |
| 3. WYSIWYG Controls & Element-Reihenfolge | 0/? | Not started | - |
| 4. Intra-Element-Umbruche | 0/? | Not started | - |
