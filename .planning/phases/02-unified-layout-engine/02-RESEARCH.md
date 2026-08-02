# Phase 2: Unified Layout Engine - Research

**Researched:** 2026-04-08
**Domain:** Browser-side layout engine, PDF rendering (pdf-lib), DOM preview rendering, font metrics, Quill HTML parsing
**Confidence:** HIGH — based on direct codebase analysis of all affected files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Kanonische Einheit: pt (PDF-Punkte). DOM-Renderer konvertiert pt→px (Faktor 1.333 bei 96 DPI). Kein getBoundingClientRect() in der Layout-Berechnung.
- Neue Dateien in `frontend/js/layout/`: engine.js, domRenderer.js, pdfRenderer.js, constants.js, state.js
- Texthöhen-Berechnung über pdf-lib `widthOfTextAtSize` + Zeilenhöhen-Schätzung — gleiche Metrik für beide Renderer, keine DOM-Messung
- Inline-Refactoring: generatePDF.js und previewPageBreaks.js direkt umbauen, NICHT parallel neue Dateien aufbauen. Keine Code-Duplikation — alte Logik wird ersetzt, nicht kopiert.
- Bei Divergenz gewinnt der PDF-Wert (aus generatePDF.js) — das ist was gedruckt wird
- constants.js als single source of truth in `frontend/js/layout/constants.js`
- Konstanten gruppiert nach Kategorie: FONT, SPACING, MARGINS, PAGE_SIZES als benannte Objekte
- DOM-basierte Vorschau mit HTML-Elementen und exakten pt→px-Maßen
- Seitenweise Darstellung: Die Vorschau zeigt das komplette Format als sichtbare Blätter (weißes Rechteck im korrekten Seitenverhältnis). Seitenumbrüche ergeben sich natürlich aus den Seitengrenzen. Scrollt man runter, sieht man Seite 2, 3 etc.
- Debounced Update bei jeder Änderung (150ms) — live Feedback
- Font-Manager Abstraktion: lädt Fonts einmal, stellt Metriken für Engine bereit, übergibt ArrayBuffer an pdf-lib und CSS-Fontstack an DOM
- Quill-HTML-Parsing via DOMParser — robuster als Regex, unterstützt alle Quill-Inline-Formate

### Claude's Discretion

- Internes API-Design der Layout-Engine (Funktionssignaturen, Datenstrukturen)
- Reihenfolge der Inline-Refactoring-Schritte
- Debounce-Implementierung (requestAnimationFrame vs setTimeout)
- Error-Handling bei fehlenden Fonts oder korrupten Bildern

### Deferred Ideas (OUT OF SCOPE)

- Spacing-Drag-Regler (Phase 3)
- Bildgrößen-Controls (Phase 3)
- Freie Schriftgrößenwahl (Phase 3)
- Intra-Element-Umbrüche (Phase 4)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LYOT-01 | Einheitliche Layout-Engine in pt als kanonischer Einheit erstellt | constants.js mit pt-Werten; engine.js als pure Funktion ohne DOM-Zugriff |
| LYOT-02 | DOM-Renderer rendert Layout-Engine-Output als WYSIWYG-Vorschau | domRenderer.js ersetzt previewPageBreaks.js; seitenweise Darstellung als absolute-positioned divs |
| LYOT-03 | PDF-Renderer rendert Layout-Engine-Output als pdf-lib PDF | pdfRenderer.js extrahiert Rendering-Logik aus generatePDF.js; selber LayoutResult-Input |
| LYOT-04 | Vorschau und PDF-Export sind pixelgenau identisch (1:1 WYSIWYG) | Einheitliche Höhenberechnung via font.widthOfTextAtSize in beiden Renderers |
| LYOT-05 | Divergierende Konstanten zusammengeführt in einer constants.js | Vollständige Konstanten-Tabelle dokumentiert; PDF-Werte gewinnen |
| LYOT-06 | window.lastCalculatedBreakPositions-Kopplung eliminiert | Beide Renderer empfangen LayoutResult direkt als Argument |
</phase_requirements>

---

## Summary

Phase 2 ist ein chirurgisches Inline-Refactoring von zwei divergierenden Systemen — `generatePDF.js` (1919 Zeilen) und `previewPageBreaks.js` (1007 Zeilen) — zu einer gemeinsamen Layout-Engine mit zwei Renderers. Das Kernproblem ist empirisch belegt: identisch benannte Konstanten haben in beiden Dateien unterschiedliche Werte, und die Höhenberechnung in der Preview nutzt `element.offsetHeight` (DOM-abhängig, DPI-sensitiv), während die PDF-Seite `font.widthOfTextAtSize` nutzt (font-metrisch, deterministisch). Das Ergebnis ist strukturelle Preview/PDF-Divergenz.

