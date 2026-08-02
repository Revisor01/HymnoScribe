# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- Backend: `server.js` (single monolithic file)
- Frontend modules: lowercase with hyphens in HTML files (`admin.html`, `bibliothek.html`, `dashboard.html`), camelCase in JS files (`sessionManagement.js`, `liedblattManagement.js`, `generatePDF.js`)
- Utility files: descriptive camelCase (`generatePDF.js`, `dragAndDrop.js`, `sessionManagement.js`)

**Functions:**
- camelCase universally used: `saveSession()`, `loadSession()`, `authenticateToken()`, `handleDragStart()`, `updateLiedblatt()`, `cleanupUnusedImages()`
- Async functions marked with `async` keyword: `async function saveSession(name)`, `async function authenticateAdmin(req, res, next)`
- Event handlers prefix with action: `handleUserActions()`, `handleDragStart()`, `handleResendVerification()`
- Getter/initializer functions: `loadConfigFromLocalStorage()`, `getImagePath()`, `getContactEmailTemplate()`, `initializeDragAndDrop()`

**Variables:**
- camelCase: `globalConfig`, `alleObjekte`, `sessionData`, `selectedItems`, `userInstitution`, `emailContent`
- Database columns: snake_case in SQL queries: `institution_id`, `reset_token`, `email_verified`, `pending_email`, `verification_token`
- Constants: UPPER_SNAKE_CASE in JavaScript: `BASE_FONT_SIZE`, `HEADING_1_SCALE`, `MAX_STROPHES_BEFORE_BREAK`, `MIN_SPACE_FOR_NEXT_GROUP`
- Boolean variables: prefix with `is`, `has`, `should`: `preventPageBreak`, `isCopyright`, `isRefrain`, `isFirstOnPage`, `showTitle`

**Types/Objects:**
- Database objects returned as rows/records: `user[0]`, `users[0]`, representing destructured query results
- Objects passed as context objects: `context.page`, `context.y`, `context.fonts`, `context.width`, `context.height`, `context.margin`

## Code Style

**Formatting:**
- No ESLint or Prettier configuration detected (`.eslintrc*`, `.prettierrc*`, `biome.json` not present)
- Manual formatting observed:
  - 4-space indentation in backend (`server.js`)
  - 4-space indentation in frontend modules
  - Inconsistent spacing in some places (no automated enforcement)

**Linting:**
- No linting tool detected in project configuration
- Conventions appear to be followed through manual review and convention

## Import Organization

**Order:**
1. Core Node.js modules (`const express = require('express')`, `const path = require('path')`, `const fs = require('fs')`)
2. Third-party dependencies (`const cors = require('cors')`, `const mysql = require('mysql2/promise')`, `const jwt = require('jsonwebtoken')`)
3. File-based modules and utilities (not applicable in monolithic backend; frontend imports organize by feature)

**Path Aliases:**
- No path aliases detected in `backend/package.json`
- Frontend uses ES6 module imports: `import { ... } from './utils.js'`, `import { ... } from './sessionManagement.js'`

**Backend (CommonJS):**
```javascript
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const fsPromises = fs.promises;
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const compression = require('compression');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
```

**Frontend (ES6 Modules):**
```javascript
import {
    saveSession,
    loadSession,
    deleteSession,
    applySessionData,
    resetSession
} from './sessionManagement.js';

import {
    authenticatedFetch,
    customAlert,
    customConfirm,
    customPrompt,
    getImagePath
} from './utils.js';
```

## Error Handling

**Patterns:**
- Backend: try-catch blocks wrapping async database operations
- Consistent error logging with `console.error()`: `console.error('Fehler beim Senden der Kontaktnachricht:', error)`
- HTTP status codes returned in error responses:
  - `401` for missing/invalid tokens: `if (token == null) return res.sendStatus(401)`
  - `403` for authorization failures: `if (err || user.role !== 'super-admin') return res.sendStatus(403)`
  - `404` for not found: `if (user.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' })`
  - `400` for bad requests: `return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token' })`
  - `500` for server errors: `res.status(500).json({ error: 'Interner Serverfehler' })`
- Error messages returned as JSON: `res.status(500).json({ error: 'Interner Serverfehler', details: error.message })`
- Frontend: try-catch blocks, errors logged to console and displayed via `customAlert()`
- Some functions rethrow errors: `throw error` in `sendContactEmail()`

**Example from `server.js` (lines 225-243):**
```javascript
apiRouter.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (user.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        
        const resetToken = crypto.randomBytes(20).toString('hex');
        await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', 
            [resetToken, Date.now() + 3600000, user[0].id]);
        
        await sendPasswordResetEmail(email, resetToken);
        
        res.json({ message: 'E-Mail zum Zurücksetzen des Passworts wurde gesendet' });
    } catch (error) {
        console.error('Fehler beim Senden der Passwort-Reset-E-Mail:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
```

## Logging

**Framework:** `console.log()` and `console.error()` (built-in)

