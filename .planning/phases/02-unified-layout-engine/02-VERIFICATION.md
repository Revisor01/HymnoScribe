---
phase: 02-unified-layout-engine
verified: 2026-04-08T00:00:00Z
status: human_needed
score: 7/8 must-haves verified
human_verification:
  - test: "Vorschau seitenweise (weisse Blätter) und PDF-Übereinstimmung visuell prüfen"
    expected: "Vorschau zeigt separate weisse Blatt-Divs (.preview-page) statt Umbruchmarker-Scroll. PDF-Export hat identische Seitenumbrüche und Textpositionen wie Vorschau."
    why_human: "Visuelles WYSIWYG-Ergebnis (LYOT-04) kann nicht programmatisch verifiziert werden — erfordert laufende App mit Datenbank, Fonts und echten Liedblatt-Inhalten. Der Checkpoint in Plan 02-04 wurde explizit wegen fehlender Datenbankverbindung nicht vom Nutzer abgenommen (Beleg: 02-04-SUMMARY.md Zeile 100-128)."
---

# Phase 02: Unified Layout Engine — Verification Report

**Phase Goal:** Vorschau und PDF-Export nutzen dieselbe Layout-Engine und liefern pixelgenaue Ergebnisse
**Verified:** 2026-04-08
**Status:** human_needed
**Re-verification:** Nein — initiale Verifikation

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | constants.js existiert als Single Source of Truth mit allen Layout-Konstanten in pt, PDF-Werte gewinnen | VERIFIED | `/frontend/js/layout/constants.js`: FONT.COPYRIGHT_SIZE=12, SPACING.STROPHE=8, SPACING.OBJECT_DEFAULT=15 — alle PDF-Werte korrekt |
| 2 | fontManager.js lädt Fonts via /api/ttf, cached ArrayBuffers, trennt Laden von Embedding | VERIFIED | `/frontend/js/layout/fontManager.js`: loadFontArrayBuffers, embedFontsInDoc, getFontForStyle, clearFontCache exportiert; arrayBufferCache modul-privat |
| 3 | calculateLayout() ist eine pure async Funktion ohne DOM-Layout-Zugriff oder pdf-lib-Aufruf | VERIFIED | `/frontend/js/layout/engine.js`: kein window.getComputedStyle, kein offsetHeight, kein window.lastCalculated; nur DOMParser und innerText |
| 4 | Texthöhen werden via font.widthOfTextAtSize berechnet (gleiche Metrik für PDF und Vorschau) | VERIFIED | `engine.js` Zeile 65: `font.widthOfTextAtSize(testLine, fontSize)` in splitTextToLines — einziger Berechnungsort |
| 5 | pdfRenderer.js konsumiert LayoutResult und rendert via pdf-lib mit korrekter Y-Inversion | VERIFIED | `/frontend/js/layout/pdfRenderer.js`: pdfY = pageSize.height - engineY - fontSize; doc als expliziter Parameter (pdf-lib 1.17.1 kompatibel) |
| 6 | domRenderer.js rendert seitenweise weisse Blatt-Divs aus LayoutResult | VERIFIED | `/frontend/js/layout/domRenderer.js`: container.innerHTML='', .preview-page divs, absolute positioning, PT_TO_PX-Konversion |
| 7 | generatePDF.js und previewPageBreaks.js sind Thin-Wrapper; window.lastCalculatedBreakPositions ist eliminiert; Debounce 150ms | VERIFIED | generatePDF.js: importiert calculateLayout, renderToPDF, loadFontArrayBuffers. previewPageBreaks.js: importiert calculateLayout, renderToDOM; Debounce }, 150); kein window.lastCalculatedBreakPositions in beiden Dateien (grep: 0 Treffer) |
| 8 | Vorschau und PDF-Export sind visuell pixelgenau identisch (WYSIWYG) | NEEDS HUMAN | Code-Pfade korrekt verdrahtet, aber visueller Checkpoint aus Plan 02-04 wurde nicht vom Nutzer abgenommen — Datenbankverbindung zum Testzeitpunkt nicht verfügbar |