Die Layout-Engine (`engine.js`) ist eine pure Funktion: `calculateLayout(items, config) → LayoutResult`. Sie kennt weder DOM noch pdf-lib. Beide Renderer konsumieren denselben `LayoutResult` und rendern ihn in ihr jeweiliges Medium. Der `domRenderer.js` ersetzt `previewPageBreaks.js` vollständig und erzeugt seitenweise sichtbare Blätter statt Umbruch-Marker. Der `pdfRenderer.js` extrahiert die Zeichen-Logik aus `generatePDF.js`.

Die kritischste technische Entscheidung ist bereits getroffen: pt als kanonische Einheit, Höhenmessung via font-Metriken, DOMParser für Quill-HTML. Die größte verbleibende Unsicherheit betrifft die Texthöhen-Genauigkeit: pdf-lib's `widthOfTextAtSize` liefert präzise Metriken, aber die Zeilenhöhen-Schätzung für mehrzeiligen Text muss durch Testen am echten Content validiert werden.

**Primary recommendation:** Mit `constants.js` beginnen (Schritt 0), dann `engine.js` als pure Funktion (kein DOM, kein pdf-lib), dann beide Renderer darauf aufbauen. Inline, nicht parallel.

---

## Standard Stack

### Core — bereits vorhanden, keine Änderungen

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| pdf-lib | 1.17.1 (CDN) | PDF-Generierung, font.widthOfTextAtSize | Bleibt — constraint. Via CDN geladen als `PDFLib` global. |
| fontkit | 1.1.1 (CDN) | Font-Embedding in pdf-lib | Bleibt — constraint. Via CDN als `fontkit` global. |
| Quill | 2.0.2 (CDN) | Rich-Text-Editor, HTML-Output | Bereits in dashboard.html. Quill-Output ist HTML — DOMParser liest es. |
| DOMParser (nativ) | Browser-nativ | Quill-HTML parsen ohne DOM-Nebeneffekte | Kein DOM-Zugriff zur Laufzeit — in Engine-Kontext sicher nutzbar. |

### Neue Module (Inline-Refactoring-Ziele)

| Datei | Ersetzt | Verantwortung |
|-------|---------|---------------|
| `frontend/js/layout/constants.js` | Konstanten in beiden Dateien | Single source of truth |
| `frontend/js/layout/engine.js` | Höhenberechnungs-Logik beider Dateien | Pure calculateLayout-Funktion |
| `frontend/js/layout/domRenderer.js` | `previewPageBreaks.js` (komplett) | Seitenweise DOM-Preview |
| `frontend/js/layout/pdfRenderer.js` | Rendering-Kern von `generatePDF.js` | pdf-lib Zeichnung |

**Installation:** Keine neuen npm-Pakete erforderlich. Reine Dateistruktur-Änderung.

---

## Konstanten-Divergenz-Tabelle (vollständig)

Direkt aus Codebase-Analyse belegt. PDF-Wert gewinnt in allen Fällen (Constraint aus CONTEXT.md). [VERIFIED: direkte Code-Analyse]

| Konstante | generatePDF.js | previewPageBreaks.js | Gewinner (PDF) | Verwendung |
|-----------|---------------|---------------------|----------------|------------|
| `BASE_FONT_SIZE` | 14 | 14 | 14 | Skalierungsbasis |
| `HEADING_1_SCALE` | 1.6 | 1.6 | 1.6 | H1-Schriftgröße |
| `HEADING_2_SCALE` | 1.4 | 1.4 | 1.4 | H2-Schriftgröße |
| `HEADING_3_SCALE` | 1.2 | 1.2 | 1.2 | H3-Schriftgröße |
| `COPYRIGHT_FONT_SIZE` | **12** | **10** | **12** | Copyright-Text |
| `STROPHE_SPACING` | **8** | **6** | **8** | Abstand nach Strophe |
| `DEFAULT_OBJECT_SPACING` | **15** | **12** | **15** | Abstand zwischen Objekten |
| `MAX_STROPHES_BEFORE_BREAK` | 3 | 3 | 3 | Semantische Regel |
| `MAX_PSALM_LINES_BEFORE_BREAK` | 4 | 4 | 4 | Semantische Regel |
| `MIN_SPACE_FOR_NEXT_GROUP` | 50 | 50 | 50 | Mindestplatz |
| `QUILL_H1_MARGIN_TOP` | 0 | — (fehlt) | 0 | Quill H1 oben |
| `QUILL_H1_MARGIN_BOTTOM` | 12 | — (fehlt) | 12 | Quill H1 unten |
| `QUILL_H2_MARGIN_TOP` | 5 | — (fehlt) | 5 | Quill H2 oben |
| `QUILL_H2_MARGIN_BOTTOM` | 10 | — (fehlt) | 10 | Quill H2 unten |
| `QUILL_H3_MARGIN_TOP` | 5 | — (fehlt) | 5 | Quill H3 oben |
| `QUILL_H3_MARGIN_BOTTOM` | 5 | — (fehlt) | 5 | Quill H3 unten |
| `COPYRIGHT_MARGIN_TOP` | -5 | — (fehlt) | -5 | Copyright-Abstand oben |
| `COPYRIGHT_MARGIN_BOTTOM` | -5 | — (fehlt) | -5 | Copyright-Abstand unten |
| `IMAGE_MARGIN_TOP` | -10 | — (fehlt) | -10 | Abstand vor Bild |
| `IMAGE_MARGIN_BOTTOM` | 15 | — (fehlt) | 15 | Abstand nach Bild |
| `ICON_SIZE` | 20 | — (fehlt) | 20 | Icon-Größe |
| `ICON_MARGIN` | 25 | — (fehlt) | 25 | Abstand nach Icon |
| `TITLE_MARGIN_BOTTOM` | — (fehlt) | 6 | 6 (nur in Preview) | Titelabstand unten |
| `STROPHE_MARGIN_BOTTOM` | — (fehlt) | 8 | 8 (nur in Preview) | Strophenabstand unten |
| `PX_TO_PT_RATIO` | 0.75 | 0.75 | **Eliminiert** (pt kanonisch) | Umrechnungsfaktor |

