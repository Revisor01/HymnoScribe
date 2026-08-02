---
phase: 02-unified-layout-engine
plan: 03
subsystem: layout-engine
tags: [pdf-renderer, dom-renderer, layout-result, rendering, preview]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [pdfRenderer.js, domRenderer.js]
  affects: [02-04-integration]
tech_stack:
  added: []
  patterns: [separation-of-concerns, pure-module, y-coordinate-inversion, xss-safe-rendering]
key_files:
  created:
    - frontend/js/layout/pdfRenderer.js
    - frontend/js/layout/domRenderer.js
  modified: []
decisions:
  - "doc als Parameter an _drawImageBlock übergeben (nicht page.doc) — pdf-lib 1.17.1 hat kein page.doc Property"
  - "widthOfTextAtSize ist synchron in pdf-lib 1.17.1 — kein await nötig (unterschied zu Plan-Code)"
  - "Jede Textzeile als eigenes div-Element mit expliziter Zeilenhöhe — exakte Übereinstimmung mit Engine-Berechnung"
metrics:
  duration: ~10min
  completed: 2026-04-08
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 02 Plan 03: pdfRenderer.js und domRenderer.js Summary

**One-liner:** Zwei eigenständige Renderer die denselben LayoutResult konsumieren — pdfRenderer zeichnet via pdf-lib auf PDFDocument-Seiten, domRenderer rendert seitenweise weisse Blatt-Divs im Container.

## Was wurde erstellt

### frontend/js/layout/pdfRenderer.js

Neues Modul — zeichnet LayoutResult auf pdf-lib PDFDocument-Seiten.

**Export:**

#### `renderToPDF(layoutResult, config, arrayBuffers, logoArrayBuffer) → Promise<PDFDocument>`

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `layoutResult` | `Object` | Ausgabe von `engine.calculateLayout()` |
| `config` | `Object` | `{ format, fontFamily, lineHeight, textAlign }` |
| `arrayBuffers` | `Object` | `{ regular, bold, italic, bolditalic }` — Font-ArrayBuffers aus fontManager |
| `logoArrayBuffer` | `ArrayBuffer\|null` | Logo-Bild als ArrayBuffer (optional) |

**Interne Struktur:**
- `_drawBlock(page, doc, block, ...)` — Dispatcher je nach `block.type`
- `_drawTextBlock(page, engineX, engineY, ...)` — Textzeilen mit Y-Inversion
- `_drawImageBlock(page, doc, ...)` — Bild-Fetch mit Bearer-Token, `doc` als expliziter Parameter
- `_embedLogo(doc, logoArrayBuffer)` — PNG/JPG-Erkennung via Magic Bytes
- `_drawLogo(page, logoImage, pageSize)` — Logo oben rechts, 30pt Höhe, opacity 0.3

**Y-Koordinaten-Inversion:**
```
// Textbasislinie:
pdfY = pageSize.height - engineY - fontSize

// Block-Unterkante (Bilder, Icons):
pdfY = pageSize.height - engineY - blockHeight
```

**Fehlerbehandlung:** Pro Block try/catch — ein defekter Block stoppt nicht den gesamten Export.

### frontend/js/layout/domRenderer.js

Neues Modul — rendert LayoutResult als seitenweise Blatt-Darstellung im Browser.

**Export:**

#### `renderToDOM(layoutResult, config, container) — synchron, kein async`

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `layoutResult` | `Object` | Ausgabe von `engine.calculateLayout()` |
| `config` | `Object` | `{ format, fontFamily, fontSize, lineHeight, textAlign }` |
| `container` | `HTMLElement` | z.B. `document.getElementById('liedblatt-content')` |

**Interne Struktur:**
- `_createPageElement(pageSize, fontFamily)` — `.preview-page` div mit exakten px-Abmessungen
- `_createBlockElement(block, config)` — Dispatcher je nach `block.type`
- `_createTextElement(...)` — `textContent` statt `innerHTML` (XSS-Schutz, T-02-03-01)
- `_createImageElement(...)` — `<img>` mit `src` direkt aus `data.src`
- `_createIconElement(...)` — Trennlinie als `<hr>` mit `.preview-icon-block` Klasse
- `_ptToPx(pt)` — pt → px via `PT_TO_PX` aus constants.js

## CSS-Klassen die domRenderer erzeugt

| Klasse | Element | Beschreibung |
|--------|---------|-------------|
| `.preview-page` | `<div>` | Pro Seite: weisses Rechteck, `position: relative`, exakte pt→px-Abmessungen |
| `.preview-icon-block` | `<div>` | Icon-Block (Trennlinie), enthält `<hr>` |

