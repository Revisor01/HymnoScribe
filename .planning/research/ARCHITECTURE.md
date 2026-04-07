# Architecture Research

**Domain:** WYSIWYG Songsheet / PDF Editor (Multi-Tenant Web App)
**Researched:** 2026-04-07
**Confidence:** HIGH (based on direct codebase analysis)

## Standard Architecture

### System Overview — Target State

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Frontend)                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Editing Surface (DOM)                     │    │
│  │   drag-drop list  ·  spacing controls  ·  format toolbar    │    │
│  └────────────────────────────┬────────────────────────────────┘    │
│                               │ triggers                            │
│  ┌────────────────────────────▼────────────────────────────────┐    │
│  │                 Unified Layout Engine                        │    │
│  │                                                              │    │
│  │   LayoutDocument  →  LayoutPage[]  →  LayoutBlock[]         │    │
│  │   (format, margins, font settings)                          │    │
│  │                                                              │    │
│  │   calculateLayout(items, config) → LayoutResult             │    │
│  └──────────────┬──────────────────────────────┬──────────────┘    │
│                 │                              │                     │
│  ┌──────────────▼──────────────┐  ┌───────────▼──────────────┐    │
│  │     DOM Preview Renderer    │  │     PDF Renderer          │    │
│  │                             │  │                           │    │
│  │  renderToDOM(layoutResult)  │  │  renderToPDF(layoutResult)│    │
│  │  → #liedblatt-content       │  │  → pdf-lib PDFDocument    │    │
│  │  → page-break markers       │  │  → Blob download          │    │
│  └─────────────────────────────┘  └───────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     State Layer                             │    │
│  │   globalConfig (format, font, spacing)                      │    │
│  │   selectedItems (ordered list of objekt refs + options)     │    │
│  │   spacingOverrides (per-element user adjustments)           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
              │ REST API (authenticatedFetch)
┌─────────────▼────────────────────────────────────────────────────────┐
│                          EXPRESS BACKEND                             │
│                                                                      │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────┐      │
│  │  Routes  │  │ Controllers │  │ Middleware  │  │  Services │      │
│  │ auth/    │  │ AuthCtrl    │  │ authToken  │  │ EmailSvc  │      │
│  │ objekte/ │  │ ObjekteCtrl │  │ checkRole  │  │ FileSvc   │      │
│  │ sessions/│  │ SessionCtrl │  │ multer     │  │           │      │
│  │ admin/   │  │ AdminCtrl   │  │            │  │           │      │
│  └──────────┘  └─────────────┘  └────────────┘  └───────────┘      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Data Access (MySQL pool)                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Lives In |
|-----------|----------------|----------|
| Unified Layout Engine | Converts item list + config into a format-agnostic `LayoutResult` (pages, blocks, heights, break positions) | `frontend/js/layout/engine.js` (new) |
| DOM Preview Renderer | Consumes `LayoutResult`, inserts/removes page-break markers in `#liedblatt-content`, updates preview styles | `frontend/js/layout/domRenderer.js` (new, replaces previewPageBreaks.js) |
| PDF Renderer | Consumes same `LayoutResult`, draws to pdf-lib `PDFDocument` | `frontend/js/layout/pdfRenderer.js` (new, replaces core of generatePDF.js) |
| State Layer | `globalConfig`, `selectedItems`, per-element `spacingOverrides` — single source of truth | `frontend/js/state.js` (refactor of script.js) |
| Liedblatt Manager | DOM manipulation for the editing surface: add/remove items, drag-drop, Quill editors | `frontend/js/liedblattManagement.js` (existing, trimmed) |
| Session Manager | Serialise/deserialise editor state to/from JSON for API and localStorage | `frontend/js/sessionManagement.js` (existing) |
| Backend Routes | Express route definitions, no business logic | `backend/routes/*.js` (new split) |
| Backend Controllers | Request validation, DB queries, response shaping | `backend/controllers/*.js` (new split) |
| Middleware | authenticateToken, checkRole, multer, rate-limiting | `backend/middleware/*.js` (new split) |
| Services | Email sending, file cleanup — side-effectful helpers | `backend/services/*.js` (new split) |

