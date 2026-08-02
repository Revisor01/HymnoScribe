# Phase 2: Unified Layout Engine - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Vorschau und PDF-Export nutzen dieselbe Layout-Engine und liefern pixelgenaue Ergebnisse. Die bestehenden Dateien generatePDF.js und previewPageBreaks.js werden inline refactored — keine parallele Neuentwicklung, keine Code-Duplikation. Divergierende Konstanten werden zusammengeführt, die globale Kopplung via window.lastCalculatedBreakPositions eliminiert.

</domain>

<decisions>
## Implementation Decisions

### Layout-Engine Architektur
- Kanonische Einheit: pt (PDF-Punkte). DOM-Renderer konvertiert pt→px (Faktor 1.333 bei 96 DPI). Kein getBoundingClientRect() in der Layout-Berechnung.
- Neue Dateien in `frontend/js/layout/`: engine.js, domRenderer.js, pdfRenderer.js, constants.js, state.js
- Texthöhen-Berechnung über pdf-lib `widthOfTextAtSize` + Zeilenhöhen-Schätzung — gleiche Metrik für beide Renderer, keine DOM-Messung
- **Inline-Refactoring**: generatePDF.js und previewPageBreaks.js direkt umbauen, NICHT parallel neue Dateien aufbauen. Keine Code-Duplikation — alte Logik wird ersetzt, nicht kopiert.

### Konstanten-Zusammenführung
- Bei Divergenz gewinnt der PDF-Wert (aus generatePDF.js) — das ist was gedruckt wird
- constants.js als single source of truth in `frontend/js/layout/constants.js`
- Konstanten gruppiert nach Kategorie: FONT, SPACING, MARGINS, PAGE_SIZES als benannte Objekte

### Rendering-Strategie
- DOM-basierte Vorschau mit HTML-Elementen und exakten pt→px-Maßen
- **Seitenweise Darstellung**: Die Vorschau zeigt das komplette Format als sichtbare Blätter (weißes Rechteck im korrekten Seitenverhältnis des gewählten Formats). Seitenumbrüche ergeben sich natürlich aus den Seitengrenzen. Scrollt man runter, sieht man Seite 2, 3 etc. Man arbeitet direkt "im Blatt".
- Debounced Update bei jeder Änderung (150ms) — live Feedback
- Font-Manager Abstraktion: lädt Fonts einmal, stellt Metriken für Engine bereit, übergibt ArrayBuffer an pdf-lib und CSS-Fontstack an DOM
- Quill-HTML-Parsing via DOMParser — robuster als Regex, unterstützt alle Quill-Inline-Formate

### Claude's Discretion
- Internes API-Design der Layout-Engine (Funktionssignaturen, Datenstrukturen)
- Reihenfolge der Inline-Refactoring-Schritte
- Debounce-Implementierung (requestAnimationFrame vs setTimeout)
- Error-Handling bei fehlenden Fonts oder korrupten Bildern

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/js/generatePDF.js` (1919 Zeilen) — PDF-Rendering-Logik, wird inline refactored
- `frontend/js/previewPageBreaks.js` (1007 Zeilen) — Preview-Logik, wird inline refactored
- `frontend/js/script.js` — globalConfig Objekt, wird zu state.js extrahiert
- `frontend/js/liedblattManagement.js` — DOM-basierter State in #selected-items

### Established Patterns
- ES6 Module Imports: `import { ... } from './utils.js'`
- Konstanten als UPPER_SNAKE_CASE
- Context-Objekt-Pattern: `context.page`, `context.y`, `context.fonts`
- pdf-lib via CDN (PDFLib global)
- fontkit via CDN für Font-Embedding

### Integration Points
- `window.generatePDF` — globale Funktion, wird von dashboard.html aufgerufen
- `updatePreviewWithPageBreaks()` — exportiert, aufgerufen bei Änderungen
- `globalConfig` in script.js — Format, Font, Größe etc.
- `#liedblatt-content` — DOM-Container für Vorschau
- `#selected-items` — DOM-Container für Drag-and-Drop-Liste

### Known Divergences (aus Research)
- STROPHE_SPACING: 8 (PDF) vs 6 (Preview) → PDF-Wert 8 gewinnt
- DEFAULT_OBJECT_SPACING: 15 (PDF) vs 12 (Preview) → PDF-Wert 15 gewinnt
- COPYRIGHT_FONT_SIZE: 12 (PDF) vs 10 (Preview) → PDF-Wert 12 gewinnt
- PX_TO_PT_RATIO: 0.75 in Preview (nur bei 96 DPI korrekt)

### Critical Coupling to Eliminate
- `window.lastCalculatedBreakPositions` (previewPageBreaks.js Zeile 78) — stille Kopplung zwischen den zwei Systemen

</code_context>

<specifics>
## Specific Ideas

- Die Vorschau soll seitenweise dargestellt werden — sichtbare Blätter im korrekten Seitenverhältnis, nicht nur Umbruch-Marker
- Man arbeitet direkt "im Blatt" und sieht sofort wie es gedruckt aussieht
- Scrollt man runter, sieht man Seite 2, 3 etc.
- Kein Trial-and-Error mehr — was man sieht ist was man bekommt

</specifics>

<deferred>
## Deferred Ideas

- Spacing-Drag-Regler (Phase 3)
- Bildgrößen-Controls (Phase 3)
- Freie Schriftgrößenwahl (Phase 3)
- Intra-Element-Umbrüche (Phase 4)

</deferred>
