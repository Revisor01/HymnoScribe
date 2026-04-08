# Milestones

## v1.0 WYSIWYG Liedblatt-Editor (Shipped: 2026-04-08)

**Phases completed:** 4 phases, 14 plans, 16 tasks

**Key accomplishments:**

- helmet@8.1.0 als erste Middleware mit CDN-CSP, CORS ohne Wildcard-Fallback via URL-Env-Validierung (process.exit), und drei Security-Libraries installiert
- One-liner:
- Auth-Middleware extrahiert, Rate Limiter (4 Instanzen, 3-5 Versuche/15min) und Input-Validierungsketten (7 Chains) fuer alle HIGH-Risk-Endpoints erstellt
- 35 Zeilen
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- overrideState.js als zentrales Override-Modul mit geclamten Settern, engine.js-Signatererweiterung mit imageSizeOverrides, globalem Font-Size-Preset-Dropdown (8–24pt) in der Toolbar und per-Element-Override-Input neben jedem Liedblatt-Element
- Stabile data-override-key Attribute in updateLiedblatt(), overrideKey in engine.js block.data, Spacing- und Bild-Resize-Handles in domRenderer und Pointer-Event-Delegation mit setPointerCapture in previewPageBreaks
- SortableJS-basierte Strophen/Refrain-Liste in createLiedOptions() mit elementOrder-Serialisierung und vollstaendigem Backward-Compat-Zweig in updateLiedblatt()
- Session-Serialisierung auf versioniertes Wrapper-Format { version: 1, items, overrides } umgestellt, Backward-Compat fuer altes Array-Format in allen Lade-Pfaden, generatePDF.js uebergibt getOverrides() an calculateLayout
- One-liner:

---
