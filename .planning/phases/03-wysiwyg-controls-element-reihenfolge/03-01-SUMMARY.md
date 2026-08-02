---
phase: 03-wysiwyg-controls-element-reihenfolge
plan: "01"
subsystem: ui
tags: [override-state, layout-engine, font-size, wysiwyg, page-break, vanilla-js]

requires:
  - phase: 02-unified-layout-engine
    provides: calculateLayout(), renderToDOM(), domRenderer.js, engine.js mit LayoutResult-API

provides:
  - overrideState.js — zentrales Override-State-Modul (spacing, imageSize, fontSize)
  - calculateLayout() mit optionalem overrides-Parameter (engine.js)
  - imageSizeOverrides in Bild-Block der Engine konsumiert (effectiveWidth)
  - page-break-marker Block-Typ in engine.js + domRenderer.js
  - Globale Font-Size-Presets-Toolbar (8–24pt + Benutzerdefiniert) in right-panel
  - Per-Element Font-Size-Override-Input neben jedem Liedblatt-Listenelement
  - Format-Switch triggert Re-Layout mit erhaltenen Overrides

affects:
  - 03-02 (spacing-/imageSize-Drag-Handles konsumieren overrideState.js)
  - 03-03 (Element-Reihenfolge und data-override-key-Stabilisierung)
  - sessionManagement.js (muss serializeOverrides/deserializeOverrides integrieren)

tech-stack:
  added: []
  patterns:
    - "Override-State als eigenes Modul (overrideState.js) — kein globaler State, alle Werte geclampt"
    - "calculateLayout(items, config, fonts, overrides = {}) — rückwärtskompatible Signatur-Erweiterung"
    - "page-break-marker als expliziter Block-Typ — Engine gibt ihn aus, Renderer zeigt ihn"
    - "Temporärer overrideKey via Date.now() — Plan 02/03 stabilisiert via data-override-key"

key-files:
  created:
    - frontend/js/layout/overrideState.js
  modified:
    - frontend/js/layout/engine.js
    - frontend/js/layout/domRenderer.js
    - frontend/js/previewPageBreaks.js
    - frontend/dashboard.html
    - frontend/css/style.css
    - frontend/js/liedblattManagement.js

key-decisions:
  - "overrideState.js als eigenes Modul statt in engine.js oder globalConfig — klare Trennung, leicht serialisierbar"
  - "Temporärer overrideKey via Date.now() in Plan 01 — Plan 02 stabilisiert durch data-override-key auf liedblatt-item"
  - "CSS in style.css ergänzt (nicht dashboard.css) — dashboard.css existiert nicht im Projekt"
  - "NaN/Infinity-Guard in allen Override-Setter und fontSizeCustom-Handler (T-03-01-02)"

patterns-established:
  - "Override-Clamping: alle Setter in overrideState.js verwenden Math.max/min + isFinite() Guard"
  - "Re-Layout-Trigger: Override-Change-Handler liest previewFormat aus DOM und ruft updatePreviewWithPageBreaks()"
  - "page-break-marker: Engine pusht Marker-Block vor newPage() — Renderer rendert ihn als roten gestrichelten Balken"

requirements-completed: [WYSI-03, WYSI-04, WYSI-05]

duration: 25min
completed: 2026-04-08
---

# Phase 3 Plan 01: Override-State-Modul + Font-Size-Controls + Seitenumbruch-Marker Summary

**overrideState.js als zentrales Override-Modul mit geclamten Settern, engine.js-Signatererweiterung mit imageSizeOverrides, globalem Font-Size-Preset-Dropdown (8–24pt) in der Toolbar und per-Element-Override-Input neben jedem Liedblatt-Element**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-08T08:45:00Z
- **Completed:** 2026-04-08T09:10:45Z
- **Tasks:** 3
- **Files modified:** 6 (1 neu erstellt)

## Accomplishments

- overrideState.js erstellt mit 8 Exporten (getOverrides, setSpacing/ImageSize/FontSizeOverride, clearOverride, clearOverrides, serialize/deserializeOverrides) — alle Werte geclampt gegen extreme DOM-Eingaben
- calculateLayout() Signatur rückwärtskompatibel erweitert: neuer vierter Parameter `overrides = {}`, imageSizeOverrides im Bild-Block konsumiert (effectiveWidth via widthFraction)
- page-break-marker Block-Typ in engine.js (vor newPage()) und domRenderer.js (roter gestrichelter Balken) implementiert
- Globales Font-Size-Preset-Dropdown (8/10/12/14/16/18/20/24pt + Benutzerdefiniert) direkt in der Vorschau-Toolbar, triggert sofortiges Re-Layout
- Per-Element Font-Size-Override-Input (pt) neben jedem Element in der Liedblatt-Liste, leeres Feld löscht Override

