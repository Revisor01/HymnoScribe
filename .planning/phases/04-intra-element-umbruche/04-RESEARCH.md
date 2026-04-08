# Phase 4: Intra-Element-Umbrüche - Research

**Researched:** 2026-04-08
**Domain:** Layout Engine — Block-Split-Logik in engine.js, domRenderer.js, pdfRenderer.js
**Confidence:** HIGH

## Summary

Phase 4 ist eine reine Engine-Erweiterung ohne externe Abhängigkeiten. Der gesamte Code ist im Repo vorhanden und wurde direkt gelesen. Die Analyse zeigt: `pushTextBlock()` in `engine.js` prüft aktuell, ob ein Block als Ganzes auf die Seite passt — passt er nicht, wird `newPage()` aufgerufen und der vollständige Block auf die neue Seite gelegt. Die fehlende Logik ist das zeilenweise Aufteilen: Zeilen die noch auf die aktuelle Seite passen bleiben dort, der Rest wandert auf die nächste.

Die Architektur der Engine ist bereits ideal für diese Erweiterung vorbereitet: `pushTextBlock()` hat `lines[]` bereits vollständig berechnet bevor die Seitenanpassung stattfindet. Der Split-Punkt ist eine reine Zählaufgabe. Beide Renderer (`domRenderer`, `pdfRenderer`) konsumieren `lines[]`-Arrays aus dem LayoutResult — sie müssen nur mit kürzeren/gesplitteten Arrays umgehen können, was sie bereits tun.

Die kritische Eigenschaft ist: `domRenderer` und `pdfRenderer` erhalten identische LayoutResults von der Engine. Wird der Split korrekt in `engine.js` implementiert, ergibt sich die Renderer-Konsistenz automatisch (LYOT-04 bleibt erhalten).

**Primäre Empfehlung:** `pushTextBlock()` in engine.js zu `pushSplittableTextBlock()` refactoren — zeilenweise Höhenprüfung statt Block-als-Ganzes-Prüfung. Beide Renderer brauchen keine Änderung, da sie bereits mit beliebig langen `lines[]`-Arrays arbeiten.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Keine locked decisions — alle Implementation-Entscheidungen liegen bei Claude.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure engine extension phase. Key considerations from research:
- engine.js calculateLayout() muss Text-Blöcke splitten können wenn sie die Seite überschreiten
- Split-Logik: Zeile für Zeile prüfen, ab welcher Zeile der Platz nicht mehr reicht
- Erster Teil bleibt auf aktueller Seite, Rest geht auf nächste Seite
- Beide Renderer müssen geteilte Blöcke nahtlos darstellen
- Manuell gesetzte Umbrüche innerhalb von Elementen müssen respektiert werden
- Vorschau und PDF müssen identische Umbrüche zeigen (LYOT-04 aus Phase 2 muss erhalten bleiben)

### Deferred Ideas (OUT OF SCOPE)
Keine — letzte Phase des Milestones.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ELEM-03 | Umbrüche innerhalb von Strophen/Elementen möglich (Fortsetzung auf nächster Seite) | Split-Logik in pushTextBlock() identifiziert; beide Renderer können bereits mit beliebigen lines[]-Arrays umgehen |
</phase_requirements>

## Standard Stack

### Core

Keine neuen Abhängigkeiten — ausschließlich bestehende Engine-Dateien.

| Datei | Zweck | Änderung |
|-------|-------|----------|
| `frontend/js/layout/engine.js` | Layout-Berechnung, Seitenumbrüche | Hauptänderung: `pushTextBlock()` → Split-fähig |
| `frontend/js/layout/domRenderer.js` | DOM-Vorschau | Keine Änderung nötig (bereits `lines[]`-basiert) |
| `frontend/js/layout/pdfRenderer.js` | PDF-Export | Keine Änderung nötig (bereits `lines[]`-basiert) |
| `frontend/js/layout/constants.js` | Konstanten | Möglicherweise `MIN_LINES_BEFORE_SPLIT` ergänzen |

**Version verification:** SKIPPED — keine neuen npm-Pakete.

