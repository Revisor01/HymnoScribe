# Phase 3: WYSIWYG Controls & Element-Reihenfolge - Research

**Researched:** 2026-04-08
**Domain:** Browser-native Drag-Interaction, Override-State-Management, DOM-Preview-Erweiterung, Session-Serialisierung
**Confidence:** HIGH — basiert auf direkter Codebase-Analyse aller betroffenen Dateien

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Abstände: Drag-Handle zwischen Elementen in der Vorschau — visueller Balken den man hoch/runter zieht
- Spacing-Overrides pro Element gespeichert: `spacingOverrides[elementId] = { after: 20 }`, wird in Session/Vorlage serialisiert
- Bildgrößen: Drag-Handle an der Unterkante des Bildes — horizontale Größe per Ziehen, Seitenverhältnis bleibt
- Bildgröße pro Instanz im Liedblatt (nicht global pro Objekt)
- Schriftgröße: Dropdown mit Presets (8, 10, 12, 14, 16, 18, 20, 24pt) + freie Eingabe
- Schriftgröße global als Default + Override pro Element möglich
- Format-Switch: Dropdown in der Toolbar (A5, A4, A3, DIN-Lang) mit sofortigem Re-Layout
- Format-Wechsel: Spacing-Overrides bleiben erhalten, nur Seitenlayout ändert sich
- Drag-and-Drop innerhalb der Strophen-/Refrain-Liste eines Liedes
- Reihenfolge-Änderung im Seitenpanel bei Klick auf ein Lied
- Reihenfolge pro Liedblatt gespeichert (nicht global)
- Refrain kann dupliziert werden (mehrfach einfügbar, z.B. nach jeder Strophe)
- Strophenauswahl per Checkboxen: Nutzer wählt welche Strophen gedruckt werden (z.B. nur 1, 2, 4)
- Refrain als Verweis: Toggle "Vollständig" / "Nur Verweis" — bei "Nur Verweis" wird nur "Refrain" als Text gedruckt
- Beides pro Liedblatt-Instanz gespeichert

### Claude's Discretion

- CSS-Styling der Drag-Handles (Farbe, Cursor, Hover-Effekte)
- Drag-Bibliothek: interact.js vs. Custom-Handler
- Animations/Transitions bei Layout-Updates
- Keyboard-Accessibility für Drag-Handles
- Seitenpanel-Layout für Element-Reihenfolge

### Deferred Ideas (OUT OF SCOPE)

