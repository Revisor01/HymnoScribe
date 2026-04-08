// frontend/js/layout/domRenderer.js
// Rendert einen LayoutResult als seitenweise DOM-Vorschau.
// Konsumiert engine.js LayoutResult — kein pdf-lib-Zugriff, kein globaler State.
//
// Jede Seite im LayoutResult wird als .preview-page div dargestellt (weisses Rechteck).
// Blöcke werden als absolute-positioned Kinder innerhalb der Seite positioniert.
// Y-Koordinaten aus LayoutResult werden direkt als CSS top-Wert genutzt (nach pt→px).
//
// Sicherheit: el.textContent = line (nicht innerHTML) — verhindert XSS aus Liedtext (T-02-03-01).

import { PT_TO_PX, PAGE_SIZES } from './constants.js';

/**
 * Rendert LayoutResult als seitenweise DOM-Vorschau.
 * Leert den Container komplett und baut neue Seiten-Divs.
 * Synchron — kein async (alle Maße kommen aus LayoutResult, kein Font-Laden nötig).
 *
 * @param {Object} layoutResult — Ausgabe von engine.calculateLayout()
 * @param {Object} config — { format, fontFamily, fontSize, lineHeight, textAlign }
 * @param {HTMLElement} container — z.B. document.getElementById('liedblatt-content')
 */
export function renderToDOM(layoutResult, config, container) {
    if (!container) {
        console.error('domRenderer: Container nicht gefunden');
        return;
    }

    // Container vollständig leeren — kein Akkumulieren alter Seiten
    container.innerHTML = '';

    // Container-Styling für seitenweise Darstellung
    container.style.padding = '20px 0';
    container.style.background = '#e8e8e8';
    container.style.overflowY = 'auto';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';

    const format = config.format || 'a5';
    const pageSize = PAGE_SIZES[format] || PAGE_SIZES['a5'];
    const fontFamily = config.fontFamily || 'Jost';

    for (const pageData of layoutResult.pages) {
        const pageEl = _createPageElement(pageSize, fontFamily);
        pageEl.setAttribute('data-page-number', pageData.pageNumber);

        for (const block of pageData.blocks) {
            try {
                const blockEl = _createBlockElement(block, config);
                if (blockEl) pageEl.appendChild(blockEl);
            } catch (e) {
                console.error('domRenderer: Block-Render-Fehler:', e.message, block);
            }
        }

        container.appendChild(pageEl);
    }
}

// --- Private Hilfsfunktionen ---

/**
 * Erstellt ein Seiten-Div mit exakten pt→px-Abmessungen.
 * @param {Object} pageSize — { width, height } in pt
 * @param {string} fontFamily
 * @returns {HTMLDivElement}
 */
function _createPageElement(pageSize, fontFamily) {
    const el = document.createElement('div');
    el.className = 'preview-page';
    el.style.position   = 'relative';
    el.style.width      = `${_ptToPx(pageSize.width)}px`;
    el.style.height     = `${_ptToPx(pageSize.height)}px`;
    el.style.background = '#ffffff';
    el.style.boxShadow  = '0 2px 8px rgba(0,0,0,0.15)';
    el.style.margin     = '16px auto';
    el.style.flexShrink = '0';
    el.style.fontFamily = fontFamily;
    el.style.overflow   = 'hidden';
    return el;
}

/**
 * Erstellt ein Block-Element abhängig vom block.type.
 * @param {Object} block — LayoutResult Block
 * @param {Object} config
 * @returns {HTMLElement|null}
 */
function _createBlockElement(block, config) {
    const { type, x, y, width, height, data } = block;

    if (type === 'text') {
        return _createTextElement(x, y, width, height, data, config);
    } else if (type === 'image') {
        return _createImageElement(x, y, width, height, data);
    } else if (type === 'icon') {
        return _createIconElement(x, y, width, height, data);
    }
    // type='spacing' — kein DOM-Element nötig
    return null;
}