**Container-Styling (inline, gesetzt von renderToDOM):**
- `background: #e8e8e8` — grauer Hintergrund um Seiten
- `display: flex; flex-direction: column; align-items: center` — zentrierte Seiten
- `overflow-y: auto` — scrollbar

## Y-Koordinaten-Konvention (für Plan 02-04 Referenz)

| Renderer | Y-Konvention | Aktion |
|----------|-------------|--------|
| `engine.js` | y=0 = Seitenoberkante (DOM) | Gibt alle Blöcke in dieser Konvention aus |
| `pdfRenderer.js` | y=0 = Seitenunterkante (pdf-lib) | Invertiert: `pdfY = pageSize.height - block.y - block.height` |
| `domRenderer.js` | y=0 = Elementoberkante (CSS) | Direkt nutzbar: `top = ptToPx(block.y)` |

## Wichtige Implementierungsdetails

**pdf-lib 1.17.1 Kompatibilität:**
- `page.doc` existiert NICHT — `doc` muss als Parameter übergeben werden
- `font.widthOfTextAtSize(text, size)` ist synchron (kein `await` nötig)
- `doc.embedPng(buffer)` / `doc.embedJpg(buffer)` — PNG-Erkennung via Magic Bytes (`uint8[0] === 137 && uint8[1] === 80`)

**domRenderer Zeilenhöhe:**
Jede Textzeile ist ein eigenes `<div>` mit `height` und `line-height` explizit gesetzt:
```javascript
lineEl.style.height     = `${lineHeightPx}px`;
lineEl.style.lineHeight = `${lineHeightPx}px`;
```
Das stellt exakte Übereinstimmung mit der Engine-Höhenberechnung sicher — CSS `line-height` am Container-Div allein würde abweichen.

## Dateien unverändert (bestätigt)

- `frontend/js/generatePDF.js` — Verdrahtung in Plan 02-04
- `frontend/js/previewPageBreaks.js` — Verdrahtung in Plan 02-04

## Hinweise für Plan 02-04 (Integration)

```javascript
// pdfRenderer-Integration in generatePDF.js:
import { renderToPDF } from './layout/pdfRenderer.js';
import { loadFontArrayBuffers } from './layout/fontManager.js';
import { calculateLayout } from './layout/engine.js';

// domRenderer-Integration in previewPageBreaks.js oder script.js:
import { renderToDOM } from './layout/domRenderer.js';
import { calculateLayout } from './layout/engine.js';
```

Beide Renderer importieren **nicht** aus generatePDF.js oder previewPageBreaks.js.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `widthOfTextAtSize` ist synchron — kein await nötig**
- **Found during:** Task 1 Implementierung
- **Issue:** Plan-Code zeigte `await font.widthOfTextAtSize(line, fontSize)` — in pdf-lib 1.17.1 ist diese Methode synchron
- **Fix:** `await` entfernt in `_drawTextBlock`
- **Files modified:** frontend/js/layout/pdfRenderer.js
- **Commit:** f8351c8 (im selben Task-Commit)

**2. [Rule 1 - Bug] `page.doc` existiert nicht in pdf-lib 1.17.1**
- **Found during:** Task 1 Implementierung
- **Issue:** Plan-Code nutzte `page.doc.embedPng(buffer)` in `_drawImageBlock` — pdf-lib 1.17.1 hat kein `page.doc` Property
- **Fix:** `doc` als expliziter Parameter durch alle `_draw*` Funktionen durchgereicht
- **Files modified:** frontend/js/layout/pdfRenderer.js
- **Commit:** f8351c8 (im selben Task-Commit)

## Known Stubs

Keine — beide Renderer enthalten keine Platzhalter-Werte die zum Nutzer fließen.

## Threat Flags

Keine neuen Netzwerkendpunkte oder Auth-Pfade. pdfRenderer.js lädt Bilder mit Bearer-Token aus localStorage — gleicher Mechanismus wie alle anderen API-Calls (T-02-03-02: accept).

## Self-Check: PASSED

- FOUND: frontend/js/layout/pdfRenderer.js
- FOUND: frontend/js/layout/domRenderer.js
- FOUND: commit f8351c8 (feat(02-03): pdfRenderer.js)
- FOUND: commit 41b6862 (feat(02-03): domRenderer.js)
- Alle Verifikations-Checks grün (Task 1: 7 Checks, Task 2: 12 Checks)
- generatePDF.js und previewPageBreaks.js unverändert (bestätigt via git diff)
