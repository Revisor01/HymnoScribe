---
phase: 03-wysiwyg-controls-element-reihenfolge
plan: "03"
subsystem: ui
tags: [element-reihenfolge, sortablejs, drag-and-drop, strophen, refrain, elementOrder, wysiwyg, vanilla-js]

requires:
  - phase: 03-wysiwyg-controls-element-reihenfolge
    plan: "01"
    provides: overrideState.js, calculateLayout() mit overrides-Parameter
  - phase: 03-wysiwyg-controls-element-reihenfolge
    plan: "02"
    provides: stabile data-override-key Attribute, Drag-Handles

provides:
  - createLiedOptions() mit SortableJS-Strophenliste und elementOrder-Serialisierung
  - updateLiedblatt() rendert Strophen/Refrain in elementOrder-Reihenfolge
  - Refrain als duplizierbares Element mit counter-basiertem Key (refrain, refrain-2, ...)
  - Refrain-Toggle Vollstaendig/Verweis pro Instanz (D-08)
  - Strophen-Checkboxen steuern welche Strophen gedruckt werden (D-07)
  - BACKWARD-COMPAT: Sessions ohne elementOrder nutzen altes selectedStrophen-Rendering

affects:
  - sessionManagement.js (muss elementOrder/elementConfig serialisieren — Plan 04)

tech-stack:
  added:
    - "SortableJS 1.15.7 (CDN: cdn.jsdelivr.net/npm/sortablejs@1.15.7/Sortable.min.js)"
  patterns:
    - "elementOrder = ['strophe-0', 'refrain', 'strophe-1'] — Array von Keys, steuert Render-Reihenfolge"
    - "elementConfig = { 'strophe-0': { active: true }, 'refrain': { mode: 'full' } } — pro-Key-Config"
    - "counter-basierter Refrain-Key: refrain, refrain-2, refrain-3 — kein Date.now()"
    - "Max 10 Refrain-Items pro Lied (T-03-03-03 DoS-Mitigierung)"
    - "Backward-Compat-Zweig: if (objekt.elementOrder) -> neu, else -> altes selectedStrophen-Rendering"

key-files:
  created: []
  modified:
    - frontend/js/liedblattManagement.js
    - frontend/dashboard.html
    - frontend/css/style.css

key-decisions:
  - "SortableJS statt eigener DnD-Impl — kleines, aktiv gewartetes Library (Feb 2026), einfache API"
  - "counter-basierter Refrain-Key statt Date.now() — stabile, vorhersagbare Keys fuer Serialisierung"
  - "elementOrder/elementConfig direkt aus DOM in updateLiedblatt() lesen — kein separater State-Store noetig"
  - "CSS in style.css (nicht dashboard.css) — dashboard.css existiert nicht im Projekt (bestaetigt)"
  - "Backward-Compat als vollstaendiger else-Zweig — kein Stub, altes selectedStrophen-Rendering 1:1 erhalten"

requirements-completed: [ELEM-01, ELEM-02]

duration: 20min
completed: 2026-04-08
---

# Phase 3 Plan 03: Element-Reihenfolge mit SortableJS Summary

