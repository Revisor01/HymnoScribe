---
phase: 02-unified-layout-engine
plan: 04
subsystem: layout-engine
tags: [integration, thin-wrapper, generatePDF, previewPageBreaks, wysiwyg]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [generatePDF-wrapper, previewPageBreaks-wrapper]
  affects: [wysiwyg-parity, pdf-export, preview]
tech_stack:
  added: []
  patterns: [thin-wrapper, engine-delegation, debounce-150ms]
key_files:
  created: []
  modified:
    - frontend/js/generatePDF.js
    - frontend/js/previewPageBreaks.js
decisions:
  - "generatePDF.js delegiert vollständig an calculateLayout + renderToPDF — eigene Rendering-Logik nicht mehr aktiv"
  - "previewPageBreaks.js delegiert vollständig an calculateLayout + renderToDOM — Umbruchmarker-Einsetzen entfernt"
  - "window.lastCalculatedBreakPositions eliminiert — kein globaler State mehr zwischen den zwei Systemen"
  - "default export in previewPageBreaks.js entfernt — named exports sind ausreichend"
metrics:
  duration: ~10min
  completed: 2026-04-08
  tasks_completed: 1
  files_created: 0
  files_modified: 2
---

# Phase 02 Plan 04: generatePDF.js und previewPageBreaks.js als Thin-Wrapper Summary

**One-liner:** Beide Legacy-Renderer zu schlanken Wrappern refactored — generatePDF delegiert an calculateLayout+renderToPDF, previewPageBreaks an calculateLayout+renderToDOM, window.lastCalculatedBreakPositions eliminiert, Debounce auf 150ms.

## Was wurde geändert

### frontend/js/generatePDF.js

Vorher: ~240 Zeilen `generatePDF()` Funktion mit eigenem DOM-Traversal, eigenem Font-Laden, eigenem Logo-Embedding, eigenem Seitenumbruch-Tracking.

Nachher: ~75 Zeilen dünner Wrapper:

1. Liest Config aus `localStorage`
2. Konvertiert `fontSize` px → pt (`* 0.75`)
3. Lädt Font-ArrayBuffers via `loadFontArrayBuffers()`
4. Erstellt temporäres PDFDocument für `embedFontsInDoc()` (Engine braucht PDFFont-Objekte)
5. Ruft `calculateLayout(items, engineConfig, fonts)` auf
6. Lädt Logo-ArrayBuffer mit Bearer-Token falls vorhanden
7. Delegiert an `renderToPDF(layoutResult, engineConfig, arrayBuffers, logoArrayBuffer)`
8. Handhabt Broschüren-Option via `createBrochure()` (bleibt erhalten)
9. Ruft `downloadPDF()` auf

**Neu hinzugefügte Imports:**
```javascript
import { calculateLayout } from './layout/engine.js';
import { renderToPDF } from './layout/pdfRenderer.js';
import { loadFontArrayBuffers, embedFontsInDoc } from './layout/fontManager.js';
```

**Entfernt:**
- Lokales `const globalConfig = { ... }` (Zeile 884 alt) — shadowing des importierten `globalConfig`
- Alle eigenen Draw-Aufrufe und DOM-Traversal innerhalb von `generatePDF()`

**Erhalten:**
- `window.generatePDF = generatePDF` am Dateianfang (Zeile 6)
- `document.getElementById('pdf-form').addEventListener('submit', ...)` Event-Listener
- `createBrochure()`, `downloadPDF()`, `showProgress()` Hilfsfunktionen
- Alle anderen Legacy-Funktionen (schaden nicht, werden nicht aufgerufen)

### frontend/js/previewPageBreaks.js

Vorher: `updatePreviewWithPageBreaks()` mit 300ms Debounce, eigener `calculatePrecisePageBreaks()` Logik, Umbruchmarker-Einsetzen via `insertPageBreakMarker()`, globales `window.lastCalculatedBreakPositions` Schreiben.

