---
phase: 04-intra-element-umbruche
plan: "01"
subsystem: layout-engine
tags: [split-logic, page-breaks, orphan-protection, engine]
dependency_graph:
  requires: []
  provides: [ELEM-03, split-capable-pushTextBlock]
  affects: [domRenderer.js, pdfRenderer.js]
tech_stack:
  added: []
  patterns: [iterative-while-loop-split, fitsCount-calculation, MIN_LINES_BEFORE_SPLIT-orphan-guard]
key_files:
  created: []
  modified:
    - frontend/js/layout/constants.js
    - frontend/js/layout/engine.js
decisions:
  - "While-Loop statt Rekursion fuer mehrstufige Splits (kein Stack-Overflow-Risiko)"
  - "MIN_LINES_BEFORE_SPLIT=2: weniger als 2 Zeilen auf einer Seite -> ganzer Block naechste Seite"
  - "isSplitContinuation-Flag kostenlos hinzugefuegt fuer spaetere visuelle Erweiterungen"
  - "Funktionssignatur pushTextBlock() unveraendert — alle Aufrufer bleiben unveraendert"
metrics:
  duration_minutes: 10
  completed_date: "2026-04-08T10:00:16Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 4 Plan 1: Split-faehige pushTextBlock() Summary

**One-liner:** Zeilenweiser Block-Split in engine.js mit While-Loop und Orphan-Schutz via MIN_LINES_BEFORE_SPLIT=2.

## Was implementiert wurde

`pushTextBlock()` in `engine.js` wurde von einer einfachen "ganzer Block auf naechste Seite"-Logik zu einer split-faehigen Funktion umgebaut. Strophen und Refrains werden nun zeilenweise aufgeteilt wenn sie die aktuelle Seite ueberschreiten — die Zeilen die noch passen bleiben auf der aktuellen Seite, der Rest setzt sich auf der naechsten Seite fort.

Zusaetzlich wurde `MIN_LINES_BEFORE_SPLIT: 2` in `constants.js` ergaenzt als Orphan-Schutz: Passen weniger als 2 Zeilen auf die aktuelle Seite, wird der gesamte Block auf die naechste Seite verschoben statt eine einzelne Zeile zu hinterlassen.

## Kritische Implementierungsdetails

### While-Loop-Ansatz (iterativ, nicht rekursiv)

```javascript
let remaining = lines;
let isFirstChunk = true;

while (remaining.length > 0) {
    const available = (pageSize.height - MARGINS.bottom) - currentY;
    const fitsCount = Math.floor(available / lineHeightPt);

    if (fitsCount < LAYOUT.MIN_LINES_BEFORE_SPLIT) {
        newPage();
        continue; // fitsCount auf neuer Seite neu berechnen
    }

    if (fitsCount >= remaining.length) {
        // Alles passt — kein Split noetig
        chunk = remaining; remaining = [];
        spacingAfter = extraSpacingAfter;
    } else {
        // Split: fitsCount Zeilen hierher, Rest naechste Seite
        chunk = remaining.slice(0, fitsCount);
        remaining = remaining.slice(fitsCount);
        spacingAfter = 0; // Seite voll, kein Platz fuer Abstand nach erstem Teil
    }
    // Block einfuegen...
    if (remaining.length > 0) newPage();
}
```

**Warum While-Loop:** Kein Stack-Overflow-Risiko bei sehr langen Strophen (mehr Zeilen als eine Seite fasst). Der Loop laeuft so oft wie noetig.

### MIN_LINES_BEFORE_SPLIT=2

Wert 2 ist typografischer Kompromiss:
- Zu niedrig (1): Einzelzeilen am Seitenende sehen schlecht aus (Orphan-Zeile)
- Zu hoch (3+): Unerwuenscht viel Leerraum am Seitenende wenn der Block nur 1-2 Zeilen groesser ist

### extraSpacingAfter bei Split

Erster Split-Teil erhaelt `spacingAfter = 0` (Seite ist voll, kein Platz fuer Abstand nach dem Element). Nur der letzte Teil erhaelt das originale `extraSpacingAfter`. Das verhindert Layout-Fehler wenn currentY nach dem letzten Chunk weitergefuehrt wird.

### isSplitContinuation-Flag

`isSplitContinuation: !isFirstChunk` wird in jeden Block eingefuegt. Aktuell keine visuelle Wirkung — kostenlos und ermoeglicht spaetere Erweiterungen (z.B. "Fortsetzung"-Indikator).

## Verifikationsergebnis

1. **Syntax-Check:** `node --check engine.js` — PASSED
2. **Konstante vorhanden:** `grep MIN_LINES_BEFORE_SPLIT constants.js` — gefunden (Zeile 54)
3. **Split-Logik vorhanden:** `grep fitsCount|remaining|slice engine.js` — Treffer in pushTextBlock() (Zeilen 202-253)
4. **Aufrufer unveraendert:** `grep pushTextBlock( engine.js` — Signatur unveraendert, Aufrufe Zeilen 370 und 430 identisch
5. **Renderer unveraendert:** `git diff domRenderer.js pdfRenderer.js` — keine Aenderungen

## Commits

| Task | Commit | Beschreibung |
|------|--------|--------------|
| Task 1 | `5a54c16` | feat(04-01): add MIN_LINES_BEFORE_SPLIT constant to LAYOUT |
| Task 2 | `33c5d47` | feat(04-01): implement split-capable pushTextBlock() in engine.js |

## Deviations from Plan

None — Plan exakt wie beschrieben ausgefuehrt.

## Known Stubs

None.

## Threat Flags

None — reine Layout-Engine-Aenderung, kein neuer Input-Pfad, keine API-Endpunkte, kein DOM-Schreibzugriff.

## Self-Check: PASSED

- `frontend/js/layout/constants.js` — FOUND, MIN_LINES_BEFORE_SPLIT: 2 vorhanden
- `frontend/js/layout/engine.js` — FOUND, fitsCount/remaining/isSplitContinuation vorhanden
- Commit `5a54c16` — FOUND
- Commit `33c5d47` — FOUND
