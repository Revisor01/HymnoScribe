# Phase 4: Intra-Element-Umbrüche - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Strophen und Refrains können über Seitengrenzen fortgesetzt werden, ohne manuellen Workaround. Die Layout-Engine aus Phase 2 (engine.js) muss erweitert werden um Blöcke zu splitten wenn sie nicht auf die aktuelle Seite passen. Beide Renderer (domRenderer, pdfRenderer) müssen geteilte Blöcke korrekt rendern.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure engine extension phase. Key considerations from research:
- engine.js calculateLayout() muss Text-Blöcke splitten können wenn sie die Seite überschreiten
- Split-Logik: Zeile für Zeile prüfen, ab welcher Zeile der Platz nicht mehr reicht
- Erster Teil bleibt auf aktueller Seite, Rest geht auf nächste Seite
- Beide Renderer müssen geteilte Blöcke nahtlos darstellen
- Manuell gesetzte Umbrüche innerhalb von Elementen müssen respektiert werden
- Vorschau und PDF müssen identische Umbrüche zeigen (LYOT-04 aus Phase 2 muss erhalten bleiben)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/js/layout/engine.js` — calculateLayout mit LayoutResult { pages[], totalPages }
- `frontend/js/layout/domRenderer.js` — seitenweise DOM-Vorschau
- `frontend/js/layout/pdfRenderer.js` — pdf-lib PDF-Export
- `frontend/js/layout/constants.js` — SPACING, FONT, PAGE_SIZES, MARGINS

### Key Integration Points
- engine.js: Block-Erstellung und Seitenumbruch-Logik erweitern
- Aktuell: Wenn ein Block nicht mehr passt, wird er komplett auf die nächste Seite verschoben
- Neu: Block wird gesplittet — Teil auf aktueller Seite, Rest auf nächster
- domRenderer und pdfRenderer müssen geteilte Blöcke ohne sichtbare Naht rendern

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — last phase of milestone.

</deferred>