## Recommended Project Structure

```
frontend/js/
├── layout/
│   ├── engine.js          # calculateLayout(items, config) → LayoutResult
│   ├── domRenderer.js     # renderToDOM(layoutResult, container)
│   └── pdfRenderer.js     # renderToPDF(layoutResult) → PDFDocument
├── state.js               # globalConfig, selectedItems, spacingOverrides
├── liedblattManagement.js # editing surface: add/remove/reorder items
├── sessionManagement.js   # save/load sessions and templates
├── dragAndDrop.js         # drag-drop handlers
├── utils.js               # authenticatedFetch, modal dialogs
├── script.js              # dashboard init (thin entry point, delegating to above)
├── admin.js
├── bibliothek.js
└── ...

backend/
├── server.js              # app bootstrap only (~50 lines)
├── routes/
│   ├── auth.js
│   ├── objekte.js
│   ├── sessions.js
│   ├── vorlagen.js
│   └── admin.js
├── controllers/
│   ├── authController.js
│   ├── objekteController.js
│   ├── sessionController.js
│   ├── vorlagenController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js            # authenticateToken, checkRole
│   └── upload.js          # multer configuration
└── services/
    ├── emailService.js
    └── fileService.js     # cleanupUnusedImages, file helpers
```

### Structure Rationale

- **layout/:** The three-file split (engine + two renderers) enforces the architectural rule: layout calculation is format-agnostic; only the renderers know about DOM vs pdf-lib. This is the core fix for the preview/PDF divergence.
- **state.js:** Pulling `globalConfig` and item state out of `script.js` into a dedicated module eliminates the current circular import problem (script.js ↔ liedblattManagement.js ↔ previewPageBreaks.js all import each other).
- **backend/routes vs controllers:** Routes become one-liners (`router.post('/login', authController.login)`). Controllers hold the SQL and business logic. This makes server.js a configuration file, not a codebase.
- **services/:** Email and file cleanup are side-effectful; isolating them makes them testable without the full Express request cycle.

## Architectural Patterns

### Pattern 1: Format-Agnostic Layout Model

**What:** The layout engine operates exclusively in PDF points (pt). It accepts a list of `LayoutItem` objects (content blocks with type, text, images, spacing overrides) and a `PageConfig` (format, margins, font settings), and returns a `LayoutResult`: an array of `LayoutPage`, each containing positioned `LayoutBlock` entries with `x`, `y`, `width`, `height` in pt.

**When to use:** Always — this is the foundation. Both renderers depend on it.

**Trade-offs:** The engine must faithfully predict text-wrapping height without a DOM. This is the hardest problem (see Pitfalls). For text, use the same font metrics that pdf-lib uses (`font.widthOfTextAtSize`) — they are reliable and available in the browser via the same TTF files already served from `/api/ttf`.

**Example:**
```javascript
// engine.js
export function calculateLayout(items, config) {
  // config: { format, fontSize, lineHeight, fontFamily, margins, spacingOverrides }
  // returns: { pages: [ { blocks: [ { type, x, y, width, height, data } ] } ] }
}
```

### Pattern 2: Two Renderers, One Result

**What:** `domRenderer.js` and `pdfRenderer.js` both accept the same `LayoutResult`. The DOM renderer inserts page-break markers between the correct DOM children. The PDF renderer draws each block onto pdf-lib pages.

**When to use:** PDF export and preview update both call `calculateLayout` first, then hand the result to their respective renderer.

**Trade-offs:** The DOM renderer cannot "draw" text from scratch — the DOM already contains the text. Its job is only to insert/move page-break dividers. It does NOT re-create DOM nodes. The PDF renderer does draw everything from scratch.

**Example:**
```javascript
// In script.js / on any change
const result = calculateLayout(selectedItems, globalConfig);
domRenderer.renderToDOM(result, document.getElementById('liedblatt-content'));
// On PDF export:
const pdfDoc = await pdfRenderer.renderToPDF(result, fonts, images);
```

### Pattern 3: Spacing Overrides in State