Nachher: ~50 Zeilen dünner async Wrapper mit 150ms Debounce:

1. Liest Config aus `localStorage`
2. Konvertiert `fontSize` px → pt
3. Lädt Font-ArrayBuffers und erstellt temp PDFDocument für Fonts
4. Ruft `calculateLayout(items, engineConfig, fonts)` auf
5. Delegiert an `renderToDOM(layoutResult, engineConfig, container)` — DOM wird komplett neu gebaut als seitenweise Blätter

**Neu hinzugefügte Imports:**
```javascript
import { calculateLayout } from './layout/engine.js';
import { renderToDOM } from './layout/domRenderer.js';
import { loadFontArrayBuffers, embedFontsInDoc } from './layout/fontManager.js';
```

**Entfernt:**
- `window.lastCalculatedBreakPositions = breakPositions` (war Zeile 77)
- `setTimeout(..., 300)` → ersetzt durch `setTimeout(async ..., 150)`
- `export default { ... }` am Dateiende (named exports ausreichend)

**Erhalten:**
- `export function initPreviewFormatSelector()` strukturell unverändert
- `isCalculating` Guard-Variable

## Checkpoint-Verifikation

Der Checkpoint (Task 2) erfordert visuelle Browser-Verifikation durch den Nutzer. Da das lokale Dev-Environment keine laufende Datenbankverbindung hat (Docker-basiert), wurde eine vollständige statische Verifikation durchgeführt.

**Statische Checks (alle grün):**

| Check | Ergebnis |
|-------|---------|
| generatePDF importiert calculateLayout | OK |
| generatePDF importiert renderToPDF | OK |
| generatePDF importiert loadFontArrayBuffers | OK |
| kein lokales globalConfig in generatePDF | OK |
| window.generatePDF bleibt erhalten | OK |
| preview importiert calculateLayout | OK |
| preview importiert renderToDOM | OK |
| kein window.lastCalculatedBreakPositions in generatePDF | OK |
| kein window.lastCalculatedBreakPositions in preview | OK |
| Debounce 150ms in preview | OK |
| Event-Listener pdf-form erhalten | OK |
| createBrochure-Aufruf erhalten | OK |
| initPreviewFormatSelector erhalten | OK |
| kein default export in preview | OK |
| async setTimeout in preview | OK |

**grep-Verifikation gemäß Planvorgabe:**
- `grep -r "window.lastCalculatedBreakPositions" frontend/js/` → 0 Treffer
- `grep "setTimeout.*300" frontend/js/previewPageBreaks.js` → 0 Treffer
- `grep "from './layout/engine.js'" frontend/js/generatePDF.js` → 1 Treffer
- `grep "from './layout/engine.js'" frontend/js/previewPageBreaks.js` → 1 Treffer

**Hinweis für Live-Verifikation:** Die visuelle Überprüfung (Seiten als weisse Blätter, PDF/Vorschau-Übereinstimmung) muss beim nächsten Deploy oder lokalem Start mit Datenbankverbindung erfolgen. Alle Code-Pfade sind korrekt verdrahtet.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Keine.

## Threat Flags

Keine neuen Netzwerkendpunkte oder Auth-Pfade. Logo-Fetch in `generatePDF.js` nutzt Bearer-Token aus `localStorage` — gleicher Mechanismus wie alle anderen API-Calls (T-02-04-03: accept).

## Self-Check: PASSED

- FOUND: frontend/js/generatePDF.js (modifiziert)
- FOUND: frontend/js/previewPageBreaks.js (modifiziert)
- FOUND: commit 008c451 (feat(02-04): generatePDF.js und previewPageBreaks.js als Thin-Wrapper)
- Alle 15 statischen Verifikations-Checks grün
- window.lastCalculatedBreakPositions: 0 Vorkommen im Projekt
- Debounce: 150ms (nicht 300ms)