**Seitengrößen** — identisch in beiden Dateien, bleiben unverändert:

```javascript
// constants.js — PAGE_SIZES (in pt)
export const PAGE_SIZES = {
    'a5':       { width: 419.53, height: 595.28 },  // mmToPt(148) x mmToPt(210)
    'dl':       { width: 280.63, height: 595.28 },  // mmToPt(99)  x mmToPt(210)
    'a4-schmal':{ width: 297.64, height: 841.89 },  // mmToPt(105) x mmToPt(297)
    'a3-schmal':{ width: 419.53, height: 1190.55 }  // mmToPt(148) x mmToPt(420)
};
export const MARGINS = { top: 30, right: 20, bottom: 20, left: 20 }; // pt
```

---

## Architecture Patterns

### Empfohlene Dateistruktur

```
frontend/js/
├── layout/
│   ├── constants.js       # Single source of truth — alle Konstanten
│   ├── engine.js          # calculateLayout(items, config) → LayoutResult
│   ├── domRenderer.js     # renderToDOM(layoutResult, container) — ersetzt previewPageBreaks.js
│   └── pdfRenderer.js     # renderToPDF(layoutResult, fonts, images) → PDFDocument
├── script.js              # bleibt — globalConfig, initializeApp
├── generatePDF.js         # nach Refactoring: thin wrapper, importiert pdfRenderer.js
├── previewPageBreaks.js   # nach Refactoring: thin wrapper oder entfernt
└── ...
```

### Pattern 1: LayoutResult — das Kernmodell

Die Layout-Engine produziert ein format-agnostisches Ergebnis. Alle Werte in pt.

```javascript
// engine.js — Ausgabetyp
// [ASSUMED] — Struktur nach Claude's Discretion, nicht vorgegeben
{
    pages: [
        {
            pageNumber: 1,
            blocks: [
                {
                    type: 'text',       // 'text' | 'image' | 'icon' | 'pagebreak'
                    x: 20,             // pt vom linken Rand
                    y: 565,            // pt von oben (DOM: top; PDF: height - y)
                    width: 379,        // pt
                    height: 18.4,      // pt — berechnet via font.widthOfTextAtSize
                    data: {
                        text: 'Kyrie eleison',
                        fontSize: 12,  // pt
                        fontStyle: 'regular', // 'regular' | 'bold' | 'italic' | 'boldItalic'
                        alignment: 'center',
                        isStrophe: true,
                        // ... weitere Metadaten
                    }
                }
            ]
        }
    ],
    totalPages: 2
}
```

### Pattern 2: pt→px Konversion im DOM-Renderer

```javascript
// domRenderer.js
// [VERIFIED: generatePDF.js Zeile 466 — pxToPt = px * 0.75 ist der Kehrwert]
const PT_TO_PX = 96 / 72; // = 1.333... (bei 96 DPI Standard)

export function ptToPx(pt) {
    return pt * PT_TO_PX;
}

// Seite als DOM-Element (sichtbares Blatt)
function createPageElement(pageConfig) {
    const el = document.createElement('div');
    el.className = 'preview-page';
    el.style.position = 'relative';
    el.style.width  = `${ptToPx(pageConfig.width)}px`;
    el.style.height = `${ptToPx(pageConfig.height)}px`;
    el.style.background = 'white';
    el.style.margin = '20px auto';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    return el;
}

// Block positionieren — y in DOM ist von oben (pt-Koordinate von oben)
function positionBlock(block, pageHeight) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left   = `${ptToPx(block.x)}px`;
    el.style.top    = `${ptToPx(block.y)}px`;  // y=0 ist Seitenanfang
    el.style.width  = `${ptToPx(block.width)}px`;
    return el;
}
```

**Koordinaten-Konvention:** Die Engine rechnet intern mit y=0 an Seitenoberkante (DOM-Koordinatensystem). Der PDF-Renderer invertiert: `pdfY = pageHeight - engineY`. [ASSUMED — Designentscheidung, nicht explizit im CONTEXT.md festgelegt]

### Pattern 3: Font-Manager Abstraktion

