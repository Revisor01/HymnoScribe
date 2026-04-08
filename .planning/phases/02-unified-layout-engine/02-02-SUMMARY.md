---
phase: 02-unified-layout-engine
plan: 02
subsystem: layout-engine
tags: [layout-engine, pure-function, splitTextToLines, parseQuillHTML, calculateLayout]
dependency_graph:
  requires: [02-01]
  provides: [engine.js]
  affects: [02-03-pdfRenderer, 02-04-domRenderer]
tech_stack:
  added: []
  patterns: [pure-function, separation-of-concerns, single-source-of-truth, dom-parser-isolation]
key_files:
  created:
    - frontend/js/layout/engine.js
  modified: []
decisions:
  - "splitTextToLines bleibt vorerst doppelt (engine.js + generatePDF.js) — generatePDF.js importiert sie erst in Plan 02-03"
  - "getFontForStyle inline in engine.js definiert (nicht aus fontManager.js importiert) — engine.js braucht nur PDFFont-Objekte, nicht die Lade-Logik"
  - "Y-Koordinaten-Konvention y=0=Seitenoberseite (DOM) — pdfRenderer muss bei Rendering invertieren"
metrics:
  duration: ~10min
  completed: 2026-04-08
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 02 Plan 02: engine.js — Pure Layout-Engine Summary

**One-liner:** Pure async calculateLayout-Engine ohne DOM- oder pdf-lib-Zugriff, die Positionen und Seitenumbrüche als format-agnostisches LayoutResult zurückgibt.

## Was wurde erstellt

### frontend/js/layout/engine.js

Neue Datei — die Layout-Engine. Trennt Berechnungslogik vollständig vom Rendering.

**Drei öffentliche Exports:**

#### `splitTextToLines(text, font, fontSize, maxWidth): Promise<string[]>`
- Exakte Kopie aus `generatePDF.js` Zeilen 1425–1451
- Einziger Ort im System, an dem `font.widthOfTextAtSize` aufgerufen wird
- Beide Renderer (pdfRenderer, domRenderer) nutzen dieselbe Berechnung → keine Divergenz
- `generatePDF.js` importiert diese Funktion ab Plan 02-03

#### `parseQuillHTML(htmlString): Array<{text, tag, bold, italic, underline, alignment, isQuillHeading}>`
- Parst Quill-`innerHTML` via `DOMParser` — erzeugtes Dokument ist isoliert, Script-Tags werden nicht ausgeführt
- Kein `window.getComputedStyle`, kein `element.offsetHeight`, kein Zugriff auf lebende DOM-Knoten
- Erkennt Inline-Formatierung (`<strong>`, `<em>`, `<u>`) und Block-Tags (`p`, `h1`–`h3`, `li`)
- Liest `textAlign` aus `style`-Attribut oder `data-align` (Quill-Konvention)

#### `calculateLayout(items, config, fonts): Promise<LayoutResult>`
- `items`: `Array.from(liedblattContent.children)` — DOM-Elemente als reine Eingabe (kein Layout-Zugriff)
- `config`: `{ format, fontSize, lineHeight, textAlign, fontFamily }`
- `fonts`: `{ regular, bold, italic, bolditalic }` — PDFFont-Objekte aus `embedFontsInDoc`
- Gibt `{ pages, totalPages }` zurück (LayoutResult-Struktur, alle Werte in pt)

## LayoutResult — Exaktes Schema

```javascript
{
    pages: [
        {
            pageNumber: 1,          // 1-basiert
            blocks: [
                {
                    type: 'text',   // 'text' | 'image' | 'icon' | 'spacing'
                    x: 20,          // pt vom linken Rand (= MARGINS.left)
                    y: 30,          // pt von Seitenoberkante (y=0 = oben, DOM-Konvention)
                    width: 379.53,  // pt (pageWidth - MARGINS.left - MARGINS.right)
                    height: 21.0,   // pt — lines.length * fontSize * lineHeightFactor
                    data: {
                        // type='text':
                        lines: ['Kyrie eleison'],   // vorberechnete Zeilen
                        fontSize: 14,               // pt
                        fontStyle: 'regular',       // 'regular'|'bold'|'italic'|'boldItalic'
                        alignment: 'center',
                        lineHeight: 1.5,
                        isCopyright: false,
                        isRefrain: false,
                        isStrophe: false,
                        isQuillHeading: false,

                        // type='image':
                        src: '/api/uploads/...',
                        naturalWidth: 800,
                        naturalHeight: 600,

                        // type='icon':
                        iconType: 'line',           // aus data-icon-type Attribut
                    }
                }
            ]
        }
    ],
    totalPages: 2
}
```

## DOM-Elemente — Klassifizierung

| Element-Typ | Erkennung | LayoutResult-Block-Typ |
|-------------|-----------|------------------------|
| Manueller Seitenumbruch | `item.classList.contains('page-break')` | — (löst `newPage()` aus) |
| Trenner/Icon | `item.classList.contains('trenner')` | `'icon'` |
| Bild | `item.querySelector('img')` | `'image'` |
| Freier Text (Quill) | `item.querySelector('.ql-editor')` | `'text'` (via parseQuillHTML) |
| Lied-Item | `item.querySelectorAll('h1, h2, h3, p, .copyright-info, .strophe, .refrain')` | `'text'` |

## Y-Koordinaten-Konvention

**y=0 ist Seitenoberkante** (DOM-Konvention). Werte wachsen nach unten.

- `engine.js` gibt alle Y-Werte in dieser Konvention aus
- `pdfRenderer.js` muss bei der Ausgabe invertieren: `pdfY = pageHeight - block.y - block.height`
- `domRenderer.js` kann Y direkt als CSS `top`-Wert nutzen (nach pt→px Umrechnung via `PT_TO_PX`)

## Hinweise für Plan 02-03 (pdfRenderer.js)

```javascript
import { calculateLayout, splitTextToLines } from './layout/engine.js';
import { FONT, SPACING, MARGINS, PAGE_SIZES } from './layout/constants.js';
import { loadFontArrayBuffers, embedFontsInDoc } from './layout/fontManager.js';
```

- `splitTextToLines` aus `generatePDF.js` entfernen und durch Import ersetzen
- `calculateLayout` aufrufen, dann über `result.pages` iterieren und per `pdf-lib` zeichnen
- Y-Koordinaten invertieren beim Zeichnen: `page.drawText(text, { x: block.x, y: pageHeight - block.y - block.height })`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Kommentar enthielt den String `window.getComputedStyle`**
- **Found during:** Task 1 Verifikation
- **Issue:** Der JSDoc-Kommentar `KEIN window.getComputedStyle` ließ den automatischen String-Check fehlschlagen
- **Fix:** Kommentar umformuliert zu "Kein getComputedStyle, kein live-DOM-Zugriff"
- **Files modified:** frontend/js/layout/engine.js
- **Commit:** fddadee (im selben Task-Commit enthalten)

## Known Stubs

Keine — engine.js enthält keine Platzhalter oder hartcodierten leeren Werte die zum Renderer fließen.

## Threat Flags

Keine neuen Netzwerkendpunkte oder Auth-Pfade. `DOMParser` erzeugt ein isoliertes Dokument — Script-Tags werden nicht ausgeführt (T-02-02-01: accept).

## Self-Check: PASSED

- FOUND: frontend/js/layout/engine.js
- FOUND: commit fddadee (feat(02-02): engine.js)
- Alle 7 Verifikations-Checks grün (calculateLayout, parseQuillHTML, splitTextToLines, kein getComputedStyle/offsetHeight, kein window.lastCalculated, DOMParser, constants.js-Import)
