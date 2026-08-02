# Phase 3: WYSIWYG Controls & Element-Reihenfolge - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Nutzer können Abstände, Bildgrößen und Schriftgrößen direkt im Editor steuern und Lied-Elemente frei anordnen. Die Layout-Engine aus Phase 2 liefert die Grundlage — diese Phase fügt interaktive Controls und Element-Management hinzu.

</domain>

<decisions>
## Implementation Decisions

### Spacing & Bildgrößen-Controls
- Abstände: Drag-Handle zwischen Elementen in der Vorschau — visueller Balken den man hoch/runter zieht
- Spacing-Overrides pro Element gespeichert: `spacingOverrides[elementId] = { after: 20 }`, wird in Session/Vorlage serialisiert
- Bildgrößen: Drag-Handle an der Unterkante des Bildes — horizontale Größe per Ziehen, Seitenverhältnis bleibt
- Bildgröße pro Instanz im Liedblatt (nicht global pro Objekt)

### Schriftgrößen & Format-Switch
- Schriftgröße: Dropdown mit Presets (8, 10, 12, 14, 16, 18, 20, 24pt) + freie Eingabe
- Schriftgröße global als Default + Override pro Element möglich
- Format-Switch: Dropdown in der Toolbar (A5, A4, A3, DIN-Lang) mit sofortigem Re-Layout
- Format-Wechsel: Spacing-Overrides bleiben erhalten, nur Seitenlayout ändert sich

### Element-Reihenfolge
- Drag-and-Drop innerhalb der Strophen-/Refrain-Liste eines Liedes
- Reihenfolge-Änderung im Seitenpanel bei Klick auf ein Lied
- Reihenfolge pro Liedblatt gespeichert (nicht global)
- Refrain kann dupliziert werden (mehrfach einfügbar, z.B. nach jeder Strophe)

### Strophenauswahl (Nutzer-Spezifikation)
- Checkbox-Selektion: Nutzer kann wählen welche Strophen gedruckt werden (z.B. nur 1, 2, 4)
- Refrain als Verweis: Option den Refrain als reinen Text-Verweis "Refrain" einzufügen statt vollem Abdruck
- Beides pro Liedblatt-Instanz gespeichert

### Claude's Discretion
- CSS-Styling der Drag-Handles (Farbe, Cursor, Hover-Effekte)
- Drag-Bibliothek: interact.js vs. Custom-Handler
- Animations/Transitions bei Layout-Updates
- Keyboard-Accessibility für Drag-Handles
- Seitenpanel-Layout für Element-Reihenfolge

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/js/layout/engine.js` — calculateLayout nimmt items + config, gibt LayoutResult zurück
- `frontend/js/layout/domRenderer.js` — renderToDOM rendert seitenweise Vorschau
- `frontend/js/layout/constants.js` — SPACING, FONT, PAGE_SIZES
- `frontend/js/liedblattManagement.js` — addToSelected(), createLiedOptions() — hier liegt die aktuelle Strophen-/Refrain-Logik
- `frontend/js/dragAndDrop.js` — existierendes DnD für Liedblatt-Elemente
- `frontend/js/script.js` — globalConfig, Format-Auswahl

### Established Patterns
- DOM-basierter State in #selected-items Container
- data-Attribute auf DOM-Elementen für Element-Konfiguration
- ES6 Module Imports
- Debounced Preview-Updates (150ms aus Phase 2)

### Integration Points
- calculateLayout muss spacingOverrides + imageSizeOverrides + fontSizeOverrides akzeptieren
- domRenderer muss Drag-Handles zwischen Elementen und an Bildern rendern
- Session-Serialisierung muss neue Overrides speichern/laden
- Strophenauswahl muss in createLiedOptions() integriert werden

</code_context>

<specifics>
## Specific Ideas

- Strophenauswahl per Checkboxen im Seitenpanel: alle Strophen gelistet, Häkchen für aktive
- Refrain-Verweis: Toggle "Vollständig" / "Nur Verweis" — bei "Nur Verweis" wird nur "Refrain" als Text gedruckt
- Drag-Handles in der Vorschau sollen dezent sein — nicht die Seiten-Ästhetik stören
- Sofortiges Re-Layout bei jeder Änderung (Debounce 150ms aus Phase 2)

</specifics>

<deferred>
## Deferred Ideas

- Intra-Element-Umbrüche (Phase 4)
- Undo/Redo für Layout-Änderungen (v2)

</deferred>
