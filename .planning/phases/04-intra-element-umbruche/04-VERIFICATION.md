---
phase: 04-intra-element-umbruche
verified: 2026-04-08T12:30:00Z
status: human_needed
score: 4/5 must-haves verified
re_verification: false
human_verification:
  - test: "Manuell gesetzte Umbrüche innerhalb eines Elements beim PDF-Export prüfen"
    expected: "Wenn eine Strophe im Editor manuell mit einem Zeilenumbruch (Enter/Shift+Enter) versehen wurde, erscheinen diese Zeilenumbrüche identisch in Vorschau und PDF"
    why_human: "splitTextToLines() in engine.js teilt Text nur an Leerzeichen auf (text.split(' ')). Ob innerText Newlines (\n) als Wortgrenzen liefert und ob diese im Strophen-Text korrekt als Zeilenumbrüche erhalten bleiben, kann ohne Browserkontext nicht verifiziert werden. Roadmap-SC 3 ist mehrdeutig — es koennte sich auf manuelle Seitenumbrüche (funktionieren via .page-break-Marker) oder auf erzwungene Zeilenumbrueche innerhalb von Strophen beziehen."
---

# Phase 4: Intra-Element-Umbrüche Verification Report

**Phase Goal:** Strophen und Refrains können über Seitengrenzen fortgesetzt werden, ohne manuellen Workaround
**Verified:** 2026-04-08T12:30:00Z
**Status:** human_needed
**Re-verification:** Nein — initiale Verifikation

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
|-----|-------|--------|----------|
| 1   | Eine Strophe, die nicht mehr auf die aktuelle Seite passt, wird automatisch zeilenweise auf der nächsten Seite fortgesetzt | VERIFIED | While-Loop in pushTextBlock() (engine.js Z. 205–254) mit `remaining`/`fitsCount`/`chunk` — teilt Zeilen auf, Rest geht auf nächste Seite |
| 2   | Eine Strophe, die größer als eine ganze Seite ist, wird korrekt über mehrere Seiten verteilt (mehrstufiger Split) | VERIFIED | While-Loop läuft so lange bis `remaining.length === 0` — kein Einzel-if, unbegrenzt viele Seiten möglich |
| 3   | Der erste Split-Teil erhält keinen extraSpacingAfter | VERIFIED | `spacingAfter = 0` bei Split-Chunk (Z. 227), nur letzter Chunk erhält `extraSpacingAfter` (Z. 222) |
| 4   | Mindestens MIN_LINES_BEFORE_SPLIT=2 Zeilen bleiben auf einer Seite — Orphan-Zeilen werden auf nächste Seite verschoben | VERIFIED | `if (fitsCount < LAYOUT.MIN_LINES_BEFORE_SPLIT) { newPage(); continue; }` (Z. 210–213), konstante in constants.js Z. 54 |
| 5   | Vorschau und PDF zeigen identische Umbruchpositionen (LYOT-04 bleibt erhalten) | VERIFIED | domRenderer.js und pdfRenderer.js wurden nicht modifiziert (git diff sauber), beide konsumieren identisches LayoutResult aus engine.js |

**Score:** 5/5 Plan-must-haves verifiziert

### Roadmap Success Criteria