**Score:** 7/8 Truths verifiziert

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/js/layout/constants.js` | 6 Exports: FONT, SPACING, MARGINS, PAGE_SIZES, LAYOUT, PT_TO_PX | VERIFIED | Alle 6 Exports vorhanden; korrekte Werte |
| `frontend/js/layout/fontManager.js` | 4 Exports: loadFontArrayBuffers, embedFontsInDoc, getFontForStyle, clearFontCache | VERIFIED | Alle 4 Exports, arrayBufferCache modul-privat |
| `frontend/js/layout/engine.js` | 3 Exports: calculateLayout, parseQuillHTML, splitTextToLines | VERIFIED | Alle 3 Exports; importiert nur aus constants.js |
| `frontend/js/layout/pdfRenderer.js` | Export: renderToPDF, Y-Inversion, Fehlerbehandlung pro Block | VERIFIED | renderToPDF exportiert, pdfY = pageSize.height - engineY - fontSize |
| `frontend/js/layout/domRenderer.js` | Export: renderToDOM, seitenweise Divs, kein globaler State | VERIFIED | renderToDOM exportiert, .preview-page Klasse, kein window.lastCalculated |
| `frontend/js/generatePDF.js` | Thin-Wrapper mit calculateLayout + renderToPDF Imports | VERIFIED | Imports zeile 4-6; generatePDF() ruft calculateLayout + renderToPDF auf |
| `frontend/js/previewPageBreaks.js` | Thin-Wrapper mit calculateLayout + renderToDOM; 150ms Debounce | VERIFIED | Imports zeile 4-6; }, 150) auf Zeile 94; initPreviewFormatSelector erhalten |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `engine.js` | `constants.js` | `import { FONT, SPACING, MARGINS, PAGE_SIZES, LAYOUT }` | WIRED | Zeile 9 in engine.js |
| `pdfRenderer.js` | `fontManager.js` | `import { embedFontsInDoc, getFontForStyle }` | WIRED | Zeile 11 in pdfRenderer.js |
| `pdfRenderer.js` | `constants.js` | `import { PAGE_SIZES, MARGINS }` | WIRED | Zeile 12 in pdfRenderer.js |
| `domRenderer.js` | `constants.js` | `import { PT_TO_PX, PAGE_SIZES }` | WIRED | Zeile 11 in domRenderer.js |
| `generatePDF.js` | `engine.js` | `import { calculateLayout }` | WIRED | Zeile 4 in generatePDF.js |
| `generatePDF.js` | `pdfRenderer.js` | `import { renderToPDF }` | WIRED | Zeile 5 in generatePDF.js |
| `generatePDF.js` | `fontManager.js` | `import { loadFontArrayBuffers, embedFontsInDoc }` | WIRED | Zeile 6 in generatePDF.js |
| `previewPageBreaks.js` | `engine.js` | `import { calculateLayout }` | WIRED | Zeile 4 in previewPageBreaks.js |
| `previewPageBreaks.js` | `domRenderer.js` | `import { renderToDOM }` | WIRED | Zeile 5 in previewPageBreaks.js |
| `calculateLayout return value` | `renderToPDF / renderToDOM input` | `layoutResult.pages[].blocks[]` | WIRED | generatePDF.js Zeile 879+897; previewPageBreaks.js Zeile 84+87 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `generatePDF.js (generatePDF fn)` | `layoutResult` | `calculateLayout(items, engineConfig, fonts)` — items aus `document.getElementById('liedblatt-content').children` | Ja — DOM-Items aus echtem Editor-Container | FLOWING |
| `previewPageBreaks.js (updatePreviewWithPageBreaks)` | `layoutResult` | `calculateLayout(items, engineConfig, fonts)` — items aus `container.children` | Ja — DOM-Items aus echtem Editor-Container | FLOWING |
| `engine.js (calculateLayout)` | `lines` in blocks | `splitTextToLines(text, font, fontSize, contentWidth)` via `font.widthOfTextAtSize` | Ja — echte Font-Metrik | FLOWING |

### Behavioral Spot-Checks

Step 7b: ÜBERSPRUNGEN — App erfordert laufende Datenbankverbindung (Docker). Keine runnable entry points ohne DB.

### Requirements Coverage

| Requirement | Beschreibung | Plan | Status | Evidenz |
|-------------|-------------|------|--------|---------|
| LYOT-01 | Einheitliche Layout-Engine in pt | 02-02 | SATISFIED | engine.js: calculateLayout exportiert, alle Werte in pt |
| LYOT-02 | DOM-Renderer als WYSIWYG-Vorschau | 02-03 | SATISFIED | domRenderer.js: renderToDOM exportiert, seitenweise Blätter |
| LYOT-03 | PDF-Renderer auf Layout-Engine-Output | 02-03 | SATISFIED | pdfRenderer.js: renderToPDF exportiert, LayoutResult konsumiert |
| LYOT-04 | Vorschau und PDF pixelgenau identisch | 02-04 | NEEDS HUMAN | Code korrekt verdrahtet; visueller Checkpoint nicht vom Nutzer abgenommen |
| LYOT-05 | Divergierende Konstanten zusammengeführt | 02-01 | SATISFIED | constants.js: PDF-Werte gewinnen (COPYRIGHT_SIZE=12, STROPHE=8, OBJECT_DEFAULT=15) |
| LYOT-06 | window.lastCalculatedBreakPositions eliminiert | 02-04 | SATISFIED | grep auf beiden Dateien: 0 Treffer |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `generatePDF.js` | 12-37 | Lokale Konstantendefinitionen (BASE_FONT_SIZE, STROPHE_SPACING etc.) nach Refactoring noch vorhanden | Info | Toter Code — wird von der neuen generatePDF()-Funktion nicht mehr referenziert. Kein Stub, kein Blocking-Problem. Kann bei zukünftiger Bereinigung entfernt werden. |
| `generatePDF.js` | 1272 | splitTextToLines doppelt (auch in engine.js) | Info | generatePDF.js-Kopie ist toter Code — neue generatePDF() nutzt engine.js. Kein Blocking-Problem. |

Keine Blocker oder Warnungen gefunden. Beide Info-Items sind erwartetes Residual aus dem chirurgischen Inline-Refactoring (Kompatibilität erhalten, Legacy-Code bleibt unbeschädigt).

### Human Verification Required

#### 1. Visuelle WYSIWYG-Verifikation (LYOT-04)

**Test:** App im Browser öffnen (nach `docker-compose up`). Mit Testnutzer einloggen. Mehrere Lieder mit je 2-3 Strophen zum Liedblatt hinzufügen.

**Erwartetes Ergebnis:**
1. Vorschau zeigt separate weisse Blatt-Divs mit Schatten (nicht langer Scroll-Container mit Umbruchmarkern)
2. Beim Scrollen erscheinen Seite 2, Seite 3 etc. als eigenständige Blätter
3. Format-Wechsel im Dropdown baut Vorschau neu auf mit korrekten Proportionen
4. PDF-Export: Seitenumbrüche liegen an denselben Stellen wie in der Vorschau
5. Textpositionen und -größen stimmen zwischen Vorschau und PDF überein
6. Browser-Konsole zeigt keine JS-Fehler beim Laden oder Export

**Warum Human:** Visuelles WYSIWYG-Ergebnis (pixelgenaue Übereinstimmung) kann nicht programmatisch verifiziert werden. Plan 02-04 enthielt explizit einen `checkpoint:human-verify` Task als Gate — dieser wurde aufgrund fehlender Datenbankverbindung zum Ausführungszeitpunkt nicht abgenommen.

### Gaps Summary

Kein automatisch verifizierbarer Gap identifiziert. Alle Code-Pfade sind korrekt implementiert und verdrahtet.

Der einzige offene Punkt ist die visuelle Nutzerverfizierung (LYOT-04), die wegen fehlender Laufzeitumgebung beim Phasendurchlauf nicht stattgefunden hat. Die strukturellen Voraussetzungen (gleicher LayoutResult für beide Renderer, identische Berechnungslogik) sind vollständig erfüllt.

---

_Verified: 2026-04-08_
_Verifier: Claude (gsd-verifier)_