## Architecture Patterns

### Vorhandene Struktur (aus Code gelesen)

```
engine.js
├── splitTextToLines(text, font, fontSize, maxWidth) → string[]
│     Teilt Text in Zeilen auf. Exakte Breitenberechnung via font.widthOfTextAtSize.
│
├── pushTextBlock(text, fontSize, fontStyle, alignment, extraSpacingAfter, flags)
│     Aktuell: Berechnet lines[], prüft blockHeight vs. verbleibender Platz.
│     PROBLEM: Passt der Block nicht, geht der ganze Block auf die nächste Seite.
│
└── calculateLayout(items, config, fonts, overrides) → LayoutResult
      Iteriert Items, ruft pushTextBlock() auf.
```

```
LayoutResult-Block (type='text'):
{
  type: 'text',
  x, y, width, height,
  data: {
    lines: string[],     // vorberechnete Zeilen — Renderer splitten NICHT selbst
    fontSize: number,
    fontStyle: string,
    alignment: string,
    lineHeight: number,
    isCopyright?, isRefrain?, isStrophe?, overrideKey?
  }
}
```

### Pattern 1: Zeilenweiser Split in pushTextBlock

**Was:** `pushTextBlock()` wird zu `pushSplittableTextBlock()` umgebaut — statt blockHeight-gesamt gegen freien Platz prüfen, wird zeilenweise geprüft. [VERIFIED: engine.js direkt gelesen]

**Wann:** Immer wenn `blockHeight > verbleibender Platz` und `verbleibender Platz > 0 Zeilen`.

**Aktueller Code (engine.js Zeilen 193–223):**
```javascript
// AKTUELL — kein Split
async function pushTextBlock(text, fontSize, fontStyle, alignment, extraSpacingAfter, flags) {
    const lines = await splitTextToLines(text, font, fontSize, contentWidth);
    const lineHeightPt = fontSize * lineHeightFactor;
    const blockHeight = lines.length * lineHeightPt;

    // Seitenumbruch falls kein Platz
    if (currentY + blockHeight > pageSize.height - MARGINS.bottom) {
        newPage();  // <-- Ganzer Block auf nächste Seite
    }
    currentBlocks.push({ ..., data: { lines, ... } });
    currentY += blockHeight + (extraSpacingAfter || 0);
}
```

**Neues Pattern (Split-Logik):**
```javascript
// NEU — zeilenweiser Split
async function pushSplittableTextBlock(text, fontSize, fontStyle, alignment, extraSpacingAfter, flags) {
    const isBold   = fontStyle === 'bold' || fontStyle === 'boldItalic';
    const isItalic = fontStyle === 'italic' || fontStyle === 'boldItalic';
    const font = getFontForStyle(fonts, isBold, isItalic);
    const lines = await splitTextToLines(text, font, fontSize, contentWidth);
    const lineHeightPt = fontSize * lineHeightFactor;

    const availableHeight = pageSize.height - MARGINS.bottom - currentY;
    const fitsCount = Math.floor(availableHeight / lineHeightPt);

    if (fitsCount <= 0) {
        // Kein Platz für auch nur eine Zeile — ganzer Block auf neue Seite
        newPage();
        _pushLines(lines, fontSize, fontStyle, alignment, extraSpacingAfter, flags, lineHeightPt);
        return;
    }

    if (fitsCount >= lines.length) {
        // Alles passt — kein Split nötig (Normalfall)
        _pushLines(lines, fontSize, fontStyle, alignment, extraSpacingAfter, flags, lineHeightPt);
        return;
    }

    // Split: erste fitsCount Zeilen bleiben, Rest auf neue Seite
    const firstPart = lines.slice(0, fitsCount);
    const secondPart = lines.slice(fitsCount);

    _pushLines(firstPart, fontSize, fontStyle, alignment, 0, { ...flags, isSplitContinuation: false }, lineHeightPt);
    newPage();
    _pushLines(secondPart, fontSize, fontStyle, alignment, extraSpacingAfter, { ...flags, isSplitContinuation: true }, lineHeightPt);
}

// Hilfsfunktion: Block mit vorberechneten lines[] in currentBlocks einfügen
function _pushLines(lines, fontSize, fontStyle, alignment, spacingAfter, flags, lineHeightPt) {
    const blockHeight = lines.length * lineHeightPt;
    currentBlocks.push({
        type: 'text',
        x: MARGINS.left,
        y: currentY,
        width: contentWidth,
        height: blockHeight,
        data: { lines, fontSize, fontStyle, alignment, lineHeight: lineHeightFactor, ...flags }
    });
    currentY += blockHeight + (spacingAfter || 0);
}
```