**Patterns:**
- Informational logs use `console.log()`: `console.log('Database config:', {...})`, `console.log('Contact email sent successfully')`
- Error logs use `console.error()`: `console.error('Fehler beim Senden der Kontaktnachricht:', error)`
- Log messages often in German: `'Führe geplante stündliche Bildbereinigung durch...'`, `'Fehler beim Abrufen der Sessions:'`
- Structured error logging with error object: `console.error('Fehler beim Löschen des Benutzers:', error)`
- Cron job logging: `console.log('Cron-Job Ergebnis: ${result.deletedCount} von ${result.scannedCount} Dateien gelöscht.')`
- No structured logging framework (Winston, Pino) detected

## Comments

**When to Comment:**
- Comments mark constant definitions with explanations: `const BASE_FONT_SIZE = 14; // Grundschriftgröße in Punkten`
- Comments explain non-obvious logic: `// Font auswählen basierend auf Formatierungsoptionen`
- Comments mark important operations: `// Wichtig: Rückgabe des direkt modifizierten Kontext-Objekts`
- Comments indicate new features or recent changes: `// NEU: Initialisierung der Vorschau-Format-Auswahl`, `// Neue Konstanten für Quill-Überschriften`
- Some sections have no comments (e.g., middleware functions)

**JSDoc/TSDoc:**
- JSDoc blocks used sparingly
- Example from `generatePDF.js` (lines 37-41):
```javascript
/**
* Fügt eine neue Seite hinzu und aktualisiert den Kontext
* @param {PDFContext} context - Der PDF-Kontext
* @returns {PDFContext} Der aktualisierte Kontext
*/
function addNewPage(context) {
```
- Example from `generatePDF.js` (lines 71-81):
```javascript
/**
* Zeichnet Text auf die aktuelle Seite
* @param {PDFContext} context - Der PDF-Kontext
* @param {string} text - Der zu zeichnende Text
* @param {number} x - X-Position
* @param {number} y - Y-Position
* @param {number} fontSize - Schriftgröße
* @param {number} maxWidth - Maximale Breite
* @param {Object} options - Weitere Optionen
* @returns {number} Die Höhe des gezeichneten Texts
*/
async function drawText(context, text, x, y, fontSize, maxWidth, options = {}) {
```

## Function Design

**Size:** 
- Backend functions tend to be 20-50 lines for route handlers
- Frontend utility functions typically 10-40 lines
- Largest file: `generatePDF.js` at 1919 lines (complex PDF generation logic)
- Large functions broken into logical sections with comments

**Parameters:**
- Route handlers: `(req, res, next)` pattern for Express middleware
- Database operations use parameter binding: `pool.query('SELECT * FROM users WHERE email = ?', [email])`
- Async functions consistently use `async/await` pattern
- Optional parameters passed as object: `drawText(context, text, x, y, fontSize, maxWidth, options = {})`
- Destructuring used for extracting properties: `const { name, email, message, inquiryType } = req.body`

**Return Values:**
- Backend endpoints return JSON responses: `res.json({ ... })` or `res.status(code).json({ ... })`
- Async functions return Promise-based values
- Frontend functions return Promises for async operations: `export async function saveSession(name)`
- Some functions return null on failure: `if (!imagePath) return null`
- Utility functions may throw errors: `throw new Error('...')`

## Module Design

**Exports:**
- Backend: monolithic `server.js` with no module exports (Express app definition only)
- Frontend: ES6 modules with named exports: `export async function saveSession()`, `export function loadImagePath()`
- All frontend utilities exported at module level (no default exports observed)

**Barrel Files:**
- No barrel files (index.js re-exports) detected in frontend
- Each module imports directly from specific files: `import { ... } from './sessionManagement.js'`

**Module Organization in Frontend:**

| File | Purpose | Exports |
|------|---------|---------|
| `utils.js` | Authentication, fetch, UI helpers | `authenticatedFetch()`, `checkAuthToken()`, `logout()`, `loadUserInfo()`, `getImagePath()`, `customAlert()`, `customConfirm()`, `customPrompt()` |
| `sessionManagement.js` | Session and template persistence | `saveSession()`, `loadSession()`, `deleteSession()`, `loadConfigFromLocalStorage()`, `applySessionData()`, `saveVorlage()`, `loadVorlage()`, `deleteVorlage()` |
| `liedblattManagement.js` | Adding/managing hymn sheet items | `addToSelected()`, `updateLiedblatt()`, `createLiedOptions()`, `addTrenner()`, `addPageBreak()`, `addFreierText()`, `addCustomImage()` |
| `generatePDF.js` | PDF generation with PDFLib | `generatePDF()` (window-attached), internal helper functions |
| `previewPageBreaks.js` | Page break preview logic | `updatePreviewWithPageBreaks()`, `initPreviewFormatSelector()` |
| `dragAndDrop.js` | Drag-and-drop item reordering | `initializeDragAndDrop()`, `handleDragStart()`, `handleDrop()`, `getDragAfterElement()` |
| `admin.js` | Admin interface logic | Various event handlers and data management functions |
| `bibliothek.js` | Library/song management | Library-specific functionality |
| `script.js` | Main initialization and global config | `applyGlobalConfig()`, `initializeApp()` |

---

*Convention analysis: 2026-04-07*