## Task Commits

1. **Task 1: overrideState.js + engine.js Signatur + domRenderer Marker** - `d106447` (feat)
2. **Task 2: Globale Font-Size-Presets + Format-Switch verdrahten** - `adefb64` (feat)
3. **Task 3: Per-Element Font-Size-Override UI** - `41c0199` (feat)

## Files Created/Modified

- `frontend/js/layout/overrideState.js` — Neu: zentrales Override-State-Modul, 8 Exporte, alle Werte geclampt
- `frontend/js/layout/engine.js` — Signatur mit `overrides = {}`, imageSizeOverrides im Bild-Block, page-break-marker vor newPage()
- `frontend/js/layout/domRenderer.js` — page-break-marker Case in _createBlockElement, neue _createPageBreakMarkerElement Funktion
- `frontend/js/previewPageBreaks.js` — Import getOverrides, Übergabe an calculateLayout, Font-Size-Preset-Handler in initPreviewFormatSelector
- `frontend/dashboard.html` — fontSizePresets-Dropdown + fontSizeCustom-Input in right-panel nach preview-format-container
- `frontend/css/style.css` — CSS-Klassen font-size-control-container, font-size-override-control/-input/-label
- `frontend/js/liedblattManagement.js` — Import setFontSizeOverride/clearOverride, createFontSizeOverrideControl(), Integration in addToSelected() titleRow

## Decisions Made

- **CSS-Datei:** dashboard.css existiert nicht — CSS in style.css ergänzt (letzter Abschnitt mit Kommentar "WYSIWYG Controls")
- **Temporärer overrideKey:** Plan 01 nutzt `item-${Date.now()}-${random}` — Plan 02/03 stabilisiert via `data-override-key` auf liedblatt-item
- **overrideState als Modul:** Kein globaler State (globalConfig), eigenes Modul für klare Trennung und einfache Serialisierung in Session/Vorlage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] NaN/Infinity-Guard in fontSizeCustom-Handler**
- **Found during:** Task 2 (Font-Size-Presets Implementation)
- **Issue:** Plan beschreibt `parseFloat(value) || 12` Guard — für Infinity reicht das nicht (parseFloat("Infinity") ist finite: false)
- **Fix:** `isFinite(parsed) ? parsed : 12` Guard in fontSizeCustom-Handler und setFontSizeOverride() (T-03-01-02)
- **Files modified:** frontend/js/previewPageBreaks.js, frontend/js/layout/overrideState.js
- **Committed in:** adefb64 (Task 2), d106447 (Task 1)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical security)
**Impact on plan:** Guard gegen DoS durch Infinity-Eingaben. Kein Scope Creep.

## Issues Encountered

- Worktree-Branch basierte auf `origin/master` (dependabot-Commits), nicht auf 664b664. Gelöst durch neuen Branch `phase-03-01-overridestate` von 664b664.
- `frontend/css/dashboard.css` existiert nicht — Plan referenziert falsche Datei. CSS in `style.css` ergänzt.

## Known Stubs

- `overrideKey` in `addToSelected()` ist temporär (`item-${Date.now()}`). Wenn Session gespeichert und geladen wird, stimmt der Key nicht mehr mit dem Override überein. Plan 02 stabilisiert den Key via `data-override-key` auf dem liedblatt-item in `updateLiedblatt()`.
- `serializeOverrides()`/`deserializeOverrides()` existieren, werden aber noch nicht in `sessionManagement.js` aufgerufen — Plan 03 integriert das.

## Next Phase Readiness

- overrideState.js fertig und importierbar — Plan 02 (Spacing-/ImageSize-Drag-Handles) kann direkt aufbauen
- calculateLayout() akzeptiert overrides-Parameter — Plan 02/03 können fontSizeOverrides und spacingOverrides direkt anwenden
- page-break-marker in Vorschau sichtbar (WYSI-05 erfüllt)
- Font-Size-Presets funktionsfähig (WYSI-03 erfüllt)
- Format-Switch mit Override-Erhalt (WYSI-04 erfüllt)

---
## Self-Check: PASSED

- overrideState.js: FOUND
- engine.js: FOUND (Signatur + overrides-Destructuring + imageSizeOverrides + page-break-marker)
- domRenderer.js: FOUND (page-break-marker Case + _createPageBreakMarkerElement)
- Commits d106447, adefb64, 41c0199: alle vorhanden
- SUMMARY.md: FOUND

*Phase: 03-wysiwyg-controls-element-reihenfolge*
*Completed: 2026-04-08*