**SortableJS-basierte Strophen/Refrain-Liste in createLiedOptions() mit elementOrder-Serialisierung und vollstaendigem Backward-Compat-Zweig in updateLiedblatt()**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-08T09:22:00Z
- **Completed:** 2026-04-08T09:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- SortableJS 1.15.7 per CDN in `dashboard.html` eingebunden
- `createLiedOptions()` komplett ersetzt: erzeugt sortierbare Strophen/Refrain-Liste mit `.element-order-list` Container
- Strophen-Items mit Checkbox (aktiv/inaktiv) und Drag-Handle — Reihenfolge per SortableJS frei veraenderbar
- Refrain-Items mit Radio-Toggle Vollstaendig/Verweis, Duplizieren-Button (+) und Entfernen-Button (x)
- Refrain-Duplikate erhalten counter-basierten Key (`refrain-2`, `refrain-3`, ...) — kein `Date.now()`
- DoS-Schutz: max. 10 Refrain-Items pro Lied (T-03-03-03)
- `updateLiedblatt()` liest `elementOrder`/`elementConfig` aus DOM vor dem Rendering
- Neuer Rendering-Zweig: iteriert `elementOrder`, rendert Strophen/Refrain in beliebiger Reihenfolge
- Refrain vor Strophe 1 moeglich (ELEM-01), freie Reihenfolge aller Elemente (ELEM-02)
- Vollstaendiger Backward-Compat-Zweig fuer Sessions ohne `elementOrder` — altes `selectedStrophen`-Rendering 1:1 erhalten
- CSS-Klassen fuer `.element-order-list`, `.sortable-item`, `.drag-handle`, `.refrain-item`, `.refrain-dup-btn`, `.refrain-remove-btn` in `style.css`

## Task Commits

1. **Task 1: createLiedOptions() SortableJS-Reihenfolge-Liste** - `9c5b625` (feat)
2. **Task 2: updateLiedblatt() auf elementOrder umstellen** - `ce58401` (feat)

## Files Created/Modified

- `frontend/js/liedblattManagement.js` — createLiedOptions() ersetzt (SortableJS-Liste), updateLiedblatt() mit elementOrder-Lese-Block und dualem Rendering-Zweig
- `frontend/dashboard.html` — SortableJS 1.15.7 CDN-Script-Tag hinzugefuegt
- `frontend/css/style.css` — CSS-Sektion "Element-Reihenfolge (Phase 03-03)" mit 10 Klassen hinzugefuegt

## Decisions Made

- **SortableJS statt eigener DnD-Impl:** Kleines, aktiv gewartetes Library — einfache `Sortable.create()` API, kein Framework-Overhead
- **counter-basierter Refrain-Key:** `refrain-N` statt `Date.now()` — stabile, vorhersagbare Keys fuer spaetere Serialisierung in sessionManagement.js (Plan 04)
- **DOM als State-Source:** `elementOrder`/`elementConfig` direkt aus dem sortable-DOM in `updateLiedblatt()` lesen — kein separater State-Store, kein zusaetzliches Modul noetig
- **CSS in style.css:** `dashboard.css` existiert nicht im Projekt (bestaetigt aus Plan 01 und 02)

## Deviations from Plan

None — Plan exakt wie beschrieben umgesetzt.

## Known Stubs

- `elementOrder`/`elementConfig` werden noch nicht in `sessionManagement.js` serialisiert — Plan 04 integriert `serializeOverrides` und die neuen Felder. Wenn eine Session gespeichert und geladen wird, fehlt die `elementOrder` und der Backward-Compat-Zweig greift (funktional korrekt, aber Reihenfolge-Aenderungen gehen verloren).

## Threat Surface Scan

Keine neuen Netzwerk-Endpunkte oder Auth-Pfade eingefuehrt. Alle Aenderungen sind rein client-seitig. `objekt.refrain` wird weiterhin als `innerHTML` gesetzt (T-03-03-02, bestehendes Verhalten, kein neues Risiko).

---
## Self-Check: PASSED

- SortableJS CDN in dashboard.html: FOUND (Zeile 12)
- createLiedOptions() Sortable.create: FOUND (Zeile 415)
- elementOrder in liedblattManagement.js: FOUND (mehrfach, Zeilen 255, 268, 598)
- BACKWARD-COMPAT-Zweig: FOUND (Zeile 673)
- refrain-dup-btn: FOUND (Zeile 362)
- refrain-remove-btn: FOUND (Zeile 379)
- refrainCounter (kein Date.now): FOUND (Zeile 291, 368-369)
- Commits 9c5b625, ce58401: beide vorhanden
- SUMMARY.md: wird gerade erstellt

*Phase: 03-wysiwyg-controls-element-reihenfolge*
*Completed: 2026-04-08*
