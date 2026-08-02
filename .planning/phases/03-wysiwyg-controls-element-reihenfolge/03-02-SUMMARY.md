---
phase: 03-wysiwyg-controls-element-reihenfolge
plan: "02"
subsystem: ui
tags: [drag-handles, override-keys, spacing, image-resize, wysiwyg, pointer-events, vanilla-js]

requires:
  - phase: 03-wysiwyg-controls-element-reihenfolge
    plan: "01"
    provides: overrideState.js (setSpacingOverride, setImageSizeOverride), calculateLayout() mit overrides-Parameter

provides:
  - Stabile data-override-key Attribute auf liedblatt-content-Kinder (updateLiedblatt)
  - overrideKey in engine.js block.data fuer Bild- und Text-Bloecke + spacing-override-marker
  - Spacing-Handle als horizontaler Balken zwischen Bloecken (domRenderer._createSpacingHandle)
  - Bild-Resize-Handle an Unterkante jedes Bild-Blocks (domRenderer._createImageElement)
  - Event-Delegation fuer Drag auf liedblatt-content Container (previewPageBreaks.initDragHandles)

affects:
  - 03-03 (Session-Serialisierung kann data-override-key stabil lesen)
  - sessionManagement.js (serializeOverrides/deserializeOverrides koennen stabile Keys nutzen)

tech-stack:
  added: []
  patterns:
    - "data-override-key = '{objekt.id}:{index}' — stabil solange Reihenfolge gleich"
    - "Event-Delegation auf Container-Ebene — ueberlebt container.innerHTML = '' Re-Renders nicht, aber Container selbst bleibt"
    - "_dragHandlesInitialized Flag verhindert Doppel-Registration bei Re-Renders"
    - "setPointerCapture verhindert Pointer-Verlust bei schnellem Drag (Pitfall #2)"
    - "150ms Debounce in _scheduleRelayout (T-03-02-01 DoS-Mitigierung)"

key-files:
  created: []
  modified:
    - frontend/js/liedblattManagement.js
    - frontend/js/layout/engine.js
    - frontend/js/layout/domRenderer.js
    - frontend/js/previewPageBreaks.js
    - frontend/css/style.css

key-decisions:
  - "CSS in style.css (nicht dashboard.css) — dashboard.css existiert nicht im Projekt (bestaetigt aus Plan 01)"
  - "spacing-override-marker Block wird IMMER gepusht wenn spacingOverride gesetzt — Handle erscheint nur bei aktivem Override"
  - "image overflow:visible damit Resize-Handle unter Block-Kante ragt"
  - "Event-Delegation auf liedblatt-content Container — dieser ueberlebt renderToDOM nicht (container.innerHTML = ''), daher Flag auf Container-Objekt"

patterns-established:
  - "spacing-override-marker als expliziter Block-Typ — Engine pusht ihn, Renderer zeigt Handle"
  - "overrideKey in allen block.data-Objekten — einheitlich fuer Renderer und Drag-Handler"

requirements-completed: [WYSI-01, WYSI-02]

duration: 15min
completed: 2026-04-08
---

# Phase 3 Plan 02: Drag-Handles (Spacing + Bild-Resize) + Stabile Override-Keys Summary