/**
 * Erstellt ein absolut positioniertes Text-Div.
 * Jede Zeile ist ein eigenes div mit expliziter Zeilenhöhe — exakte Übereinstimmung
 * mit engine.js Höhenberechnung (Pitfall: CSS line-height am Container allein reicht nicht).
 * Sicherheit: textContent statt innerHTML — kein XSS (T-02-03-01).
 */
function _createTextElement(x, y, width, height, data, config) {
    const el = document.createElement('div');
    el.style.position   = 'absolute';
    el.style.left       = `${_ptToPx(x)}px`;
    el.style.top        = `${_ptToPx(y)}px`;
    el.style.width      = `${_ptToPx(width)}px`;
    el.style.fontSize   = `${_ptToPx(data.fontSize)}px`;
    el.style.lineHeight = String(data.lineHeight || 1.5);
    el.style.textAlign  = data.alignment || config.textAlign || 'left';
    el.style.fontFamily = 'inherit';
    el.style.overflow   = 'hidden';

    // Font-Stil
    const isBold   = data.fontStyle === 'bold' || data.fontStyle === 'boldItalic';
    const isItalic = data.fontStyle === 'italic' || data.fontStyle === 'boldItalic';
    el.style.fontWeight = isBold ? 'bold' : 'normal';
    el.style.fontStyle  = isItalic ? 'italic' : 'normal';

    // Copyright-Styling
    if (data.isCopyright) {
        el.style.color = '#666';
    }

    // Zeilen als einzelne Divs mit expliziter Höhe — exakte Übereinstimmung mit Engine
    const lineHeightPx = _ptToPx(data.fontSize) * (data.lineHeight || 1.5);
    for (const line of (data.lines || [])) {
        const lineEl = document.createElement('div');
        lineEl.style.height     = `${lineHeightPx}px`;
        lineEl.style.lineHeight = `${lineHeightPx}px`;
        lineEl.style.whiteSpace = 'nowrap';
        lineEl.style.overflow   = 'hidden';
        lineEl.textContent      = line; // textContent — kein XSS-Risiko
        el.appendChild(lineEl);
    }

    return el;
}

/**
 * Erstellt ein absolut positioniertes Bild-Div.
 * img.src wird direkt aus data.src gesetzt — gleicher Auth-Mechanismus wie restliche API-Calls.
 */
function _createImageElement(x, y, width, height, data) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left     = `${_ptToPx(x)}px`;
    el.style.top      = `${_ptToPx(y)}px`;
    el.style.width    = `${_ptToPx(width)}px`;
    el.style.height   = `${_ptToPx(height)}px`;
    el.style.overflow = 'hidden';

    if (data.src) {
        const img = document.createElement('img');
        img.src = data.src;
        img.style.width      = '100%';
        img.style.height     = '100%';
        img.style.objectFit  = 'contain';
        el.appendChild(img);
    }

    return el;
}

/**
 * Erstellt ein absolut positioniertes Icon-Div (Trennlinie).
 */
function _createIconElement(x, y, width, height, data) {
    const el = document.createElement('div');
    el.style.position       = 'absolute';
    el.style.left           = `${_ptToPx(x)}px`;
    el.style.top            = `${_ptToPx(y)}px`;
    el.style.width          = `${_ptToPx(width)}px`;
    el.style.height         = `${_ptToPx(height)}px`;
    el.style.display        = 'flex';
    el.style.alignItems     = 'center';
    el.style.justifyContent = 'center';
    el.className = 'preview-icon-block';

    // Trennlinie als HR
    const hr = document.createElement('hr');
    hr.style.width     = '100%';
    hr.style.border    = 'none';
    hr.style.borderTop = '1px solid #bbb';
    hr.style.margin    = '0';
    el.appendChild(hr);

    return el;
}

/**
 * Konvertiert pt nach px (96 DPI Standard).
 * Nutzt PT_TO_PX aus constants.js (96/72 = 1.3333...).
 * @param {number} pt
 * @returns {number} px
 */
function _ptToPx(pt) {
    return pt * PT_TO_PX;
}