```javascript
// layout/fontManager.js — [ASSUMED] Struktur nach Claude's Discretion
export async function loadFonts(fontFamily) {
    // 1. TTF via /api/ttf/{fontFamily}-{Style}.ttf laden
    // 2. ArrayBuffer cachen (einmal laden, mehrfach nutzen)
    // 3. Für PDF: doc.embedFont(arrayBuffer) → PDFFont
    // 4. Für DOM: @font-face CSS injizieren (bereits via Google Fonts CDN geladen)
    return {
        arrayBuffers: { regular, bold, italic, boldItalic },  // für pdf-lib
        pdfFonts: { regular, bold, italic, boldItalic },       // PDFFont-Objekte nach Embed
        cssStack: `'${fontFamily}', sans-serif`               // für DOM-Stile
    };
}
```

**Wichtig:** Die existierende `fetchAndEmbedFont`-Funktion in `generatePDF.js` (Zeilen 1344-1415) ist gut ausgearbeitet — inkl. Fallback auf Regular, Fehlerbehandlung, und `widthOfTextAtSize`-Test. Diese Logik wird in den Font-Manager extrahiert, nicht neu gebaut.

### Pattern 4: Texthöhen-Berechnung (kritischste Stelle)

```javascript
// engine.js — Höhe eines Textblocks in pt berechnen
// [VERIFIED: generatePDF.js splitTextToLines Zeilen 1425-1451 — gleiche Logik]
async function calculateTextHeight(text, font, fontSize, maxWidth, lineHeightFactor) {
    const lines = await splitTextToLines(text, font, fontSize, maxWidth);
    const lineHeightPt = fontSize * lineHeightFactor;
    return lines.length * lineHeightPt;
}

async function splitTextToLines(text, font, fontSize, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = await font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth) {
            if (currentLine) { lines.push(currentLine); currentLine = word; }
            else { lines.push(word); }
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}
```

Diese Funktion existiert bereits in `generatePDF.js` (Zeile 1425). Sie wird nach `engine.js` verschoben und ist die autoritäre Höhenquelle für beide Renderer.

### Pattern 5: Quill-HTML parsen mit DOMParser

Quill speichert Content als HTML. Das DOM enthält diese HTML-Strings als `innerHTML` von `.ql-editor`-Elementen. Die Engine muss daraus Text + Formatierung extrahieren.

```javascript
// engine.js — Quill HTML parsen
// [VERIFIED: generatePDF.js Zeilen 1144-1260 — aktuelle DOM-querySelector Logik]
function parseQuillHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const runs = [];

    doc.body.querySelectorAll('h1, h2, h3, p, strong, em, u, s').forEach(el => {
        runs.push({
            text: el.innerText || el.textContent,
            tag: el.tagName.toLowerCase(),
            bold: el.tagName === 'STRONG' || el.closest('strong') !== null,
            italic: el.tagName === 'EM' || el.closest('em') !== null,
            underline: el.tagName === 'U' || el.closest('u') !== null,
            isQuillHeading: el.classList.contains('isQuillHeading'),
            alignment: el.style.textAlign || 'left'
        });
    });
    return runs;
}
```

**Bekannte Quill-HTML-Struktur im Projekt:** Die aktuelle `processElementGroups`-Funktion in `generatePDF.js` liest Text via `subElement.innerText` und Formatierung via `window.getComputedStyle(subElement)`. Nach dem Refactoring muss die Engine ohne `getComputedStyle` auskommen (kein Live-DOM-Zugriff) — DOMParser-Dokument hat kein CSS, also müssen Stile aus dem HTML-Markup selbst gelesen werden (`<strong>`, `<em>`, etc.), nicht aus CSS.

### Anti-Patterns

- **`element.offsetHeight` als Höhenquelle** — aktuell in `previewPageBreaks.js` `calculateElementHeight()` (Zeile 789). Muss vollständig durch font-metrische Berechnung ersetzt werden.
- **`window.getComputedStyle` in der Layout-Logik** — aktuell in `generatePDF.js` Zeile 1218-1224 für Textformatierung. Nach Refactoring: Formatierung aus HTML-Markup, nicht aus CSS.
- **`window.lastCalculatedBreakPositions`** — aktuell in `previewPageBreaks.js` Zeile 77. Nach Refactoring: kein globales Shared State. Beide Renderer bekommen `LayoutResult` direkt.
- **Lokales `globalConfig` in `generatePDF.js`** — Zeile 881-888 deklariert ein lokales `const globalConfig` das den Import aus `script.js` shadowed. Das muss beim Refactoring beachtet werden.
- **Debounce bei 300ms in previewPageBreaks.js** (Zeile 49) — Constraint sagt 150ms. Muss angepasst werden.

---

## Don't Hand-Roll