**Stabile data-override-key Attribute in updateLiedblatt(), overrideKey in engine.js block.data, Spacing- und Bild-Resize-Handles in domRenderer und Pointer-Event-Delegation mit setPointerCapture in previewPageBreaks**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-08T09:07:00Z
- **Completed:** 2026-04-08T09:22:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `data-override-key = '{objekt.id}:{index}'` auf `content` und `selected`-DOM-Element in `updateLiedblatt()` — loest stabiles Key-Problem aus Plan 01
- `engine.js`: `overrideKey` in image-block data (+ `widthFraction`), in text-block flags via `currentItemOverrideKey`, und `spacing-override-marker` Block nach Items mit gesetztem spacingOverride
- `domRenderer.js`: `_createSpacingHandle()` fuer `spacing-override-marker` Block-Typ — horizontaler blauer Balken mit ns-resize Cursor
- `domRenderer.js`: `image-resize-handle` div an Unterkante jedes Bild-Blocks mit s-resize Cursor
- `previewPageBreaks.js`: `initDragHandles(container)` mit `_dragHandlesInitialized`-Flag-Guard — Pointer-Event-Delegation fuer `.spacing-handle` und `.image-resize-handle`
- `previewPageBreaks.js`: `setPointerCapture` auf beiden Handle-Typen, 150ms Debounce in `_scheduleRelayout`
- `style.css`: Hover-Effekte fuer Handles, `user-select: none` auf `.preview-page`

## Task Commits

1. **Task 1: Stabile Override-Keys + overrideKey in engine.js block.data** - `2a17147` (feat)
2. **Task 2: Spacing-/Bild-Handles + Event-Delegation** - `6b31ce7` (feat)

## Files Created/Modified

- `frontend/js/liedblattManagement.js` — `overrideKey = '{objekt.id}:{index}'` auf content + selected in updateLiedblatt()
- `frontend/js/layout/engine.js` — overrideKey in image-block data, text-block flags, spacing-override-marker nach Items
- `frontend/js/layout/domRenderer.js` — _createSpacingHandle(), image-resize-handle in _createImageElement, spacing-override-marker Case
- `frontend/js/previewPageBreaks.js` — import setSpacingOverride/setImageSizeOverride, initDragHandles(), _onPointerDown/Move/Up, _scheduleRelayout()
- `frontend/css/style.css` — .spacing-handle:hover, .image-resize-handle:hover, .preview-page user-select:none

## Decisions Made

- **CSS-Datei:** style.css (bestaetigt, dashboard.css existiert nicht)
- **spacing-override-marker nur bei aktivem Override:** Handle erscheint nur wenn `spacingOverrides[key]` gesetzt — kein visuelles Rauschen bei leeren Overrides
- **image overflow:visible:** Resize-Handle ragt 5px unter Block-Kante heraus — erfordert `overflow: visible` am Container-div

## Deviations from Plan

None — Plan exakt wie beschrieben umgesetzt.

## Known Stubs

- `_dragHandlesInitialized` Flag liegt auf dem Container-Objekt. Nach hartem `container.innerHTML = ''` Re-Render (renderToDOM) bleibt der Container selbst im DOM — Flag bleibt erhalten. Wenn der Container selbst ersetzt wird (z.B. via outerHTML), muss das Flag neu gesetzt werden. Aktuell kein Problem (Container wird nie ersetzt).
- `spacing-override-marker` erscheint nur wenn `spacingOverride` explizit gesetzt — ein Spacing-Handle zum "erstmaligen Setzen" eines Overrides ist noch nicht vorhanden. Nutzer muessen aktuell den Override anderweitig initiieren. Dieses UX-Gap ist in v1 akzeptabel (per Kontext-Entscheidung: Handles sind fuer Feintuning).

## Threat Surface Scan

Keine neuen Netzwerk-Endpunkte oder Auth-Pfade eingeführt. Alle Aenderungen sind rein client-seitig.

---
## Self-Check: PASSED

- liedblattManagement.js data-override-key: FOUND (Zeile 336, 338)
- engine.js overrideKey in block.data: FOUND (Zeilen 296, 353, 413)
- domRenderer.js spacing-handle: FOUND (Zeile 259)
- domRenderer.js image-resize-handle: FOUND (Zeile 177)
- previewPageBreaks.js initDragHandles: FOUND
- previewPageBreaks.js _dragHandlesInitialized: FOUND (Zeilen 114-115)
- Commits 2a17147, 6b31ce7: beide vorhanden
- SUMMARY.md: wird gerade erstellt

*Phase: 03-wysiwyg-controls-element-reihenfolge*
*Completed: 2026-04-08*
