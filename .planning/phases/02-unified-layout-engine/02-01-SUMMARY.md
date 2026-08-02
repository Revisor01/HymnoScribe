---
phase: 02-unified-layout-engine
plan: 01
subsystem: layout-engine
tags: [constants, font-management, layout, foundation]
dependency_graph:
  requires: []
  provides: [constants.js, fontManager.js]
  affects: [02-02-engine, 02-03-pdfRenderer, 02-04-domRenderer]
tech_stack:
  added: []
  patterns: [single-source-of-truth, module-private-cache, separation-of-concerns]
key_files:
  created:
    - frontend/js/layout/constants.js
    - frontend/js/layout/fontManager.js
  modified: []
decisions:
  - "PDF-Werte gewinnen bei Konstanten-Divergenz: COPYRIGHT_SIZE=12 (nicht 10), STROPHE=8 (nicht 6), OBJECT_DEFAULT=15 (nicht 12)"
  - "ArrayBuffer-Laden und PDF-Embedding getrennt: loadFontArrayBuffers vs embedFontsInDoc"
  - "PT_TO_PX = 96/72 (nicht PX_TO_PT_RATIO = 0.75 aus previewPageBreaks.js — Richtung umgekehrt, klarer)"
metrics:
  duration: ~15min
  completed: 2026-04-08
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 02 Plan 01: Layout Foundation — constants.js und fontManager.js Summary

**One-liner:** ES6-Module-Foundation mit allen Layout-Konstanten in pt (Single Source of Truth) und entkoppeltem Font-Manager mit ArrayBuffer-Cache.

## Was wurde erstellt

### frontend/js/layout/constants.js

Neue Datei als einzige Quelle aller Layout-Konstanten. Eliminiert die Konstanten-Divergenz zwischen `generatePDF.js` und `previewPageBreaks.js` (LYOT-05).

**Exports:**
- `FONT` — Schriftgrößen und Skalierungsfaktoren
- `SPACING` — Alle Abstände (Strophen, Objekte, Bilder, Quill-Überschriften, Copyright)
- `MARGINS` — Seitenränder (top: 30, right: 20, bottom: 20, left: 20 — alle in pt)
- `PAGE_SIZES` — Seitenformate (a5, dl, a4-schmal, a3-schmal) berechnet über mmToPt
- `LAYOUT` — Umbruchregeln (MAX_STROPHES_BEFORE_BREAK, MAX_PSALM_LINES_BEFORE_BREAK, MIN_SPACE_FOR_NEXT_GROUP)
- `PT_TO_PX` — Umrechnungsfaktor 96/72 für DOM-Renderer

**Gewinnende PDF-Werte bei Divergenz:**

| Konstante | generatePDF.js | previewPageBreaks.js | Gewinner (constants.js) |
|-----------|---------------|---------------------|------------------------|
| COPYRIGHT_SIZE | 12 | 10 | **12** (PDF-Wert) |
| STROPHE | 8 | 6 | **8** (PDF-Wert) |
| OBJECT_DEFAULT | 15 | 12 | **15** (PDF-Wert) |

### frontend/js/layout/fontManager.js

Neue Datei — extrahiert Font-Lade-Logik aus `generatePDF.js` und trennt ArrayBuffer-Laden von PDF-Embedding.

**Exports:**
- `loadFontArrayBuffers(fontFamily)` — Lädt alle 4 Stile (Regular, Bold, Italic, BoldItalic) als ArrayBuffer, cached in privatem `arrayBufferCache`
- `embedFontsInDoc(doc, arrayBuffers)` — Bettet ArrayBuffers in pdf-lib PDFDocument ein, gibt PDFFont-Objekte zurück
- `getFontForStyle(fonts, bold, italic)` — Wählt richtigen PDFFont anhand Formatierungsflags mit Fallback-Kette
- `clearFontCache()` — Leert privaten Cache (für Tests/Font-Wechsel)

**Schlüsseleigenschaften:**
- `arrayBufferCache` ist modul-privat (nicht exportiert)
- Kein Import aus `generatePDF.js` — vollständig unabhängig
- Fallback: Regular wird als Ersatz für Bold/Italic genutzt wenn nicht ladbar
- Fehler nur bei fehlendem Regular-Font (kritischer Fehler)

## Dateien unverändert (bestätigt)

- `frontend/js/generatePDF.js` — wird in Plan 02-03 umgebaut
- `frontend/js/previewPageBreaks.js` — wird in Plan 02-04 umgebaut

## Hinweise für Plan 02-02 (engine.js)

engine.js importiert aus beiden neuen Dateien:
```javascript
import { FONT, SPACING, MARGINS, PAGE_SIZES, LAYOUT, PT_TO_PX } from './constants.js';
import { loadFontArrayBuffers, embedFontsInDoc, getFontForStyle } from './fontManager.js';
```

Die Trennung `loadFontArrayBuffers` / `embedFontsInDoc` ermöglicht es engine.js, Fonts einmal zu laden und dann entweder in PDF (via `embedFontsInDoc`) oder im DOM (via Canvas/FontFace API mit denselben ArrayBuffers) zu nutzen.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None — beide Dateien fügen keine neuen Netzwerkendpunkte oder Auth-Pfade hinzu. Der Bearer-Token-Fetch-Ansatz in `fontManager.js` folgt dem bereits etablierten Projektmuster.

## Self-Check: PASSED

- FOUND: frontend/js/layout/constants.js
- FOUND: frontend/js/layout/fontManager.js
- FOUND: commit f8249db (feat(02-01): constants.js)
- FOUND: commit 4683eb1 (feat(02-01): fontManager.js)