**Quelle:** [VERIFIED: engine.js direkt gelesen, Logik aus pushTextBlock() Zeilen 193–223 abgeleitet]

### Pattern 2: Manuell gesetzte Intra-Element-Umbrüche

WYSI-05 (Phase 3) führt manuelle Seitenumbrüche als `item.classList.contains('page-break')` ein. Diese werden aktuell als eigene Items in der Item-Liste behandelt (engine.js Zeilen 231–242). Intra-Element-Umbrüche sind ein anderes Konzept: ein Umbruch mitten in einer Strophe, nicht zwischen Items.

**Analyse:** Das CONTEXT.md erwähnt "Manuell gesetzte Umbrüche innerhalb von Elementen müssen respektiert werden". Da Strophen als `subEl.innerText` erfasst werden (engine.js Zeile 367), gibt es aktuell keinen Mechanismus für Intra-Element-Umbrüche.

**Empfehlung:** Für Phase 4 genügt der automatische Split. Manuell gesetzte Intra-Element-Umbrüche können als `\n---\n`-Marker im Text oder als spezielle CSS-Klasse auf Strophen-Unterteilen implementiert werden — das ist eine Entscheidung während der Planung. [ASSUMED]

### Anti-Patterns zu vermeiden

- **Renderer-seitiger Split:** NIEMALS `lines[]` in domRenderer oder pdfRenderer aufteilen. Die Engine ist die einzige Quelle der Wahrheit für Positionen (LYOT-04-Invariante).
- **Wiederholung von splitTextToLines in Renderer:** `splitTextToLines` wird nur in engine.js aufgerufen. Renderer erhalten fertige `lines[]`.
- **Min-Zeilen-Heuristik ohne Konstante:** Wenn eine Mindestanzahl von Zeilen vor dem Split eingeführt wird (z.B. "mindestens 2 Zeilen auf einer Seite"), muss das in `constants.js` als `LAYOUT.MIN_LINES_BEFORE_SPLIT` definiert werden.

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen |
|---------|-------------|-------------|
| Zeilenbreiten-Berechnung | Eigenen Algorithmus | `splitTextToLines()` — bereits exakt, font-sensitiv |
| pt→px-Umrechnung | Eigene Konstante | `PT_TO_PX` aus constants.js |
| Font-Auswahl | Eigene Logik | `getFontForStyle()` in engine.js |

**Key Insight:** `lines[]` ist bereits die Zwischenrepräsentation — der Split ist eine Array-Slice-Operation auf bereits berechneten Daten. Keine neue Berechnung nötig.

## Detaillierte Code-Analyse

### engine.js — Kritische Stellen [VERIFIED: direkt gelesen]

**Zeile 202: Aktuelle Umbruch-Entscheidung (zu ersetzen)**
```javascript
if (currentY + blockHeight > pageSize.height - MARGINS.bottom) {
    newPage(); // Gesamter Block → neue Seite. HIER muss Split stattfinden.
}
```

**Zeile 197: lines[] ist BEREITS berechnet wenn die Platz-Prüfung stattfindet**
```javascript
const lines = await splitTextToLines(text, font, fontSize, contentWidth);
const lineHeightPt = fontSize * lineHeightFactor;
const blockHeight = lines.length * lineHeightPt;
// ↑ blockHeight = Gesamthöhe. fitsCount = Math.floor(available / lineHeightPt)
```

**Zeile 176: newPage()-Funktion (unverändert nutzbar)**
```javascript
function newPage() {
    pages.push({ pageNumber: pages.length + 1, blocks: currentBlocks });
    currentBlocks = [];
    currentY = MARGINS.top;
}
```