- Intra-Element-Umbrüche (Phase 4)
- Undo/Redo für Layout-Änderungen (v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Grundlage |
|----|--------------|-------------------|
| WYSI-01 | Bildgrößen frei einstellbar per Drag-Handle (nicht immer volle Seitenbreite) | engine.js akzeptiert `imageSizeOverrides[elementId]`; domRenderer muss Handle an Bildblock rendern |
| WYSI-02 | Spacing-Drag-Regler: Abstände zwischen Objekten live per Ziehen anpassbar | engine.js akzeptiert `spacingOverrides[elementId]`; Handle als horizontaler Balken zwischen Blöcken |
| WYSI-03 | Freie Schriftgrößenwahl über H1/H2/H3 hinaus | globalConfig.fontSize wird bereits in engine.js verarbeitet; neues per-Element-Override-Feld |
| WYSI-04 | Format-Live-Switch: Wechsel zwischen A5/A4/A3/DIN-Lang mit sofortigem Re-Layout | previewFormat-Select existiert in dashboard.html; triggt calculateLayout mit neuem format |
| WYSI-05 | Manuelle Seitenumbrüche setzbar und in Vorschau sichtbar | addPageBreak() existiert; engine.js erkennt .page-break; domRenderer muss sichtbaren Marker rendern |
| ELEM-01 | Refrain kann als erstes Element eines Liedes gesetzt werden | createLiedOptions() generiert aktuell Strophe-dann-Refrain-Folge; benötigt freie Reihenfolge der Elemente |
| ELEM-02 | Flexible Reihenfolge aller Elemente innerhalb eines Liedes | Neues Seitenpanel mit DnD-Liste der Strophen/Refrain-Elemente eines Liedes |
</phase_requirements>

---

## Summary

Phase 3 baut auf der in Phase 2 erstellten Layout-Engine auf. Die Engine ist bereits vorhanden und funktioniert — `calculateLayout(items, config, fonts)` gibt `LayoutResult` zurück, `renderToDOM()` zeichnet seitenweise Vorschau. Die Aufgabe dieser Phase ist es, die Engine mit Override-Parametern zu erweitern und den DOM-Renderer mit interaktiven Controls (Drag-Handles) anzureichern.

Die drei technisch unabhängigen Bereiche sind: (1) Override-State-Management — ein neues Objekt `overrides` das spacingOverrides, imageSizeOverrides und fontSizeOverrides zusammenfasst und per Session serialisiert wird; (2) Drag-Interaktion — browser-native Pointer-Events für Drag-Handles ohne externe Bibliothek empfohlen (interact.js ist wartungsarm und 2024 zuletzt veröffentlicht); (3) Element-Reihenfolge — die bestehende `createLiedOptions()`-Funktion muss um eine flexible Strophen-/Refrain-Reihenfolge per DnD erweitert werden.

Die kritischste Integrationsstelle ist die Session-Serialisierung: `saveSessionToLocalStorage()` und `saveSession()` lesen aktuell nur DOM-State (Checkboxen, Selects). Die neuen Overrides liegen nicht im DOM — sie müssen in einem separaten State-Objekt verwaltet und explizit serialisiert werden.

**Primary recommendation:** Override-State als eigenes Modul `frontend/js/layout/overrideState.js` implementieren. Engine-Signatur um optionales `overrides`-Objekt erweitern. Custom Pointer-Event-Handler statt interact.js.

---

## Standard Stack

### Core — bereits vorhanden

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| pdf-lib | 1.17.1 (CDN) | Font-Metriken in engine.js | Bleibt — constraint |
| Vanilla JS Pointer Events | Browser-nativ | Drag-Handle-Interaktion | `pointerdown`, `pointermove`, `pointerup` — deckt Mouse + Touch ab |
| DOMParser (nativ) | Browser-nativ | Quill-HTML-Parsing | Bereits in engine.js genutzt |

### Drag-Bibliothek: interact.js vs. Custom-Handler (Claude's Discretion)

**interact.js 1.10.27** [VERIFIED: npm registry, published 2024-03-28]:
- Letztes Release: März 2024 — kein aktives Maintenance-Signal
- `dist-tags.latest: 1.10.27`, `next: 1.8.3` — ungewöhnliche Tagstruktur
- Vorteil: Snapping, Inertia, touch-ready out-of-box
- Nachteil: 35KB+ Bundle, externe Abhängigkeit, Wartungsstatus unklar

**SortableJS 1.15.7** [VERIFIED: npm registry, published 2026-02-11]:
- Aktiv gewartet (letzte Version Februar 2026)
- Für die Element-Reihenfolge im Seitenpanel gut geeignet
- Nicht für Resize-Handles gedacht

**Custom Pointer-Event-Handler** [ASSUMED — kein offizieller Benchmark]:
- `pointerdown/pointermove/pointerup` funktioniert für lineare Drag-Handles (1D-Bewegung)
- Spacing-Handle: nur Y-Achse; Bild-Handle: nur Y-Achse (Höhe via Seitenverhältnis)
- ~30-50 LOC pro Handle-Typ — vertretbar für 2 Handle-Typen

**Empfehlung (Claude's Discretion):** Custom Pointer-Event-Handler für Spacing- und Bild-Drag-Handles. SortableJS für das Strophen-/Refrain-Reihenfolge-Panel (da DnD-Liste mit vordefinierter Ordnung, nicht freie Positionierung). Keine interact.js-Abhängigkeit.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SortableJS | 1.15.7 | DnD-Liste für Strophen/Refrain-Reihenfolge | ELEM-01, ELEM-02 — wenn mehr als 2-3 sortierbare Items |

**Installation (nur wenn SortableJS genutzt wird):**
```bash
# Im Browser via CDN — kein npm-Build im Projekt
# <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/Sortable.min.js"></script>
```

---

## Architecture Patterns

### Empfohlene Override-Datenstruktur

```javascript
// frontend/js/layout/overrideState.js (NEUES MODUL)

// Override-State — keyed by liedblatt-uniqueId (nicht objekt.id, da pro Instanz)
const overrides = {
    spacingOverrides: {},     // { 'liedblatt-item-0-1234': { after: 20 } }
    imageSizeOverrides: {},   // { 'liedblatt-item-0-1234': { widthFraction: 0.7 } }
    fontSizeOverrides: {}     // { 'liedblatt-item-0-1234': { fontSize: 10 } }
};

export function getOverrides() { return overrides; }
export function setSpacingOverride(id, afterPt) { ... }
export function setImageSizeOverride(id, widthFraction) { ... }
export function setFontSizeOverride(id, fontSizePt) { ... }
export function serializeOverrides() { return JSON.stringify(overrides); }
export function deserializeOverrides(json) { Object.assign(overrides, JSON.parse(json)); }
```

**Wichtig:** `uniqueId` in `updateLiedblatt()` wird aktuell als `liedblatt-item-${index}-${Date.now()}` generiert — das bedeutet, die ID ändert sich bei jedem `updateLiedblatt()`-Aufruf! Das Override-System muss entweder stabile IDs verwenden (z.B. Index-basiert) oder den `data-original-id` (objekt.id) kombiniert mit der Position nutzen. [VERIFIED: liedblattManagement.js Zeile 282]

### Engine-Signatur-Erweiterung

```javascript
// engine.js — calculateLayout-Signatur erweitern
export async function calculateLayout(items, config, fonts, overrides = {}) {
    const { spacingOverrides = {}, imageSizeOverrides = {}, fontSizeOverrides = {} } = overrides;
    // ...
    // Bei jedem Item: overrides[item.dataset.liedblattId] prüfen
}
```

Da engine.js aktuell HTMLElement-Arrays akzeptiert und `data-liedblatt-id` als Attribut liest, kann `item.dataset.liedblattId` als Override-Key genutzt werden. [VERIFIED: engine.js direkte Analyse]

### Drag-Handle in domRenderer.js

```javascript
// Nach jedem Block in domRenderer.js: Handle-Element einfügen
function _createSpacingHandle(blockId, spacingPt, onDrag) {
    const handle = document.createElement('div');
    handle.className = 'spacing-handle';
    handle.dataset.blockId = blockId;
    handle.style.position = 'absolute';
    handle.style.height = '8px';
    handle.style.cursor = 'ns-resize';
    handle.style.background = 'transparent';
    // Pointer-Events für Drag
    handle.addEventListener('pointerdown', onDrag);
    return handle;
}
```

**Problem:** domRenderer.js leert aktuell den Container vollständig bei jedem Re-Render (`container.innerHTML = ''`). Drag-Handles werden bei jedem Re-Layout zerstört und neu erzeugt. Das ist korrekt — Handles greifen via Closure auf `overrideState.js` zu, nicht auf DOM-State.

### Bild-Resize-Handle

```javascript
// Bild-Drag-Handle: absolut positioniert an Unterkante des Bild-Blocks
function _createImageResizeHandle(blockId, aspectRatio) {
    const handle = document.createElement('div');
    handle.className = 'image-resize-handle';
    handle.dataset.blockId = blockId;
    handle.dataset.aspectRatio = aspectRatio;
    handle.style.position = 'absolute';
    handle.style.bottom = '0';
    handle.style.left = '50%';
    handle.style.width = '40px';
    handle.style.height = '6px';
    handle.style.cursor = 's-resize';
    handle.style.transform = 'translateX(-50%)';
    // ...
    return handle;
}
```

Beim Drag: `deltaY` ermitteln → neue Bildhöhe = `originalHeight + deltaY` → neue Breite = `newHeight / aspectRatio` → `imageSizeOverrides[blockId] = { widthFraction: newWidth / pageWidth }`.

### Strophen/Refrain-Reihenfolge im Seitenpanel

Die bestehende `createLiedOptions()`-Funktion (liedblattManagement.js) baut aktuell eine statische Liste: Strophe 1 + RefrainSelect, Strophe 2 + RefrainSelect etc. [VERIFIED: liedblattManagement.js Zeile 208-266]

Für ELEM-01 und ELEM-02 muss dieses Muster zu einer sortierbaren Liste umgebaut werden, bei der jede Zeile ein eigenständiges Element ist:
- Strophe N (mit Nummer und Text-Preview)
- Refrain (duplizierbares Element — kann mehrfach in der Liste vorkommen)

Die Reihenfolge dieser Liste bestimmt die Render-Reihenfolge in `updateLiedblatt()`. Die Liste wird in `objekt.elementOrder = ['strophe-0', 'refrain', 'strophe-1', 'refrain', 'strophe-2']` serialisiert.

### Session-Serialisierung der Overrides

Aktuell serialisiert `saveSessionToLocalStorage()` nur DOM-State aus `.selected-item`-Elementen. Overrides liegen nicht im DOM. Erweiterung:

```javascript
// sessionManagement.js — saveSessionToLocalStorage erweitern
import { serializeOverrides } from './layout/overrideState.js';

// In sessionData ergänzen:
const sessionPayload = {
    items: sessionData,         // bisherig
    overrides: serializeOverrides()  // NEU
};
localStorage.setItem('lastSession', JSON.stringify(sessionPayload));
```

**Breaking Change:** Das neue Format `{ items, overrides }` ist inkompatibel mit dem alten Array-Format. `applySessionData()` muss migrationssicher sein (backward-compatible: wenn `sessionPayload` ein Array ist, ist es altes Format).

### Format-Switch (WYSI-04)

Das Format-Dropdown `#previewFormat` existiert bereits in `dashboard.html` (Zeile 197). `initPreviewFormatSelector()` aus `previewPageBreaks.js` initialiert es. [VERIFIED: dashboard.html Zeile 196-204]

Mit Phase 2 wird `previewPageBreaks.js` durch `domRenderer.js` ersetzt. Der Format-Switch muss dann `calculateLayout + renderToDOM` mit neuem `format` triggern. Overrides bleiben erhalten (spacingOverrides sind format-agnostisch in pt gespeichert).

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Verwenden | Warum |
|---------|-------------------|-----------|-------|
| Sortierbare Liste (Strophen/Refrain) | Eigenes DnD mit dragstart/drop | SortableJS 1.15.7 | Touch-Support, Accessibility, Autoscroll — Edge Cases kosten Wochen |
| Aspect-Ratio-Berechnung bei Bild-Resize | Eigene Math | `aspectRatio = naturalHeight / naturalWidth` | Trivial, aber naturalWidth/Height=0 wenn Bild noch nicht geladen — `load`-Event abwarten |
| Debounced Re-Layout nach Drag | Eigener Throttle | 150ms setTimeout (bereits in Phase 2 etabliert) | Konsistent mit bestehendem Debounce-Pattern |

**Key insight:** Das komplexeste Custom-Code-Stück dieser Phase ist der Pointer-Event-Handler für Spacing-Handles. Er ist 1D (nur Y-Achse) und hat keine Snap-Requirements — ein Custom-Handler ist hier angemessen.

---

## Common Pitfalls

### Pitfall 1: Instabile uniqueIds brechen Override-Mapping

**Was schiefgeht:** `uniqueId = 'liedblatt-item-${index}-${Date.now()}'` — die ID enthält einen Timestamp und ändert sich bei jedem `updateLiedblatt()`-Aufruf. Overrides, die gegen diese IDs gemappt sind, werden bei jedem Re-Render ungültig.
**Warum es passiert:** Die ID wurde ursprünglich für DOM-Referenzen gedacht, nicht als stabiler Schlüssel.
**Wie vermeiden:** Overrides gegen `data-original-id` (objekt.id) + Positions-Index mappen: `overrideKey = '${objekt.id}:${positionIndex}'`. Oder: uniqueId stabilisieren — einmal setzen, nicht bei jedem Re-Render neu generieren (uniqueId in `data-object` serialisieren).
**Warnsignal:** Overrides "verschwinden" nach jeder Interaktion.

### Pitfall 2: domRenderer leert Container — Drag-Events auf Handle-Elementen sterben

**Was schiefgeht:** `container.innerHTML = ''` bei jedem Re-Layout zerstört alle Handle-DOM-Elemente, inkl. laufender Pointer-Event-Listener.
**Warum es passiert:** domRenderer.js ist zustandslos und rebuild-only (Zeile 29).
**Wie vermeiden:** Drag-Handler darf nie "per-Element-Listener auf Handle" sein. Stattdessen: Event-Delegation auf Container-Ebene (`container.addEventListener('pointerdown', handler)`) mit `event.target.closest('.spacing-handle')`-Check. Container lebt weiter, Handles werden neu gerendert, aber der Handler registriert sich nur einmal.
**Warnsignal:** `pointerdown` feuert, `pointermove` nicht (weil Handle bereits zerstört).

### Pitfall 3: Bild naturalWidth/Height = 0 beim ersten Render

**Was schiefgeht:** engine.js nutzt `imgEl.naturalHeight / imgEl.naturalWidth` für Seitenverhältnis. Wenn das Bild noch nicht geladen ist, ist das Ergebnis `0/0 = NaN` oder Infinity.
**Warum es passiert:** Bilder werden asynchron geladen — `img.src = '...'` triggert einen Netzwerk-Request, `naturalWidth` ist erst nach dem `load`-Event verfügbar. [VERIFIED: engine.js Zeile 257-262, hat bereits `150` Fallback]
**Wie vermeiden:** Image-Resize-Handle erst nach `img.onload` einblenden. `naturalWidth` im Override cachen: `imageSizeOverrides[id].naturalWidth`.
**Warnsignal:** Bild-Handle-Resize verändert Seitenverhältnis zufällig.

### Pitfall 4: Refrain-Duplikation — Serialisierungs-Clash mit altem Format

**Was schiefgeht:** Aktuell wird Refrain-Verhalten per `refrainOptions[stropheIndex]` gespeichert (Array parallel zu Strophen). Wenn der Refrain an beliebige Positionen verschoben und dupliziert werden kann, passt das Array-Model nicht mehr.
**Warum es passiert:** Das alte Model war: "Pro Strophe einen Refrain-Typ wählen." Das neue Model ist: "Freie Folge von Elementen."
**Wie vermeiden:** Neues `elementOrder`-Feld pro Lied einführen: `['strophe-0', 'refrain', 'strophe-1', 'refrain', 'strophe-2']`. Backward-compat: wenn `elementOrder` fehlt, altes Rendering-Verhalten beibehalten.
**Warnsignal:** Sessions aus Phase 2 rendern nach Migration falsch.

### Pitfall 5: Font-Size-Override beeinflusst Layout-Engine-Höhenberechnung

**Was schiefgeht:** Wenn per-Element font-size-Override gesetzt ist, muss die Layout-Engine mit diesem Font-Size rechnen, nicht mit `globalConfig.fontSize`. Sonst stimmt die berechnete Höhe nicht mit dem Render überein.
**Warum es passiert:** engine.js nutzt aktuell `config.fontSize` für alle Elemente einheitlich.
**Wie vermeiden:** In `pushTextBlock()` in engine.js den `fontSizeOverrides[elementId]`-Wert bevorzugen falls gesetzt. Override muss bereits beim Item-Traversal verfügbar sein.
**Warnsignal:** Text-Überlauf in der Vorschau trotz Override.

---

## Code Examples

Verifizierte Patterns aus der Codebase:

### Bestehende Override-Keying-Struktur (session.js)

```javascript
// Source: sessionManagement.js Zeile 26-33
objekt.selectedStrophen = Array.from(
    liedOptions.querySelectorAll('.strophen-container input:checked')
).map(cb => parseInt(cb.value));
objekt.refrainOptions = Array.from(
    liedOptions.querySelectorAll('.strophe-option')
).map(stropheOption => {
    const refrainSelect = stropheOption.querySelector('select');
    return refrainSelect ? refrainSelect.value : 'none';
});
```

Das neue `elementOrder`-Feld folgt demselben Muster: Array auf `objekt` serialisiert, parallel zu bestehendem State.

### Custom Pointer-Event-Handler Pattern (vanilla JS)

```javascript
// Source: [ASSUMED — Standard Vanilla JS Pattern]
// Spacing-Handle Drag (1D, Y-Achse)
let dragState = null;

container.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.spacing-handle');
    if (!handle) return;
    dragState = {
        blockId: handle.dataset.blockId,
        startY: e.clientY,
        startSpacing: getSpacingOverride(handle.dataset.blockId)
    };
    e.target.setPointerCapture(e.pointerId); // Wichtig: Capture verhindert Verlust bei schnellem Drag
});

container.addEventListener('pointermove', (e) => {
    if (!dragState) return;
    const deltaY = e.clientY - dragState.startY;
    const newSpacing = Math.max(0, dragState.startSpacing + deltaToPt(deltaY));
    setSpacingOverride(dragState.blockId, newSpacing);
    scheduleDebouncedRelayout(150);
});

container.addEventListener('pointerup', () => { dragState = null; });
```

**setPointerCapture** ist entscheidend: ohne es verliert das Element den Pointer bei schneller Mausbewegung (Pointer verlässt das Handle-Element). [CITED: MDN Web Docs — Element.setPointerCapture()]

### Bild-Aspectratio-Berechnung mit Load-Guard

```javascript
// Source: engine.js Zeile 255-262 (bestehender Code mit Fallback)
const imgEl = item.querySelector('img');
if (imgEl) {
    const imgHeight = (imgEl.naturalHeight && imgEl.naturalWidth)
        ? (imgEl.naturalHeight / imgEl.naturalWidth) * contentWidth
        : 150; // Fallback falls naturalWidth/Height noch 0
```

Beim Override: `widthFraction` in pt umrechnen:
```javascript
// [ASSUMED — abgeleitet aus engine.js-Muster]
const overriddenWidth = (imageSizeOverrides[itemId]?.widthFraction ?? 1.0) * contentWidth;
const overriddenHeight = overriddenWidth * (naturalHeight / naturalWidth);
```

---

## State of the Art

| Altes Verhalten | Neues Verhalten | Phase | Impact |
|----------------|-----------------|-------|--------|
| Spacing fix (SPACING.OBJECT_DEFAULT = 15pt) | Spacing per Drag-Handle überschreibbar | Phase 3 | Overrides in Session serialisiert |
| Bilder immer volle Seitenbreite | Bild-Breite per Handle einstellbar (widthFraction) | Phase 3 | Per-Instanz, nicht global |
| Schriftgröße nur global | Globaler Default + per-Element-Override | Phase 3 | fontSizeOverrides |
| Refrain-Reihenfolge: immer nach Strophe | Freie Element-Reihenfolge per DnD | Phase 3 | elementOrder-Array |
| Format-Wechsel: neues calculateLayout | Format-Wechsel: Overrides bleiben erhalten | Phase 3 | Overrides format-agnostisch in pt |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Custom Pointer-Event-Handler ist für 1D-Drag-Handles ausreichend (keine externe Bibliothek nötig) | Standard Stack / Drag-Bibliothek | Wenn Touch-Inertia oder komplexes Snapping gewünscht: interact.js notwendig. Aber CONTEXT.md deferred das. |
| A2 | Override-Keys basieren auf stabilisierter uniqueId oder positionalem Key — muss vor Implementierung entschieden werden | Architecture / Override-Mapping | Falsches Keying-Schema macht alle Overrides nach Re-Layout ungültig |
| A3 | SortableJS 1.15.7 ist via CDN nutzbar ohne Build-Step | Standard Stack | Projekt hat keinen npm-Build für Frontend — CDN-only ist Constraint |
| A4 | `elementOrder`-Feld ist rückwärtskompatibel mit bestehenden Sessions (fehlendes Feld = altes Verhalten) | Common Pitfalls #4 | Ohne Backward-Compat brechen alle gespeicherten Sessions |

---

## Open Questions

1. **Stabile Override-Keys: welches Keying-Schema?**
   - Was wir wissen: `uniqueId` ist aktuell instabil (Timestamp-Suffix), `objekt.id` ist stabil aber nicht pro-Instanz-eindeutig
   - Was unklar ist: Soll ein Element zweimal im Liedblatt erscheinen können (dasselbe Objekt, zwei Instanzen mit unterschiedlichen Overrides)?
   - Empfehlung: `uniqueId` einmal generieren und in `data-object` mitserialisiern — dann beim Laden aus Session wiederherstellen. Stabiler Key = serialisierte uniqueId.

2. **Phase 2 Completion Status: Ist die Layout-Engine bereits live?**
   - Was wir wissen: engine.js, domRenderer.js, constants.js, pdfRenderer.js existieren als Dateien
   - Was unklar: Ob `previewPageBreaks.js` bereits vollständig durch domRenderer.js ersetzt ist, oder ob noch beide parallel laufen
   - Empfehlung: Zu Beginn von Phase 3 prüfen welche Render-Engine aktiv ist (import in script.js checken)

3. **SortableJS via CDN oder Custom DnD für Strophen-Liste?**
   - Was wir wissen: Projekt nutzt CDN-only für alle Libraries (kein webpack/rollup)
   - Was unklar: Ob SortableJS-CDN-Einbindung mit bestehender CSP kompatibel ist
   - Empfehlung: Ohne CSP-Analyse → HTML5 `draggable`-API als Fallback bereithalten

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 ist eine reine Frontend-Code-Änderung ohne externe Tool-Dependencies. Keine neuen Backend-Endpunkte, keine neuen CLI-Tools, keine Datenbankmigrationen.

---

## Validation Architecture

Test-Framework: Kein automatisches Test-Framework im Projekt vorhanden [VERIFIED: .planning/codebase/TESTING.md — kein Framework detektiert]. Phase 3 nutzt manuelle Verifikation.

### Phase Requirements — Manuelle Test-Map

| Req ID | Verhalten | Test-Typ | Verifikationsschritt |
|--------|-----------|----------|---------------------|
| WYSI-01 | Bild-Handle erscheint, Drag ändert Bildbreite, Seitenverhältnis bleibt | Manuell | Bild einfügen, Handle-Drag, in PDF exportieren — Größe identisch |
| WYSI-02 | Spacing-Handle zwischen Elementen, Drag ändert Abstand live | Manuell | Zwei Objekte, Handle ziehen, Debounce 150ms prüfen, Session speichern/laden |
| WYSI-03 | Font-Size-Dropdown mit Presets + freie Eingabe, Override pro Element | Manuell | Global-Default setzen, einzelnes Element überschreiben, Re-Layout prüfen |
| WYSI-04 | Format-Switch A5↔DIN-Lang, Overrides bleiben erhalten | Manuell | Override setzen, Format wechseln, Override prüfen |
| WYSI-05 | Manueller Seitenumbruch sichtbar in Vorschau | Manuell | addPageBreak() aufrufen, in domRenderer-Vorschau prüfen |
| ELEM-01 | Refrain als erstes Element einer Lied-Liste setzbar | Manuell | Refrain-Element an Listenposition 0 ziehen, Preview prüfen |
| ELEM-02 | Drag-Reihenfolge im Strophen/Refrain-Panel ändert Render-Reihenfolge | Manuell | Strophe 2 vor Strophe 1 ziehen, Preview-Reihenfolge prüfen |

### Wave 0 Gaps

Kein Test-Framework zu installieren — alle Tests sind manuell durch domRenderer-Vorschau verifikation. Kein Wave-0-Setup erforderlich.

---

## Security Domain

Diese Phase fügt keine neuen API-Endpunkte, keine neuen Datenbankoperationen und keine neuen File-Uploads hinzu. Alle Änderungen sind rein clientseitig (Frontend JS, DOM-Manipulation).

**Relevante ASVS-Kategorien für Phase 3:**

| ASVS Kategorie | Anwendbar | Begründung |
|----------------|----------|------------|
| V5 Input Validation | NIEDRIG | Override-Werte (spacing in pt, widthFraction) müssen min/max-geclampt werden (Negativ-Werte, NaN-Guards), aber kein Server-Side-Input |
| V2-V4 Authentication/Session | NEIN | Keine neuen Auth-Flows |
| V6 Cryptography | NEIN | Keine kryptographischen Operationen |

**Override-Werte-Validierung (Pitfall-Prevention):**
```javascript
// Clamp-Pattern für Overrides
const spacingPt = Math.max(0, Math.min(100, parseFloat(rawValue) || 0));
const widthFraction = Math.max(0.1, Math.min(1.0, parseFloat(rawValue) || 1.0));
```

---

## Sources

### Primary (HIGH confidence)
- Direkte Codebase-Analyse: `engine.js` — calculateLayout-Signatur, Override-Integrationspunkte
- Direkte Codebase-Analyse: `domRenderer.js` — container.innerHTML='', Block-Rendering-Struktur
- Direkte Codebase-Analyse: `liedblattManagement.js` — createLiedOptions(), uniqueId-Generierung, Refrain-Logik
- Direkte Codebase-Analyse: `sessionManagement.js` — saveSessionToLocalStorage(), applySessionData()
- Direkte Codebase-Analyse: `constants.js` — SPACING, MARGINS, PAGE_SIZES
- Direkte Codebase-Analyse: `dashboard.html` — previewFormat-Select, vorhandene Toolbar-Struktur

### Secondary (MEDIUM confidence)
- npm registry: interactjs@1.10.27, published 2024-03-28 [VERIFIED]
- npm registry: sortablejs@1.15.7, published 2026-02-11 [VERIFIED]
- MDN Web Docs: Element.setPointerCapture() — Standard-API für Drag-Interaktion [CITED]

### Tertiary (LOW confidence)
- Pointer-Event-Handler Pattern: [ASSUMED — Standard Vanilla JS, nicht projektspezifisch verifiziert]
- Override-Keying-Schema: [ASSUMED — Best Practice Empfehlung, projektspezifische Entscheidung ausstehend]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Libraries direkt verifiziert (npm registry + Codebase)
- Architecture: HIGH — alle Integrationspunkte direkt aus Quellcode verifiziert
- Pitfalls: HIGH — direkt aus Codebase-Analyse identifiziert (uniqueId-Instabilität, container.innerHTML-Reset)
- Override-State-Design: MEDIUM — Pattern-Empfehlung, konkrete Implementierung noch offen (Key-Schema)

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stabiler Stack — SortableJS, interact.js ändern sich selten)