**What:** User-adjustable spacing (the "live fine control" feature) is stored as a `spacingOverrides` map keyed by `uniqueId`. The layout engine reads overrides from `config.spacingOverrides[item.uniqueId]` and uses them instead of defaults.

**When to use:** When the user drags a spacing slider or adjusts padding for a specific element.

**Trade-offs:** Overrides must be serialised into sessions and templates (already a JSON blob in DB). No schema change needed — overrides go into the existing `data` column.

## Data Flow

### Layout Update Flow (on any edit)

```
User action (add item / change font / drag slider)
    ↓
State update (selectedItems / globalConfig / spacingOverrides)
    ↓
calculateLayout(items, config)  ← engine.js
    ↓
LayoutResult (pages, blocks, positions in pt)
    ↓
domRenderer.renderToDOM(result)
    ↓
DOM updated: page-break markers repositioned, preview reflects PDF layout
```

### PDF Export Flow

```
User clicks "PDF exportieren"
    ↓
calculateLayout(items, config)  ← same engine, same config
    ↓
LayoutResult  ←  identical to what preview used
    ↓
pdfRenderer.renderToPDF(result, fonts, images)
    ↓
pdf-lib PDFDocument  →  Blob  →  download
```

### Session Save/Load Flow

```
Save: state (selectedItems + globalConfig + spacingOverrides)
    → JSON.stringify → POST /api/sessions → MySQL sessions.data

Load: GET /api/sessions/:id
    → JSON.parse → restore selectedItems, globalConfig, spacingOverrides
    → rebuild DOM (liedblattManagement.restoreItems)
    → calculateLayout + domRenderer (preview refresh)
```

### Backend Request Flow

```
Browser fetch (Authorization: Bearer token)
    ↓
Express router → middleware chain
    [authenticateToken] → [checkRole] → [multer if upload]
    ↓
Controller (validate input, query DB, shape response)
    ↓
MySQL pool  →  JSON response
```

## Build Order (Dependencies Between Components)

The order in which components should be built/refactored matters because of dependencies:

1. **State module (`state.js`)** — everything else imports config/items from here. Must exist before layout engine can accept its inputs.

2. **Layout Engine (`layout/engine.js`)** — depends only on state types and font metrics (no DOM, no pdf-lib). Can be developed and unit-tested independently. This is the highest-value deliverable.

3. **PDF Renderer (`layout/pdfRenderer.js`)** — depends on layout engine output + pdf-lib + font loading. Replaces the drawing logic in generatePDF.js. DOM-free.

4. **DOM Renderer (`layout/domRenderer.js`)** — depends on layout engine output + existing DOM structure. Replaces previewPageBreaks.js.

5. **Wire-up in script.js** — thin integration: on any state change, call engine → domRenderer. On export, call engine → pdfRenderer.

6. **Backend modularisation (routes/controllers/middleware/services)** — independent of frontend work. Can proceed in parallel. No user-facing behaviour changes; pure refactor.

7. **Spacing controls UI** — can only be built after state module and engine exist (overrides need a place to live and be consumed).

## Anti-Patterns

### Anti-Pattern 1: Duplicated Layout Constants

**What people do:** Copy the same `BASE_FONT_SIZE`, `STROPHE_SPACING`, `DEFAULT_OBJECT_SPACING` constants into both `generatePDF.js` and `previewPageBreaks.js` (current state: both files have these, with different values — e.g. `STROPHE_SPACING = 8` in generatePDF vs `6` in previewPageBreaks, `DEFAULT_OBJECT_SPACING = 15` vs `12`).

**Why it's wrong:** Any constant drift causes visible preview/PDF divergence. This is the root cause of the current "trial-and-error" problem documented in PROJECT.md.

**Do this instead:** All spacing constants live in `layout/engine.js` (or a shared `layout/constants.js`). Renderers never define their own spacing — they read the layout result.

### Anti-Pattern 2: DOM as Layout Oracle

**What people do:** `calculateElementHeight` in `previewPageBreaks.js` reads `element.offsetHeight` from the DOM and applies a correction factor. This means the layout calculation depends on browser rendering, which in turn depends on CSS, font loading state, and screen DPI.