**Zeile 393–399: Standard-Lied-Items rufen pushTextBlock() auf (Strophen, Refrains)**
```javascript
if (isStrophe || isRefrain) {
    marginBottom = scaleValue(SPACING.STROPHE, scaledFontSize);
}
currentY += marginTop;
await pushTextBlock(text, fontSize, fontStyle, config.textAlign,
    marginBottom, { isCopyright, isRefrain, isStrophe, overrideKey: currentItemOverrideKey });
```

### domRenderer.js — Keine Änderung nötig [VERIFIED: direkt gelesen]

`_createTextElement()` (Zeilen 113–148) iteriert `data.lines || []` und erstellt für jede Zeile ein `div`. Es spielt keine Rolle, ob `lines` 10 oder 2 Einträge hat — die Funktion ist bereits generisch.

**Kritische Zeile 138:**
```javascript
for (const line of (data.lines || [])) {
    const lineEl = document.createElement('div');
    lineEl.style.height = `${lineHeightPx}px`;
    lineEl.textContent  = line;
    el.appendChild(lineEl);
}
```

Split-Blöcke werden automatisch korrekt gerendert.

### pdfRenderer.js — Keine Änderung nötig [VERIFIED: direkt gelesen]

`_drawTextBlock()` (Zeilen 91–143) iteriert `lines || []` mit dekrementalem pdfY. Auch hier ist die Länge von `lines[]` irrelevant für die Korrektheit.

**Kritische Zeile 104:**
```javascript
let currentPdfY = pageSize.height - engineY - fontSize;
```

Da `engineY` (= `block.y`) aus der Engine kommt und die Engine bei Splits korrekte Y-Werte setzt (MARGINS.top für den Anfang einer neuen Seite), funktioniert die Y-Inversion automatisch.

## Common Pitfalls

### Pitfall 1: extraSpacingAfter bei Split

**Was schiefgeht:** Wenn eine Strophe gesplittet wird, hat der erste Teil noch `marginBottom = SPACING.STROPHE` als `extraSpacingAfter`. Das würde Abstand zwischen Seite-1-Ende und dem gedachten "nächsten Objekt" erzeugen — aber das Seiten-Ende hat diesen Platz nicht.

**Warum:** `extraSpacingAfter` wird zu `currentY` addiert. Bei einem Split hat der erste Teil keinen Platz für Spacing nach sich (Seite ist voll).

**Lösung:** Beim Split den ersten Teil mit `extraSpacingAfter = 0` übergeben. Nur der zweite Teil (Fortsetzung) erhält das normale `extraSpacingAfter`. [VERIFIED: Logik aus engine.js Zeile 222 abgeleitet]

### Pitfall 2: Spacing-Override-Marker bei Split

**Was schiefgeht:** Nach einem Lied-Item wird ein `spacing-override-marker` Block eingefügt (engine.js Zeilen 344–356). Wenn das Item gesplittet wird, könnte der Marker auf der falschen Seite landen.

**Lösung:** Der Marker muss immer nach dem letzten Block des Items eingefügt werden — nach dem zweiten Split-Teil, nicht nach dem ersten. Die aktuelle Item-Traversal-Logik (Zeilen 402–416) liegt nach dem `subElements`-Loop, also automatisch nach allen pushTextBlock()-Aufrufen. Das ist korrekt.

### Pitfall 3: Minimale Zeilen-Anzahl (Orphan/Widow)

**Was schiefgeht:** Wenn nur 1 Zeile einer 10-zeiligen Strophe auf die erste Seite passt, sieht das typografisch schlecht aus (Orphan-Zeile).

**Warum:** Der naive Split `fitsCount = Math.floor(available / lineHeightPt)` respektiert keine typografischen Regeln.

**Lösung:** `LAYOUT.MIN_LINES_BEFORE_SPLIT` (vorgeschlagen: 2) in constants.js ergänzen. Wenn `fitsCount < MIN_LINES_BEFORE_SPLIT`, den gesamten Block auf die neue Seite verschieben statt zu splitten. [ASSUMED — exakter Wert ist Geschmackssache]