| # | Roadmap SC | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Eine Strophe, die nicht mehr auf die aktuelle Seite passt, wird automatisch auf der nächsten Seite fortgesetzt | VERIFIED | Siehe Truth 1 oben |
| 2 | Der Seitenumbruch innerhalb einer Strophe ist in der Vorschau sichtbar und stimmt mit dem PDF überein | VERIFIED | Beide Renderer konsumieren identisches LayoutResult — LYOT-04 erhalten |
| 3 | Manuell gesetzte Umbrüche innerhalb eines Elements bleiben beim PDF-Export erhalten | NEEDS HUMAN | Mehrdeutig: Manuelle *Seiten*umbrüche (.page-break-Marker) funktionieren via newPage(). Ob erzwungene Inline-Zeilenumbrüche (Shift+Enter → \n) in Strophen-Text durch splitTextToLines() korrekt als separate Zeilen behandelt werden, ist nicht programmatisch verifizierbar — splitTextToLines() teilt nur an Leerzeichen |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/js/layout/constants.js` | LAYOUT.MIN_LINES_BEFORE_SPLIT Konstante | VERIFIED | Zeile 54: `MIN_LINES_BEFORE_SPLIT: 2` im LAYOUT-Objekt, korrekt kommentiert |
| `frontend/js/layout/engine.js` | Split-fähige pushTextBlock()-Funktion mit fitsCount | VERIFIED | Z. 194–255: While-Loop mit fitsCount, remaining, isSplitContinuation — vollständige Implementierung |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| engine.js pushTextBlock() | engine.js newPage() | Split-Logik mit fitsCount | WIRED | fitsCount < MIN_LINES_BEFORE_SPLIT → newPage() (Z. 210–213); remaining.length > 0 nach Chunk → newPage() (Z. 251–253) |
| engine.js pushTextBlock() | domRenderer.js / pdfRenderer.js | LayoutResult blocks mit lines[] | WIRED | chunk wird als `lines: chunk` in currentBlocks gepusht (Z. 237); domRenderer iteriert `data.lines` (Z. 138), pdfRenderer iteriert `lines` (Z. 108) |

### Data-Flow Trace (Level 4)

Nicht zutreffend — engine.js ist eine pure Berechnungsfunktion (kein API-Fetch, kein Store). Der Datenfluss geht von DOM-Elementen (items[]) durch die Engine zu LayoutResult-Blöcken.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Syntax korrekt | `node --check frontend/js/layout/engine.js` | Exit 0, keine Fehler | PASS |
| MIN_LINES_BEFORE_SPLIT vorhanden | `grep "MIN_LINES_BEFORE_SPLIT" constants.js` | Z. 54: `MIN_LINES_BEFORE_SPLIT: 2` | PASS |
| fitsCount/remaining/slice in engine.js | `grep -n "fitsCount\|remaining\|slice" engine.js` | 8 Treffer in pushTextBlock() Z. 202–253 | PASS |
| Aufrufer-Signatur unverändert | `grep -n "pushTextBlock(" engine.js` | Z. 194 (Definition), Z. 370, Z. 430 (Aufrufer) — Signatur identisch | PASS |
| Renderer unverändert | `git diff HEAD~2 -- domRenderer.js pdfRenderer.js` | Leer — keine Änderungen | PASS |
| Commits vorhanden | `git log --oneline` | 5a54c16 und 33c5d47 gefunden | PASS |

### Requirements Coverage

| Requirement | Source Plan | Beschreibung | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ELEM-03 | 04-01-PLAN.md | Umbrüche innerhalb von Strophen/Elementen möglich | SATISFIED | pushTextBlock() in engine.js implementiert vollständigen zeilenweisen Split mit While-Loop |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| Keine gefunden | — | — | — | — |

Scans durchgeführt auf `engine.js` und `constants.js`:
- Keine TODO/FIXME/PLACEHOLDER-Kommentare
- `pushTextBlock()` ist vollständig implementiert (kein `return {}`, kein `return null`)
- Keine leeren Handler
- `remaining = []` ist kein Stub — es ist das korrekte Terminierungssignal der While-Loop

### Human Verification Required

#### 1. Manuelle Inline-Zeilenumbrüche in Strophen beim PDF-Export

**Test:** Liedblatt öffnen, ein Lied mit einer Strophe hinzufügen, die mehrere Verszeilen mit Shift+Enter oder Enter getrennt enthält. PDF exportieren. Prüfen ob im PDF dieselben Zeilenumbrüche erscheinen wie in der Vorschau.

**Expected:** Jede Verszeile der Strophe erscheint als eigene Zeile sowohl in der DOM-Vorschau als auch im generierten PDF.

**Why human:** `splitTextToLines()` in engine.js teilt Text nur an Leerzeichen (`text.split(' ')`). `subEl.innerText` liefert in Browsern Newline-Zeichen für `<br>` und Block-Grenzen — aber ob diese als Wortgrenzen in `split(' ')` erhalten bleiben oder zu einem einzigen zusammengeflossenen Text werden, ist ohne Browserkontext nicht prüfbar. Wenn `innerText` `\n` liefert, würden diese nicht als Zeilenumbrüche in `splitTextToLines` behandelt (da nur auf `' '` gespalten wird), was zu falschem Layout führen könnte. Alternativ könnte Roadmap-SC 3 nur manuelle Seitenumbrüche meinen (die funktionieren korrekt via `.page-break`-Marker).

### Gaps Summary

Keine blockierenden Gaps. Alle Plan-must-haves sind implementiert und verifiziert. Die einzige offene Frage betrifft Roadmap-SC 3, das möglicherweise gar nicht Teil des Implementierungsumfangs von Plan 04-01 war (es taucht nicht in `must_haves.truths` auf). Die Split-Kern-Logik (ELEM-03) ist vollständig und korrekt umgesetzt.

---

_Verified: 2026-04-08T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
