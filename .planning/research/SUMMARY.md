# Research Summary: HymnoScribe

**Synthesized:** 2026-04-07
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Executive Summary

HymnoScribe ist ein browserbasierter Print-Liedblatt-Editor für kirchliche Nicht-Techniker mit Multi-Tenant-Verwaltung. Das Kernproblem ist eindeutig: zwei divergierende Rendering-Systeme (`generatePDF.js` und `previewPageBreaks.js`) mit unterschiedlichen Layout-Konstanten machen WYSIWYG-Vorschau strukturell unmöglich (STROPHE_SPACING: 8 vs 6, DEFAULT_OBJECT_SPACING: 15 vs 12, COPYRIGHT_FONT_SIZE: 12 vs 10).

Die Lösung ist eine Architektur-Unifikation: eine einzige layout-agnostische Engine berechnet Positionen in PDF-Punkten (pt), zwei Renderer (DOM-Preview + pdf-lib-Export) konsumieren dasselbe Ergebnis.

## Stack

- **pdf-lib 1.17.1** (bestehend, CDN): bleibt — harter Constraint
- **Custom Layout Abstraction Layer** (neu, Vanilla JS): `layout/engine.js` + `layout/domRenderer.js` + `layout/pdfRenderer.js`
- **helmet@8.1.0 / express-rate-limit@8.3.2 / express-validator@7.3.2**: Security-Härtung Backend
- **interact.js@1.2.8**: Drag-Resize für Bilder (Hybrid mit Custom-Handler für 1D-Regler)

## Table Stakes

- Einheitliche Rendering-Engine (Blocker für alles)
- 1:1 WYSIWYG-Vorschau (direkte Folge der Engine)
- Freie Elementreihenfolge innerhalb Liedern (Refrain zuerst)
- Manuelle Seitenumbrüche
- Bildgrößen kontrollierbar

## Differentiators

- Spacing-Drag-Regler mit Live-Feedback (kein kirchliches Liedblatt-Tool bietet das)
- Freie Schriftgrößenwahl über H1/H2/H3 hinaus
- Format-Live-Switch zwischen A5/A4/A3/DIN-Lang

## Anti-Features (explizit ausschließen)

- Freie Positionierung (bricht Seitenumbruch-Logik)
- WYSIWYG-Inline-Editing im Preview (fragile Daten-Synchronisation)
- Tiefer Undo/Redo-Stack (Komplexität/Nutzen-Verhältnis)

## Architecture

**Build-Reihenfolge:**
1. `state.js` (Basis — State aus script.js extrahieren)
2. `layout/engine.js` (Kern — berechnet in pt, keine DOM/pdf-lib-Abhängigkeit)
3. `layout/pdfRenderer.js` + `layout/domRenderer.js` (parallel, beide konsumieren Engine-Output)
4. Backend-Modularisierung (unabhängig, parallel möglich)
5. Spacing-Controls UI (erst wenn State + Engine existieren)

**Kanonische Einheit:** pt (PDF-Punkte). DOM-Renderer konvertiert pt→px. Kein `getBoundingClientRect()` in Layout-Berechnung.

**Kritische Kopplung:** `window.lastCalculatedBreakPositions` (previewPageBreaks.js Zeile 78) muss eliminiert werden.

## Top Pitfalls

1. **Konstanten-Divergenz** — Entscheidungstabelle vor erstem Commit, einmalige `constants.js`
2. **Zwei-Koordinatensystem-Problem** — pt kanonisch, DOM konvertiert, kein DOM-Messen in Engine
3. **Security-Fixes ohne Dependency-Map** — Map als erstes Deliverable der Security-Phase
4. **Monolith-Refactoring bricht Middleware-Reihenfolge** — Reihenfolge dokumentieren vor Extraktion
5. **Credential-Logging ist kein isolierter Fix** — Logging entfernen + Passwort rotieren + alte Logs löschen

## Suggested Phase Structure

| # | Phase | Abhängig von | Parallel möglich mit |
|---|-------|-------------|---------------------|
| 1 | Security Hardening + Backend-Modularisierung | — | Phase 2 |
| 2 | Unified Layout Engine + WYSIWYG-Vorschau | — | Phase 1 |
| 3 | WYSIWYG Controls (Spacing, Bildgrößen, Schrift) | Phase 2 | Phase 4 |
| 4 | Element Reordering (Refrain-Position) | — | Phase 3 |
| 5 | Intra-Element Page Breaks (v2) | Phase 2 | — |

## Research Gaps

- Texthöhen-Berechnung für Quill-Inline-Formate: empirische Verifikation in Phase 2
- interact.js Wartungsstatus: Fallback-Plan (Custom-Handler) bereithalten
- Quill-Delta/HTML-Format: muss in Phase 2 als erster Schritt kartiert werden

## Confidence

| Area | Level |
|------|-------|
| Stack | MEDIUM |
| Features | HIGH |
| Architecture | HIGH |
| Pitfalls | HIGH |
| **Overall** | **HIGH** |

---
*Research synthesized: 2026-04-07*