### Pitfall 4: Mehrstufiger Split (Block größer als eine ganze Seite)

**Was schiefgeht:** Eine Strophe ist länger als eine ganze Seite (sehr viele Zeilen). Ein einmaliger Split reicht nicht — nach dem zweiten Teil könnte noch ein dritter Split nötig sein.

**Warum:** Der `secondPart` wird per `_pushLines()` direkt eingefügt ohne erneute Platzprüfung.

**Lösung:** Den Split rekursiv oder iterativ implementieren. Empfehlung: `pushSplittableTextBlock()` ruft sich selbst rekursiv auf oder `_pushLines()` prüft ebenfalls den verfügbaren Platz. Alternativ: `while (secondPart.length > fitsCountOnNewPage) { split weiter }`. [VERIFIED: Notwendigkeit aus Logik erkennbar]

### Pitfall 5: isSplitContinuation-Flag

**Was schiefgeht:** Wenn ein Block gesplittet wird, beginnt der zweite Block auf einer neuen Seite. Ohne Flag weiß der Renderer nicht, dass dieser Block die Fortsetzung eines vorherigen ist. Das kann für visuelle Kontinuitätsindikatoren relevant sein (z.B. "(Fortsetzung)" oder ein visueller Einzug).

**Aktuell:** Keine Anforderung für Fortsetzungs-Indikatoren. Flag `isSplitContinuation: true` in `flags` kostet nichts und ermöglicht spätere Erweiterungen.

## Code Examples

### Aktuelles pushTextBlock (zu ersetzen)
```javascript
// Source: engine.js Zeilen 193–223 [VERIFIED: direkt gelesen]
async function pushTextBlock(text, fontSize, fontStyle, alignment, extraSpacingAfter, flags) {
    const isBold   = fontStyle === 'bold'   || fontStyle === 'boldItalic';
    const isItalic = fontStyle === 'italic' || fontStyle === 'boldItalic';
    const font = getFontForStyle(fonts, isBold, isItalic);
    const lines = await splitTextToLines(text, font, fontSize, contentWidth);
    const lineHeightPt = fontSize * lineHeightFactor;
    const blockHeight = lines.length * lineHeightPt;

    if (currentY + blockHeight > pageSize.height - MARGINS.bottom) {
        newPage(); // ← zu ersetzen durch Split-Logik
    }

    currentBlocks.push({
        type: 'text',
        x: MARGINS.left,
        y: currentY,
        width: contentWidth,
        height: blockHeight,
        data: { lines, fontSize, fontStyle, alignment: alignment || config.textAlign || 'left',
                lineHeight: lineHeightFactor, ...flags }
    });
    currentY += blockHeight + (extraSpacingAfter || 0);
}
```

### Verbleibender Platz berechnen
```javascript
// Source: Abgeleitet aus engine.js Konstanten [VERIFIED]
const availableHeight = (pageSize.height - MARGINS.bottom) - currentY;
const lineHeightPt = fontSize * lineHeightFactor;
const fitsCount = Math.floor(availableHeight / lineHeightPt);
```

### Rendering ist bereits korrekt (kein Fix nötig)
```javascript
// Source: domRenderer.js Zeilen 138–146 [VERIFIED: direkt gelesen]
for (const line of (data.lines || [])) {
    const lineEl = document.createElement('div');
    lineEl.style.height = `${lineHeightPx}px`;
    lineEl.textContent = line;
    el.appendChild(lineEl);
}
// ↑ lines.length ist irrelevant — funktioniert mit 1 oder 100 Zeilen
```

## State of the Art