| Problem | Don't Bauen | Use Instead | Warum |
|---------|-------------|-------------|-------|
| Textzeilenumbruch | Eigene Breitenberechnung | `font.widthOfTextAtSize` (pdf-lib) | Identisch zu was PDF nutzt — garantiert gleiche Zeilenumbrüche |
| HTML-Parsing | Regex auf Quill-HTML | `DOMParser` | Robuster gegenüber verschachtelten Inline-Elementen; Constraint aus CONTEXT.md |
| Font-Laden | fetch + embed bei jedem Export | Font-Manager mit Cache | Font-Ladezeit ist der größte Engpass bei PDF-Export |
| pt→px Umrechnung | Eigene DPI-Erkennung | Konstante `96/72` | 96 DPI ist Standard für CSS; HiDPI wird über CSS-Transform der Vorschau gelöst |

---

## Common Pitfalls

### Pitfall 1: Koordinatensystem-Inversion PDF vs. DOM

**Was schiefläuft:** pdf-lib's Koordinatenursprung ist unten-links (y=0 = Seitenunter). DOM-Koordinaten haben Ursprung oben-links (y=0 = Seitenober). Die Engine rechnet in DOM-Konvention (y=0 oben). Der pdfRenderer muss invertieren: `pdfY = pageHeight - engineY - blockHeight`.

**Warum passiert es:** generatePDF.js rechnet bereits mit invertiertem Y (`context.y` startet bei `height - margin.top` und wird subtrahiert). Diese Logik muss explizit aus dem pdfRenderer herausgehalten werden — die Engine kennt keine Inversion.

**Früherkennung:** Blöcke erscheinen im PDF auf der falschen Seite (oben statt unten oder umgekehrt) nach erstem Render-Test.

### Pitfall 2: `globalConfig` shadowing in generatePDF.js

**Was schiefläuft:** `generatePDF.js` importiert `globalConfig` aus `script.js` (Zeile 3), deklariert aber in `generatePDF()` (Zeile 881) ein lokales `const globalConfig`. Wer ändert was? Bei Inline-Refactoring müssen beide Stellen bedacht werden — das lokale `globalConfig` hat andere Felder (z.B. `fontSize` ist bereits via `pxToPt()` konvertiert).

**Prävention:** Vor Beginn des Refactorings alle Stellen in generatePDF.js identifizieren, die `globalConfig` lesen, und prüfen ob sie das importierte oder das lokale meinen.

### Pitfall 3: Zeilenhöhe im DOM stimmt nicht mit PDF überein

**Was schiefläuft:** CSS `line-height: 1.5` im DOM führt zu anderen Pixelwerten als `fontSize * 1.5` in der Engine-Berechnung, weil Browser Line-Height unterschiedlich runden. Ergebnis: Seiten der DOM-Preview haben minimal andere Höhe als PDF-Seiten.

**Warum passiert es:** Browser-Rendering-Eigenheit. Wird mit hoher Wahrscheinlichkeit beim ersten echten Testlauf sichtbar.

**Prävention:** Im DOM-Renderer den exakten `line-height`-Wert aus der Engine übernehmen (`ptToPx(fontSize) * lineHeightFactor`), nicht aus CSS lesen. DOM-Elemente kriegen explizites `line-height`-Style gesetzt.

### Pitfall 4: DOMParser hat kein CSS — `getComputedStyle` schlägt still fehl

**Was schiefläuft:** Der DOMParser erstellt ein neues Document ohne CSS. `window.getComputedStyle(el)` in einem DOMParser-Dokument liefert Default-Browser-Styles, nicht die App-Styles. Inline-Stile und HTML-Tags funktionieren.

**Prävention:** Formatierung ausschließlich aus HTML-Markup lesen: `el.tagName`, `el.closest('strong')`, `el.style.textAlign`. Nie `getComputedStyle` in einem DOMParser-Kontext.

### Pitfall 5: Font-Manager muss PDFDocument kennen — zirkuläre Abhängigkeit

**Was schiefläuft:** `font.embedFont()` braucht ein PDFDocument-Objekt. Wenn der Font-Manager PDFDocument importiert und pdfRenderer ebenfalls, entsteht eine zirkuläre Abhängigkeit oder unnötige Kopplung.

**Prävention:** Font-Manager lädt und cached nur ArrayBuffers. `embedFont()` ruft erst der pdfRenderer auf, wenn er ein PDFDocument hat. Font-Manager exposed: `getArrayBuffer(fontFamily, style)`. [ASSUMED — Designentscheidung]

### Pitfall 6: Seitenweiser DOM-Preview vs. bisherige Scroll-Preview

**Was schiefläuft:** Der bisherige `#liedblatt-content` Container ist ein langer, scrollbarer Div. Das neue Design zeigt separate Seiten-Divs. Das Layout in `dashboard.html` und die CSS für den rechten Panel müssen für die neue Darstellung angepasst werden — sonst überlappen Seiten oder scrollen falsch.

**Was zu prüfen ist:** Wie ist `#liedblatt-content` aktuell gestylt? Welche CSS-Klassen nutzen Children? Das domRenderer muss `#liedblatt-content` komplett neu befüllen, nicht nur Umbruch-Marker einfügen.