**Why it's wrong:** `offsetHeight` is not the same as the PDF text height. Even with correction factors, it drifts as CSS changes. It also requires the DOM to exist before layout can be calculated.

**Do this instead:** Calculate text height using `font.widthOfTextAtSize` and line-wrapping logic in the engine, exactly as pdf-lib measures it. This produces height values in pt that are identical to what the PDF renderer will use.

### Anti-Pattern 3: Global State via `window.*`

**What people do:** `window.lastCalculatedBreakPositions` is used to pass page break data from `previewPageBreaks.js` to `generatePDF.js` (line 78 in previewPageBreaks.js).

**Why it's wrong:** Implicit coupling via global object. PDF generation silently depends on a preview calculation having run first. Race conditions possible with the debounce (300ms) in preview calculation.

**Do this instead:** Both renderers receive `LayoutResult` directly as a function argument. No shared mutable global state.

### Anti-Pattern 4: Monolithic Controller (Backend)

**What people do:** All 50 API endpoints, middleware, DB schema initialisation, cron job, and email helpers live in a single 1463-line `server.js`.

**Why it's wrong:** Impossible to test individual handlers, hard to locate code by feature, long-running operations block the module loading of unrelated features.

**Do this instead:** Routes in `routes/*.js`, handlers in `controllers/*.js`, shared middleware in `middleware/*.js`, side-effect helpers in `services/*.js`. `server.js` becomes an 80-line bootstrap file.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Key Constraint |
|----------|---------------|----------------|
| Layout Engine ↔ DOM Renderer | `LayoutResult` object (pure data, no DOM refs) | Engine must never import from or touch the DOM |
| Layout Engine ↔ PDF Renderer | `LayoutResult` object (pure data, no pdf-lib types) | Engine must never import pdf-lib |
| State ↔ Layout Engine | `items[]` + `config` passed as arguments (no global read) | Engine is a pure function: same inputs → same output |
| Liedblatt Manager ↔ State | Calls `state.addItem()`, `state.removeItem()`, `state.updateSpacing()` — state emits change events | Manager never reads globalConfig directly |
| Frontend ↔ Backend | REST over HTTPS, `authenticatedFetch` wrapper, JWT in Authorization header | All endpoints require institution_id scoping from JWT |

### External Services

| Service | Integration | Notes |
|---------|-------------|-------|
| pdf-lib (CDN/global) | `PDFLib` global via `<script>` tag — pdfRenderer.js destructures from it | Already working; keep as-is |
| Quill.js | Rich-text editor instances in `quillInstances` map | Quill content is serialised to HTML/Delta JSON; engine must parse inline formatting from Quill's HTML output |
| MySQL | `mysql2/promise` pool; all queries parameterised | No ORM; direct SQL stays (appropriate for this scale) |
| Nodemailer (SMTP) | Called only from `emailService.js` | Credentials from env vars |
| Multer | Upload middleware; stays in `middleware/upload.js` | File path references stored in DB as relative paths |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (~10-100 institutions) | Monolith is fine. Layout engine refactor is the priority, not infrastructure. |
| 100-1k institutions | Add DB connection pooling limits, basic query caching for `GET /api/objekte`. Layout engine runs entirely client-side — no server scaling needed for it. |
| 1k+ institutions | Consider institution-partitioned file storage (currently flat `uploads/` dir). The auth and institution-scoping model is already correct. |

First bottleneck to hit: the flat `uploads/` directory with thousands of files. Fix: subdirectory-per-institution (`uploads/{institution_id}/noten/`). The cron cleanup would need updating.

## Sources

- Direct analysis of `frontend/js/generatePDF.js` (1919 lines), `frontend/js/previewPageBreaks.js` (1007 lines), `backend/server.js` (1463 lines)
- `.planning/codebase/ARCHITECTURE.md` — existing architecture analysis
- `.planning/PROJECT.md` — requirements and constraints
- Pattern: "Shared layout model → two renderers" is standard in print/document editors (e.g. Google Docs, Paged.js architecture). Confidence HIGH based on domain knowledge.

---
*Architecture research for: HymnoScribe WYSIWYG Layout Unification*
*Researched: 2026-04-07*