| Alter Ansatz | Neuer Ansatz | Wann geändert | Impact |
|---|---|---|---|
| Ganzer Block → nächste Seite | Zeilenweiser Split an Seitengrenze | Phase 4 | ELEM-03 erfüllt |
| Einfache blockHeight-Prüfung | fitsCount-Berechnung mit optionalem MIN_LINES_BEFORE_SPLIT | Phase 4 | Typografische Qualität |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Manuell gesetzte Intra-Element-Umbrüche sind via Sonderzeichen im Text oder CSS-Klasse umsetzbar | Architecture Patterns — Pattern 2 | Wenn das UI-System dafür fehlt, ist ELEM-03 "manuell gesetzte Umbrüche" unvollständig |
| A2 | MIN_LINES_BEFORE_SPLIT = 2 ist ein sinnvoller Default | Pitfall 3 | Zu niedrig: schlechte Typografie; zu hoch: unerwünschte Leerstellen |

## Open Questions

1. **Manuell gesetzte Intra-Element-Umbrüche (ELEM-03 Kriterium 3)**
   - Was wir wissen: WYSI-05 (Phase 3) implementiert manuelle Umbrüche zwischen Items
   - Was unklar ist: Das CONTEXT.md erwähnt "Manuell gesetzte Umbrüche innerhalb von Elementen" — aber es gibt kein UI-Konzept dafür. Strophen werden als `subEl.innerText` gelesen — kein internes Markup.
   - Empfehlung: Für Phase 4 den automatischen Split priorisieren. Manuell gesetzte Intra-Umbrüche sind als Folge-Feature markieren oder via Sonderzeichen im Strophen-Text (z.B. `\n---\n`) implementieren.

2. **Rekursion vs. Iteration für mehrstufige Splits**
   - Was wir wissen: Ein Block kann größer als eine Seite sein
   - Was unklar ist: Wie tief rekursiv soll die Implementierung gehen?
   - Empfehlung: Iterativen Loop bevorzugen (`while (remaining.length > 0)`) — einfacher zu debuggen, kein Stack-Overflow-Risiko bei sehr langen Strophen.

## Environment Availability

Step 2.6: SKIPPED — keine externen Abhängigkeiten. Reine JavaScript-Datei-Änderungen ohne CLI-Tools, Runtimes oder Services.

## Validation Architecture

`nyquist_validation` ist explizit `false` in `.planning/config.json` — dieser Abschnitt entfällt.

## Security Domain

**security_enforcement nicht konfiguriert.** Prüfung auf ASVS-Relevanz:

Diese Phase modifiziert ausschließlich die Layout-Berechnung in `engine.js` (pure Funktion ohne IO). Kein neuer User-Input, keine Datenbankzugriffe, keine neuen API-Endpoints. Bestehende Sicherheitsmaßnahmen (`el.textContent = line` statt `innerHTML` in domRenderer.js Zeile 144) bleiben unverändert.

**ASVS-Kategorie V5 (Input Validation):** Der `text`-Parameter in `pushTextBlock()` kommt aus `subEl.innerText` (bereits DOM-escaped). Der neue Split-Code operiert ausschließlich auf dem vorhandenen `lines[]`-Array — kein neuer Input-Pfad.

Keine sicherheitsrelevanten Änderungen in Phase 4 erforderlich.

## Sources

### Primary (HIGH confidence)
- `frontend/js/layout/engine.js` — vollständig gelesen, Zeilen 1–425
- `frontend/js/layout/domRenderer.js` — vollständig gelesen, Zeilen 1–297
- `frontend/js/layout/pdfRenderer.js` — vollständig gelesen, Zeilen 1–191
- `frontend/js/layout/constants.js` — vollständig gelesen, Zeilen 1–58
- `.planning/phases/04-intra-element-umbruche/04-CONTEXT.md` — gelesen
- `.planning/REQUIREMENTS.md` — gelesen (ELEM-03)

### Secondary (MEDIUM confidence)
- Keine externen Quellen nötig — alle Informationen im Code vorhanden.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — direkt aus Codebase gelesen
- Architecture: HIGH — pushTextBlock() Logik vollständig analysiert
- Pitfalls: HIGH (Pitfalls 1, 4) / MEDIUM (Pitfalls 3, 5) — aus Logik direkt erkennbar vs. Heuristik

**Research date:** 2026-04-08
**Valid until:** Solange engine.js, domRenderer.js und pdfRenderer.js nicht extern refactored werden (stabil, da phaseneigene Dateien)