**Prävention:** Dashboard-HTML und CSS vor dem DOM-Renderer-Refactoring verstehen. Der Container braucht `overflow-y: auto` und die Seiten-Divs relative Positionierung.

---

## Code Examples

### constants.js — Zielstruktur

```javascript
// frontend/js/layout/constants.js
// [VERIFIED: Werte direkt aus generatePDF.js extrahiert]

export const FONT = {
    BASE_SIZE: 14,           // pt — Grundschriftgröße
    H1_SCALE: 1.6,
    H2_SCALE: 1.4,
    H3_SCALE: 1.2,
    COPYRIGHT_SIZE: 12,      // pt — PDF-Wert gewinnt (Preview war 10)
};

export const SPACING = {
    STROPHE: 8,              // pt — PDF-Wert gewinnt (Preview war 6)
    OBJECT_DEFAULT: 15,      // pt — PDF-Wert gewinnt (Preview war 12)
    TITLE_BOTTOM: 6,         // pt — nur in Preview vorhanden, sinnvoll übernehmen
    STROPHE_BOTTOM: 8,       // pt — nur in Preview vorhanden
    IMAGE_TOP: -10,          // pt — nur in PDF
    IMAGE_BOTTOM: 15,        // pt — nur in PDF
    ICON_SIZE: 20,           // pt
    ICON_MARGIN: 25,         // pt
    COPYRIGHT_TOP: -5,       // pt
    COPYRIGHT_BOTTOM: -5,    // pt
    QUILL_H1_TOP: 0,
    QUILL_H1_BOTTOM: 12,
    QUILL_H2_TOP: 5,
    QUILL_H2_BOTTOM: 10,
    QUILL_H3_TOP: 5,
    QUILL_H3_BOTTOM: 5,
};

export const MARGINS = {
    top: 30,    // pt
    right: 20,  // pt
    bottom: 20, // pt
    left: 20,   // pt
};

export const PAGE_SIZES = {
    'a5':        { width: 419.53, height: 595.28 },
    'dl':        { width: 280.63, height: 595.28 },
    'a4-schmal': { width: 297.64, height: 841.89 },
    'a3-schmal': { width: 419.53, height: 1190.55 },
};

export const LAYOUT = {
    MAX_STROPHES_BEFORE_BREAK: 3,
    MAX_PSALM_LINES_BEFORE_BREAK: 4,
    MIN_SPACE_FOR_NEXT_GROUP: 50,   // pt
};

export const PT_TO_PX = 96 / 72;   // 1.333... — für DOM-Renderer
```

### engine.js — Kernsignatur

```javascript
// frontend/js/layout/engine.js
// [ASSUMED] — Interne API nach Claude's Discretion

/**
 * @param {Array} items - Liedblatt-Objekte aus #liedblatt-content (oder State)
 * @param {Object} config - { format, fontSize, lineHeight, textAlign, fontFamily, margins }
 * @param {Object} fonts - { regular, bold, italic, boldItalic } — PDFFont-Objekte
 * @returns {Promise<LayoutResult>} — pages mit positionierten blocks in pt
 */
export async function calculateLayout(items, config, fonts) { ... }
```

### domRenderer.js — Preview-Update

```javascript
// frontend/js/layout/domRenderer.js
// [ASSUMED] — Implementierung nach Claude's Discretion

let debounceTimer = null;

export function schedulePreviewUpdate(items, config, fonts) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        const result = await calculateLayout(items, config, fonts);
        renderToDOM(result, document.getElementById('liedblatt-content'));
    }, 150); // Constraint: 150ms
}

export function renderToDOM(layoutResult, container) {
    container.innerHTML = '';
    for (const page of layoutResult.pages) {
        const pageEl = createPageElement(page);
        for (const block of page.blocks) {
            pageEl.appendChild(renderBlock(block));
        }
        container.appendChild(pageEl);
    }
}
```

### pdfRenderer.js — PDF-Export

```javascript
// frontend/js/layout/pdfRenderer.js
// [ASSUMED] — Implementierung nach Claude's Discretion

export async function renderToPDF(layoutResult, fonts, images) {
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.create();
    doc.registerFontkit(window.fontkit);
    
    // Fonts embedden
    const pdfFonts = await embedFonts(doc, fonts.arrayBuffers);
    
    for (const page of layoutResult.pages) {
        const pdfPage = doc.addPage([page.width, page.height]);
        for (const block of page.blocks) {
            await renderBlockToPDF(pdfPage, block, pdfFonts, page.height);
        }
    }
    return doc;
}
```

---

## Kritische Integrationspunkte

### Existierende globale Bindings die erhalten bleiben müssen

| Binding | Datei | Muss erhalten bleiben? | Hinweis |
|---------|-------|----------------------|---------|
| `window.generatePDF` | generatePDF.js Zeile 6 | Ja — dashboard.html ruft es auf | generatePDF.js wird thin wrapper |
| `updatePreviewWithPageBreaks()` | previewPageBreaks.js, export | Ja — script.js importiert es (Zeile 51) | Signatur bleibt, Implementierung wechselt |
| `initPreviewFormatSelector()` | previewPageBreaks.js, export | Ja — script.js Zeile 51, initializeApp | Muss erhalten oder migriert werden |
| `globalConfig` | script.js | Ja — alle Module importieren es | Keine Änderung in Phase 2 |
| `quillInstances` | liedblattManagement.js | Ja — Quill-Editor-State | Kein Refactoring in Phase 2 |

