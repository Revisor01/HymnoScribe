# Feature Research

**Domain:** WYSIWYG Page-Layout-Editor für Print-Liedblätter (Songsheets)
**Researched:** 2026-04-07
**Confidence:** HIGH (Kernproblem aus Codebase direkt analysiert, Muster aus WYSIWYG-Ökosystem verifiziert)

---

## Kontext: Das eigentliche Problem

HymnoScribe hat zwei getrennte Rendering-Systeme mit divergierenden Konstanten:

- `generatePDF.js`: `DEFAULT_OBJECT_SPACING = 15`, `STROPHE_SPACING = 8`, `COPYRIGHT_FONT_SIZE = 12`
- `previewPageBreaks.js`: `DEFAULT_OBJECT_SPACING = 12`, `STROPHE_SPACING = 6`, `COPYRIGHT_FONT_SIZE = 10`

Das ist die Wurzel des Trial-and-Error-Problems. Alle Features dieser Milestone müssen diese Wurzel adressieren — nicht umgehen.

---

## Feature Landscape

### Table Stakes (Nutzer setzen voraus)

| Feature | Warum erwartet | Komplexität | Notizen |
|---------|---------------|-------------|---------|
| Vorschau = Export (1:1 WYSIWYG) | Jeder Page-Layout-Editor (Canva, Word, InDesign) zeigt live, wie das Dokument gedruckt aussieht. Abweichungen von Vorschau zu Export sind ein fundamentaler Defekt, kein Feature-Gap. | HOCH | Lösung: Eine einzige Rendering-Engine. Vorschau rendert über denselben Code-Pfad wie PDF-Export — nur das Ausgabeformat unterscheidet sich (HTML/CSS-Canvas vs pdf-lib). Alle Konstanten an genau einem Ort. |
| Manuelle Seitenumbrüche | Word, Google Docs, CKEditor 5 — alle unterstützen manuell gesetzte Seitenumbrüche. Nutzer brauchen Kontrolle über Umbruchpositionen innerhalb und zwischen Elementen. | MEDIUM | Bereits teilweise vorhanden (manuelle Umbrüche), aber Umbrüche *innerhalb* eines Elements (mitten in einer Strophengruppe) fehlen. CKEditor-Muster: visueller Trennstrich mit "Seitenumbruch hier"-Indikator. |
| Elemente neu anordnen | Grundmechanik jeder Songsheet-Komposition. Nutzer müssen entscheiden können, ob der Refrain vor Strophe 1 erscheint. | NIEDRIG | Drag-and-Drop existiert bereits für Elemente zwischen Liedern. Fehlt: Reihenfolge *innerhalb* eines Liedes (Refrain zuerst). |
| Bildgrößen anpassen | Notenbilder sind keine Dekorationselemente — sie haben unterschiedliche Notendichten. Automatische Vollbreite passt nicht immer. Jeder Print-Editor (Scribus, InDesign) erlaubt Bildgrößen-Kontrolle. | MEDIUM | Aktuell: automatische Skalierung auf volle Seitenbreite. Benötigt: Breiten-Slider oder Drag-Griff. Aspektverhältnis beibehalten ist Pflicht. |
| Schriftgröße frei wählbar | H1/H2/H3 sind semantische Ebenen, keine Größenauswahl. Nutzer mit spezifischen Liturgie-Formatanforderungen brauchen präzise Kontrolle. | NIEDRIG | Quill unterstützt Schriftgröße bereits. Fehlte bisher: Einbindung in PDF-Export-Pfad. |

### Differentiators (Wettbewerbsvorteil)

