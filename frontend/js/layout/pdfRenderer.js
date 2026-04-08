// frontend/js/layout/pdfRenderer.js
// Rendert einen LayoutResult auf ein pdf-lib PDFDocument.
// Konsumiert engine.js LayoutResult — kein DOM-Zugriff, kein globaler State.
//
// Y-Koordinaten-Konvention:
//   engine.js: y=0 ist Seitenoberkante (DOM-Konvention)
//   pdf-lib:   y=0 ist Seitenunterkante
//   Inversion: pdfY = pageSize.height - engineY - blockHeight
//   Textbasislinie (drawText): pdfY = pageSize.height - engineY - fontSize

import { embedFontsInDoc, getFontForStyle } from './fontManager.js';
import { PAGE_SIZES, MARGINS } from './constants.js';

/**
 * Rendert einen LayoutResult als pdf-lib PDFDocument.
 * @param {Object} layoutResult — Ausgabe von engine.calculateLayout()
 * @param {Object} config — { format, fontFamily, lineHeight, textAlign }
 * @param {Object} arrayBuffers — { regular, bold, italic, bolditalic } Font-ArrayBuffers
 * @param {ArrayBuffer|null} logoArrayBuffer — Logo-Bild als ArrayBuffer (optional)
 * @returns {Promise<PDFDocument>}
 */
export async function renderToPDF(layoutResult, config, arrayBuffers, logoArrayBuffer) {
    const { PDFDocument } = window.PDFLib;
    const fontkit = window.fontkit;

    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    // Fonts einbetten
    const fonts = await embedFontsInDoc(doc, arrayBuffers);

    const format = config.format || 'a5';
    const pageSize = PAGE_SIZES[format] || PAGE_SIZES['a5'];
    const lineHeightFactor = config.lineHeight || 1.5;

    // Logo einbetten falls vorhanden
    let logoImage = null;
    if (logoArrayBuffer) {
        try {
            logoImage = await _embedLogo(doc, logoArrayBuffer);
        } catch (e) {
            console.warn('pdfRenderer: Logo konnte nicht eingebettet werden:', e.message);
        }
    }

    // Seiten rendern
    for (const pageData of layoutResult.pages) {
        const page = doc.addPage([pageSize.width, pageSize.height]);

        // Logo auf jede Seite (oben rechts, 30pt Höhe, 30% Deckkraft)
        if (logoImage) {
            _drawLogo(page, logoImage, pageSize);
        }

        // Blöcke zeichnen
        for (const block of pageData.blocks) {
            try {
                await _drawBlock(page, doc, block, pageSize, fonts, lineHeightFactor, config);
            } catch (e) {
                console.error('pdfRenderer: Block-Render-Fehler:', e.message, block);
            }
        }
    }

    return doc;
}

// --- Private Hilfsfunktionen ---

async function _drawBlock(page, doc, block, pageSize, fonts, lineHeightFactor, config) {
    const { type, x, y, width, height, data } = block;

    if (type === 'text') {
        await _drawTextBlock(page, x, y, height, data, pageSize, fonts, lineHeightFactor, config);
    } else if (type === 'image') {
        await _drawImageBlock(page, doc, x, y, width, height, data, pageSize);
    } else if (type === 'icon') {
        // Icons: Trennlinie als einfache Linie
        const { rgb } = window.PDFLib;
        const pdfY = pageSize.height - y - height / 2;
        page.drawLine({
            start: { x, y: pdfY },
            end:   { x: x + width, y: pdfY },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
        });
    }
    // type='spacing' wird ignoriert (nur für engine-interne Abstände)
}

async function _drawTextBlock(page, engineX, engineY, blockHeight, data, pageSize, fonts, lineHeightFactor, config) {
    const { rgb } = window.PDFLib;
    const { lines, fontSize, fontStyle, alignment, lineHeight: lh, isCopyright, underline } = data;

    const font = getFontForStyle(fonts,
        fontStyle === 'bold' || fontStyle === 'boldItalic',
        fontStyle === 'italic' || fontStyle === 'boldItalic');

    const actualLineHeight = lh || lineHeightFactor;
    const lineHeightPt = fontSize * actualLineHeight;

    // Y-Inversion: engineY ist Oberkante des Blocks (y=0 oben)
    // Erste Textzeile Basislinie: pageHeight - engineY - fontSize
    let currentPdfY = pageSize.height - engineY - fontSize;

    const contentWidth = pageSize.width - MARGINS.left - MARGINS.right;

    for (const line of (lines || [])) {
        if (!line || !line.trim()) {
            currentPdfY -= lineHeightPt;
            continue;
        }

        let xPos = engineX;

        if (alignment === 'center') {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            xPos = engineX + (contentWidth - lineWidth) / 2;
        } else if (alignment === 'right') {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            xPos = engineX + contentWidth - lineWidth;
        }

        page.drawText(line, {
            x: xPos,
            y: currentPdfY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        });

        if (underline) {
            const lw = font.widthOfTextAtSize(line, fontSize);
            page.drawLine({
                start: { x: xPos, y: currentPdfY - 2 },
                end:   { x: xPos + lw, y: currentPdfY - 2 },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        currentPdfY -= lineHeightPt;
    }
}

async function _drawImageBlock(page, doc, engineX, engineY, width, height, data, pageSize) {
    if (!data.src) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(data.src, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();

        // Bildtyp anhand Magic Bytes erkennen
        const uint8 = new Uint8Array(buffer);
        const isPng = uint8[0] === 137 && uint8[1] === 80;
        const embeddedImage = isPng
            ? await doc.embedPng(buffer)
            : await doc.embedJpg(buffer);

        // Y-Inversion: pdfY ist Unterkante des Blocks
        const pdfY = pageSize.height - engineY - height;
        page.drawImage(embeddedImage, { x: engineX, y: pdfY, width, height, opacity: 1 });
    } catch (e) {
        console.error('pdfRenderer: Bild konnte nicht eingebettet werden:', data.src, e.message);
    }
}

async function _embedLogo(doc, logoArrayBuffer) {
    const uint8 = new Uint8Array(logoArrayBuffer);
    const isPng = uint8[0] === 137 && uint8[1] === 80;
    return isPng
        ? await doc.embedPng(logoArrayBuffer)
        : await doc.embedJpg(logoArrayBuffer);
}

function _drawLogo(page, logoImage, pageSize) {
    const logoHeight = 30;
    const aspectRatio = logoImage.width / logoImage.height;
    const logoWidth = logoHeight * aspectRatio;
    page.drawImage(logoImage, {
        x: pageSize.width - logoWidth - MARGINS.right,
        y: pageSize.height - logoHeight - MARGINS.top,
        width: logoWidth,
        height: logoHeight,
        opacity: 0.3,
    });
}