### Circular Import Risiko

`liedblattManagement.js` importiert:
- `globalConfig, getImagePath, applyGlobalConfig` aus `script.js`
- `updatePreviewWithPageBreaks` aus `previewPageBreaks.js`

`script.js` importiert:
- `updatePreviewWithPageBreaks` aus `previewPageBreaks.js`
- alles aus `liedblattManagement.js`

Nach Refactoring: `updatePreviewWithPageBreaks` kommt aus `layout/domRenderer.js`. Die Import-Kette bleibt gleich, Quelle ändert sich. Kein neues Circular-Import-Problem, solange `engine.js` nichts aus `script.js` oder `liedblattManagement.js` importiert. [ASSUMED — Analyse basiert auf aktuellen Import-Ketten]

---

## Build-Reihenfolge (Inline-Refactoring-Sequenz)

Die Reihenfolge ist nicht im CONTEXT.md gesperrt — Claude's Discretion. Empfohlene Sequenz:

**Schritt 0:** `constants.js` erstellen — alle Konstanten aus beiden Dateien vereinen, divergierende dokumentieren, PDF-Wert nehmen. Sofortiger Nutzen: Single Source of Truth.

**Schritt 1:** `engine.js` erstellen — `splitTextToLines` und Höhenberechnungslogik aus `generatePDF.js` extrahieren. `calculateLayout` als pure async Funktion. Noch nicht aufgerufen, aber testbar.

**Schritt 2:** `pdfRenderer.js` erstellen — Zeichenlogik aus `generatePDF.js` `processElementGroups()` und `drawText()` in pdfRenderer verschieben. `generatePDF.js` wird zum thin wrapper: `calculateLayout` aufrufen, dann `renderToPDF`.

**Schritt 3:** `domRenderer.js` erstellen — seitenweise DOM-Preview. `previewPageBreaks.js` wird thin wrapper oder leere Datei mit Re-Exports aus `domRenderer.js`.

**Schritt 4:** `window.lastCalculatedBreakPositions` entfernen — jetzt, wo beide Renderer `LayoutResult` direkt bekommen, ist das Shared State überflüssig.

**Schritt 5:** Debounce von 300ms auf 150ms anpassen (in `domRenderer.js` / neuem wrapper).

**Schritt 6:** Integrations-Smoke-Test: Format wechseln, Inhalt ändern, PDF exportieren — Seitenumbrüche müssen identisch sein.

---

## State of the Art

| Alter Ansatz | Neuer Ansatz | Wann geändert | Impact |
|-------------|-------------|---------------|--------|
| `element.offsetHeight` als Höhenbasis | `font.widthOfTextAtSize` + Zeilenschätzung | Phase 2 | Eliminiert DPI-Abhängigkeit |
| Umbruch-Marker im DOM (dashed line) | Seitenweise Blatt-Darstellung | Phase 2 | WYSIWYG statt Annotation |
| `window.lastCalculatedBreakPositions` | LayoutResult als Funktionsargument | Phase 2 | Eliminiert Race Condition |
| Konstanten dupliziert in 2 Dateien | Eine `constants.js` | Phase 2 | Eliminiert strukturelle Divergenz |
| Debounce 300ms | Debounce 150ms | Phase 2 | Spürbar schnelleres Live-Feedback |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Koordinaten-Konvention: Engine rechnet y=0 an Seitenoberkante, pdfRenderer invertiert | Architecture Patterns | pdfRenderer-Koordinaten falsch — Inhalte erscheinen an falscher y-Position im PDF |
| A2 | Font-Manager cached ArrayBuffers, embedFont liegt im pdfRenderer | Architecture Patterns | Kein funktionaler Risk, aber Implementation muss Abhängigkeiten anders ordnen |
| A3 | `TITLE_MARGIN_BOTTOM: 6` und `STROPHE_MARGIN_BOTTOM: 8` aus Preview-only-Konstanten übernehmen | constants.js | Leichte visuelle Abweichung in Titeln — aber nicht schlimmer als aktuell |
| A4 | `initPreviewFormatSelector()` bleibt als Export erhalten oder wird in domRenderer.js reimplementiert | Integration | Wenn script.js das Import-Target nicht findet, bricht die App beim Laden |
| A5 | DOMParser ist ausreichend für alle aktuellen Quill-HTML-Ausgaben (keine Shadow DOM, keine Custom Elements) | Quill HTML Parsing | Wenn Quill-HTML-Struktur komplexer ist als erwartet, müssen Selektoren angepasst werden |

---

## Open Questions