| Feature | Value Proposition | Komplexität | Notizen |
|---------|------------------|-------------|---------|
| Spacing-Drag-Regler | Kein vergleichbares kirchliches Liedblatt-Tool bietet visuelle Drag-Feinsteuerung von Elementabständen. Nutzer können Abstände live anpassen und sehen sofort das Ergebnis im Preview. | MEDIUM | Muster aus Web-to-Print-Editoren (Customer's Canvas): numerischer Slider mit Live-Update. Implementierung: CSS-Variable pro Objekt, die in PDF-Konstante übersetzt wird — selbe Engine. Kein DOM-Drag-Handle auf Canvas nötig, Slider reicht für diese Zielgruppe. |
| Umbrüche innerhalb von Elementen | Strophen können auf zwei Seiten verteilt werden. Für lange Lieder in DIN-Lang/A5-Format oft einzige Option. Konkurrenten (Planning Center, WorshipTools) haben dies nicht in Print-Liedblättern. | HOCH | Erfordert, dass das Rendering-System Strophengruppen als teilbar markieren kann. Komplexeste Feature dieser Milestone. Abhängig von einheitlicher Rendering-Engine. |
| Format-Live-Switch | Nutzer können Papierformat (A5/A4/DIN-Lang) live wechseln und sehen sofort den Umbruch-Effekt ohne Export. | NIEDRIG | Technisch: Format-Wechsel triggert Re-Render durch dieselbe Engine. Bereits konzeptuell vorbereitet in globalConfig.format. |

### Anti-Features (Scheinbar sinnvoll, tatsächlich problematisch)

| Feature | Warum gewünscht | Warum problematisch | Stattdessen |
|---------|----------------|---------------------|-------------|
| Freie Positionierung (InDesign-Stil) | "Ich will Elemente beliebig auf der Seite platzieren" — kommt von Nutzern, die Print-Profis sind. | HymnoScribe-Nutzer sind Nicht-Techniker. Freie Positionierung bricht den vertikalen Fluss-Ansatz und macht automatische Seitenumbrüche unmöglich. Wartungsaufwand explodiert. | Vertikal-Fluss beibehalten. Feingranulare Kontrolle über Abstände (Spacing-Regler) löst 95% der Positionierungswünsche. |
| WYSIWYG-Inline-Editing (Direktbearbeitung im Preview) | "Ich will Text direkt im Preview-Bereich editieren." | Der Preview ist die gerenderte Ausgabe — Inline-Editing würde zwei Datenschichten erzeugen (Quill-Daten vs. Preview-DOM). Synchronisation ist fragil. | Editieren im Seitenleisten-Panel, Live-Update im Preview. Klares mentales Modell: links editieren, rechts/unten sehen. |
| Undo/Redo-Stack (tief) | "Ich will beliebig viele Schritte rückgängig machen." | Erheblicher Implementierungsaufwand für eine App ohne Framework. Sessions-Autosave + explizites Speichern löst 80% der Use Cases. | Session-Autosave alle N Sekunden + "letzte gespeicherte Version laden"-Funktion. |
| Kollaboratives Editing | Mehrere Nutzer gleichzeitig am selben Liedblatt. | Out of Scope laut PROJECT.md — und richtig so. Komplexität unverhältnismäßig. | Vorlage teilen / Session exportieren. |
| Automatischer Satz (Liedtext-Parser) | "Liedtext einfügen, App erkennt Strophen/Refrain automatisch." | Extrem fehleranfällig bei deutschem Kirchenlied-Repertoire, Psalmtexten, liturgischen Texten mit Formatvielfalt. Falsch-Erkennungen zerstören Vertrauen. | Strukturierter manueller Eingabe-Workflow. Nutzer weiß besser als Algorithmus, was ein Refrain ist. |

---

## Feature Dependencies

```
[Einheitliche Rendering-Engine]
    └──ermöglicht──> [1:1 WYSIWYG-Vorschau]
    └──ermöglicht──> [Spacing-Drag-Regler mit Live-Feedback]
    └──ermöglicht──> [Format-Live-Switch]
    └──ermöglicht──> [Umbrüche innerhalb von Elementen]

[1:1 WYSIWYG-Vorschau]
    └──voraussetzung für──> [Umbrüche innerhalb von Elementen]
                                 (Nutzer kann Umbruch-Effekt erst dann sinnvoll platzieren,
                                  wenn Preview dem echten Output entspricht)

[Bildgrößen anpassen]
    └──benötigt──> [Einheitliche Rendering-Engine]
                   (Bildgröße muss in PDF-Koordinaten übersetzt werden,
                    selbe Skalierung wie in Preview)

[Elemente neu anordnen (Refrain zuerst)]
    └──unabhängig von──> [Einheitliche Rendering-Engine]
                          (reines DOM-/Datenmodell-Problem, kein Rendering-Problem)

[Freie Schriftgröße/-stil]
    └──benötigt──> [Einheitliche Rendering-Engine]
                   (Custom-Fontsize muss in PDF-pt korrekt übersetzt werden)
```

### Dependency Notes

- **Einheitliche Rendering-Engine ist Blocker für alles andere:** Alle anderen Features dieser Milestone hängen davon ab, dass Preview und Export dieselbe Codebasis nutzen. Ohne diese Foundation macht jede andere Verbesserung das Trial-and-Error-Problem nur kleiner, nicht obsolet.
- **Umbrüche innerhalb von Elementen ist das komplexeste Feature:** Es setzt voraus, dass die Rendering-Engine Elemente in Teilstücke zerlegen und diese über Seitengrenzen hinweg verteilen kann. Das ist kein Cosmetic-Fix, sondern ein Redesign des Rendering-Loops.
- **Reihenfolge-Änderung (Refrain zuerst) ist unabhängig:** Dieses Feature lebt im Datenmodell (wie werden Strophen/Refrains in der Session serialisiert) und in der Drag-and-Drop-UI. Es blockiert nichts und wird durch nichts blockiert.

---

## MVP Definition

### Diese Milestone starten mit (v1 — Foundation)

- [ ] **Einheitliche Rendering-Engine** — Kein anderes Feature ist ohne dies sinnvoll. Alle Konstanten an einem Ort, Preview und Export nutzen denselben Rendering-Code-Pfad.
- [ ] **Freie Elementreihenfolge (Refrain zuerst)** — Unabhängiges, klar abgegrenztes Feature. Schneller Win, unblockiert durch Engine-Arbeit.

### Nach Foundation hinzufügen (v1.x)

- [ ] **Bildgrößen anpassen** — Sobald Rendering-Engine steht, ist die Übersetzung Browser-px → PDF-pt zuverlässig.
- [ ] **Spacing-Drag-Regler** — Einheitliche Engine ist Voraussetzung für sinnvolles Live-Feedback.
- [ ] **Freie Schriftgröße/-stil** — Quill unterstützt es bereits, Integration in PDF-Pfad ist dann trivial.

### Für spätere Iteration (v2)

- [ ] **Umbrüche innerhalb von Elementen** — Höchste Komplexität. Lohnt separaten Planungsdurchlauf nach v1.x-Stabilisierung.

---

## Feature Prioritization Matrix

| Feature | Nutzerwert | Implementierungsaufwand | Priorität |
|---------|-----------|------------------------|-----------|
| Einheitliche Rendering-Engine | HOCH | HOCH | P1 |
| 1:1 WYSIWYG-Vorschau | HOCH | NIEDRIG (Folge der Engine) | P1 |
| Elemente neu anordnen | HOCH | NIEDRIG | P1 |
| Bildgrößen anpassen | MITTEL | MEDIUM | P2 |
| Spacing-Drag-Regler | MITTEL | MEDIUM | P2 |
| Freie Schriftgröße/-stil | MITTEL | NIEDRIG | P2 |
| Format-Live-Switch | MITTEL | NIEDRIG | P2 |
| Umbrüche innerhalb von Elementen | HOCH | HOCH | P3 |

**Priority key:**
- P1: Muss in dieser Milestone gelöst werden
- P2: Sollte in dieser Milestone, kann notfalls auf nächste
- P3: Separater Planungsdurchlauf empfohlen

---

## Competitor Feature Analysis

| Feature | Planning Center / WorshipTools | Canva / Google Docs | HymnoScribe (aktuell) | HymnoScribe (Ziel) |
|---------|-------------------------------|---------------------|----------------------|-------------------|
| Print-WYSIWYG | Präsentation, kein Print-PDF | Canva: ja (canvas-basiert) | Nein (Divergenz) | Ja (einheitliche Engine) |
| Bildgrößen-Kontrolle | Nicht relevant (Slides) | Ja (Drag-Handles) | Nein (Vollbreite auto) | Ja (Breiten-Slider) |
| Spacing-Kontrolle | Nein | Ja (numerisch) | Nein (Konstanten im Code) | Ja (Drag-Regler) |
| Seitenumbrüche manuell | Nein | Ja | Teilweise | Vollständig |
| Elemente neu anordnen | Ja (Service Flow) | Ja | Nur zwischen Liedern | Auch innerhalb Lieder |
| Institution-Scope | Nein | Nein | Ja | Ja (bleibt) |
| Offline-fähig | Nein | Nein | Ja (localStorage) | Ja (bleibt) |

**Kernbeobachtung:** HymnoScribes Nische ist Print-Liedblatt für nicht-technische Kirchennutzer mit Multi-Tenant-Verwaltung. Kein Konkurrent trifft genau dieses Set. Der einzige Defekt (Preview ≠ Export) ist lösbar ohne Paradigmenwechsel.

---

## Sources

- Codebase-Direktanalyse: `frontend/js/generatePDF.js` vs `frontend/js/previewPageBreaks.js` — divergierende Konstanten dokumentiert (HIGH confidence)
- [Headless vs. WYSIWYG editors in JavaScript: The 2025 landscape — Nutrient](https://www.nutrient.io/blog/headless-vs-wysiwyg/)
- [Best Web-to-Print Editor SDKs - 2025 Guide — IMG.LY Blog](https://img.ly/blog/best-web-to-print-editor-sdks-your-2025-guide/)
- [Customer's Canvas: Text Engines — Aurigma](https://customerscanvas.com/dev/editors/concepts/text-engines.html) — Muster für einheitliche Client/Server Rendering-Engine (HIGH confidence)
- [CKEditor 5: Page Break Feature](https://ckeditor.com/docs/ckeditor5/latest/features/page-break.html) — Standard-Implementierungsmuster für manuelle Umbrüche (HIGH confidence)
- [Konva.js: Image Resize with drag handles](https://konvajs.org/docs/sandbox/Image_Resize.html) — Canvas-basierte Resize-Handles (MEDIUM confidence, Referenz-Implementierung)
- [Planning Center Services](https://www.planningcenter.com/services) — Competitor-Analyse (MEDIUM confidence)
- Projektdatei: `.planning/PROJECT.md` — validierte Requirements und Out-of-Scope

---
*Feature research for: WYSIWYG Songsheet/PDF Editor (HymnoScribe)*
*Researched: 2026-04-07*