1. **Wie viele Fontvarianten werden tatsächlich genutzt?**
   - Was wir wissen: `fetchAndEmbedFont` lädt Regular, Bold, Italic, BoldItalic. Fehlende Stile fallen auf Regular zurück.
   - Was unklar: Sind alle 4 Varianten für alle konfigurierten Fonts verfügbar? Der Font-Manager-Cache muss das graceful handhaben.
   - Empfehlung: Bei Font-Manager-Implementierung Fallback-Logik aus `fetchAndEmbedFont` 1:1 übernehmen.

2. **Was passiert mit der Broschüren-Funktion (`createBrochure`)?**
   - Was wir wissen: `createBrochure` (generatePDF.js Zeile 1479) arbeitet auf dem fertigen PDF-Bytes, nicht auf dem Layout. Sie ist unabhängig von der Refactoring-Grenze.
   - Was unklar: Muss die Broschüren-Funktion nach Phase 2 angepasst werden?
   - Empfehlung: `createBrochure` unverändert belassen — sie transformiert PDF-Bytes und ist kein Layout-Problem.

3. **Wie ist `#liedblatt-content` aktuell gestylt?**
   - Was wir wissen: Es ist der Preview-Container. Der domRenderer muss seinen Inhalt komplett neu schreiben.
   - Was unklar: Welche CSS-Klassen und Layout-Properties haben aktuelle Children? Müssen bestehende `data-liedblatt-id` Attribute erhalten bleiben für Drag-and-Drop?
   - Empfehlung: Vor Schritt 3 (domRenderer) `dashboard.html` CSS für `#liedblatt-content` lesen und verstehen, ob Drag-and-Drop weiterhin auf `#selected-items` operiert (ja) oder auf `#liedblatt-content` (nein — Vorschau nur).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 ist reines Datei-Refactoring im Browser-Frontend. Keine externen Abhängigkeiten über die bereits existierenden CDN-Libraries (pdf-lib, Quill, fontkit) hinaus. Alle erforderlichen Tools (Node.js, npm, Docker) sind bereits für das Projekt eingerichtet.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Impact auf Phase 2 |
|------------|-------------------|
| Express.js Backend bleibt — kein Neuschreiben | Phase 2 betrifft nur Frontend — kein Konflikt |
| Vanilla JS bevorzugt — kein schweres Framework | engine.js, domRenderer.js, pdfRenderer.js: pure ES6 Module, kein Framework |
| pdf-lib bleibt (clientseitig) | pdfRenderer.js nutzt pdf-lib — constraint eingehalten |
| Eine einzige Rendering-Engine für Vorschau und PDF | Das ist das Ziel von Phase 2 — direkte Übereinstimmung |
| Multi-Tenant: Institution-Scoping in allen neuen Features | Layout-Engine ist institution-neutral (kein API-Zugriff) — kein Scoping nötig |
| Docker-basiertes Deployment muss funktionieren | Keine Backend-Änderungen — kein Einfluss auf Docker-Setup |
| Nutzer nicht-technisch — UI muss intuitiv bleiben | Seitenweise Vorschau ist intuitiver als Umbruch-Marker — erfüllt den Constraint |
| GSD Workflow Enforcement: Änderungen nur über GSD-Commands | Diese Phase läuft über gsd-execute-phase |

---

## Sources

### Primary (HIGH confidence)

- Direkte Codebase-Analyse: `frontend/js/generatePDF.js` (1919 Zeilen) — alle Konstanten, Funktionssignaturen, Rendering-Logik
- Direkte Codebase-Analyse: `frontend/js/previewPageBreaks.js` (1007 Zeilen) — Höhenberechnung, Seitenumbruch-Logik, window-Kopplung
- Direkte Codebase-Analyse: `frontend/js/script.js` — globalConfig Struktur, Importketten
- Direkte Codebase-Analyse: `frontend/js/liedblattManagement.js` — Import-Abhängigkeiten
- `.planning/phases/02-unified-layout-engine/02-CONTEXT.md` — alle gesperrten Entscheidungen
- `.planning/research/ARCHITECTURE.md` — Component-Diagram, Build-Reihenfolge
- `.planning/research/PITFALLS.md` — Konstanten-Divergenz-Analyse, Koordinatensystem-Problem
- `.planning/REQUIREMENTS.md` — LYOT-01 bis LYOT-06 Anforderungen

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — Stack-Empfehlungen, pdf-lib Bewertung

---

## Metadata

**Confidence breakdown:**
- Konstanten-Divergenz-Tabelle: HIGH — direkt aus Quelldateien extrahiert
- Architektur-Pattern: HIGH — basiert auf CONTEXT.md (gesperrte Entscheidungen) + bestehendem Code
- Build-Reihenfolge: MEDIUM — Claude's Discretion, aber logisch aus Abhängigkeiten abgeleitet
- API-Design (LayoutResult, Font-Manager): LOW/ASSUMED — nach Claude's Discretion, noch nicht entschieden

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stabile Technologien; Konstanten-Tabelle ist unveränderlich bis Phase 2 beginnt)
