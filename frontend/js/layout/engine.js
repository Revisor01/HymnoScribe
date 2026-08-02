// frontend/js/layout/engine.js
// Pure Layout-Engine — berechnet Positionen, Höhen und Seitenumbrüche.
// Kein DOM-Zugriff außer DOMParser (isoliertes Parsing, kein side-effect).
// Kein pdf-lib-Aufruf, kein globaler State, kein window.xxx.
//
// Konsumenten: pdfRenderer.js (zeichnet PDF) und domRenderer.js (zeichnet Vorschau).
// Beide erhalten identisches LayoutResult — das eliminiert Preview/PDF-Divergenz.

import { FONT, SPACING, MARGINS, PAGE_SIZES, LAYOUT } from './constants.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen (privat — nicht exportiert)
// ---------------------------------------------------------------------------

/**
 * Proportionale Skalierung wie in generatePDF.js.
 * @param {number} value - Basiswert in pt
 * @param {number} globalFontSize - Aktuell eingestellte Schriftgröße in pt
 * @returns {number} Skalierter Wert in pt
 */
function scaleValue(value, globalFontSize) {
    return (value / FONT.BASE_SIZE) * globalFontSize;
}

/**
 * Wählt den richtigen Font für eine Formatierungskombination.
 * Fallback-Kette: boldItalic → bold → regular / italic → regular.
 * @param {Object} fonts - { regular, bold, italic, bolditalic } PDFFont-Objekte
 * @param {boolean} bold
 * @param {boolean} italic
 * @returns {PDFFont}
 */
function getFontForStyle(fonts, bold, italic) {
    if (bold && italic) return fonts.bolditalic || fonts.bold || fonts.regular;
    if (bold)           return fonts.bold       || fonts.regular;
    if (italic)         return fonts.italic     || fonts.regular;
    return fonts.regular;
}

// ---------------------------------------------------------------------------
// Öffentliche Exports
// ---------------------------------------------------------------------------

/**
 * Teilt Text in Zeilen auf, die in maxWidth pt passen.
 * Autoritäre Höhenquelle für beide Renderer — splitTextToLines ist der
 * einzige Ort, an dem font.widthOfTextAtSize aufgerufen wird.
 *
 * Exakte Kopie aus generatePDF.js Zeilen 1425-1451.
 * (generatePDF.js wird in Plan 02-03 auf diesen Import umgestellt.)
 *
 * @param {string} text
 * @param {PDFFont} font - pdf-lib PDFFont mit widthOfTextAtSize
 * @param {number} fontSize - pt
 * @param {number} maxWidth - pt
 * @returns {Promise<string[]>}
 */
export async function splitTextToLines(text, font, fontSize, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = await font.widthOfTextAtSize(testLine, fontSize);

        if (width > maxWidth) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                lines.push(word);
            }
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
}

/**
 * Parst Quill-HTML via DOMParser.
 * Extrahiert Formatierung ausschließlich aus HTML-Markup —
 * Kein getComputedStyle, kein live-DOM-Zugriff.
 *
 * @param {string} htmlString - innerHTML eines .ql-editor Elements
 * @returns {Array<{text, tag, bold, italic, underline, alignment, isQuillHeading}>}
 */
export function parseQuillHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const runs = [];

    doc.body.querySelectorAll('p, h1, h2, h3, li').forEach(blockEl => {
        const tag = blockEl.tagName.toLowerCase();
        const alignment = blockEl.style.textAlign ||
                          blockEl.getAttribute('data-align') ||
                          'left';
        const isQuillHeading = blockEl.classList.contains('isQuillHeading') ||
                               blockEl.closest('[class*="isQuillHeading"]') !== null;

        const inlineEls = blockEl.querySelectorAll('strong, em, u, s, span');

        if (inlineEls.length === 0) {
            const text = (blockEl.textContent || '').trim();
            if (text) {
                runs.push({
                    text, tag,
                    bold: false, italic: false, underline: false,
                    alignment, isQuillHeading
                });
            }
        } else {
            // Walk child nodes für inline-Formatierungs-Runs
            blockEl.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (text) {
                        runs.push({
                            text, tag,
                            bold: false, italic: false, underline: false,
                            alignment, isQuillHeading
                        });
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const text = (node.textContent || '').trim();
                    if (!text) return;
                    runs.push({
                        text,
                        tag,
                        bold:      node.tagName === 'STRONG' || !!node.closest('strong'),
                        italic:    node.tagName === 'EM'     || !!node.closest('em'),
                        underline: node.tagName === 'U'      || !!node.closest('u'),
                        alignment,
                        isQuillHeading
                    });
                }
            });
        }
    });

    return runs;
}

/**
 * Hauptfunktion der Layout-Engine.
 * Pure async Funktion — kein DOM-Zugriff (außer DOMParser via parseQuillHTML),
 * kein globaler State, kein window.xxx.
 *
 * Y-Koordinaten-Konvention: y=0 ist Seitenoberkante (DOM-Konvention).
 * pdfRenderer muss invertieren: pdfY = pageHeight - y - blockHeight
 *
 * @param {HTMLElement[]} items - Array.from(liedblattContent.children)
 * @param {Object} config - { format, fontSize, lineHeight, textAlign, fontFamily }
 * @param {Object} fonts - { regular, bold, italic, bolditalic } PDFFont-Objekte
 * @param {Object} overrides - { spacingOverrides, imageSizeOverrides, fontSizeOverrides } aus overrideState.js
 * @returns {Promise<{pages: Array<{pageNumber: number, blocks: Array}>, totalPages: number}>}
 */
export async function calculateLayout(items, config, fonts, overrides = {}) {
    const format = config.format || 'a5';
    const pageSize = PAGE_SIZES[format] || PAGE_SIZES['a5'];
    const globalFontSize = config.fontSize || FONT.BASE_SIZE;
    const scaledFontSize = scaleValue(FONT.BASE_SIZE, globalFontSize);
    const lineHeightFactor = config.lineHeight || FONT.LINE_HEIGHT;
    const contentWidth = pageSize.width - MARGINS.left - MARGINS.right;

    const { spacingOverrides = {}, imageSizeOverrides = {}, fontSizeOverrides = {} } = overrides;

    const pages = [];
    let currentBlocks = [];
    let currentY = MARGINS.top; // y=0 ist Seitenoberseite, Beginn beim Rand

    // Schließt die aktuelle Seite ab und beginnt eine neue
    function newPage() {
        pages.push({ pageNumber: pages.length + 1, blocks: currentBlocks });
        currentBlocks = [];
        currentY = MARGINS.top;
    }

    /**
     * Berechnet Text-Block-Höhe und fügt Block zur aktuellen Seite hinzu.
     * Splittet Blöcke zeilenweise wenn sie die Seite überschreiten (ELEM-03).
     * While-Loop stellt mehrstufige Splits korrekt dar (Block > eine Seite).
     *
     * @param {string} text - Vollständiger Text (noch nicht in Zeilen aufgeteilt)
     * @param {number} fontSize - pt
     * @param {string} fontStyle - 'regular'|'bold'|'italic'|'boldItalic'
     * @param {string} alignment - 'left'|'center'|'right'
     * @param {number} extraSpacingAfter - pt-Abstand nach dem Block
     * @param {Object} flags - Zusätzliche Metadaten (isCopyright, isRefrain, etc.)
     */
    async function pushTextBlock(text, fontSize, fontStyle, alignment, extraSpacingAfter, flags) {
        const isBold   = fontStyle === 'bold'   || fontStyle === 'boldItalic';
        const isItalic = fontStyle === 'italic'  || fontStyle === 'boldItalic';
        const font = getFontForStyle(fonts, isBold, isItalic);
        const lines = await splitTextToLines(text, font, fontSize, contentWidth);
        const lineHeightPt = fontSize * lineHeightFactor;

        // Zeilenweiser Split — While-Loop für mehrstufige Splits (Block > eine Seite)
        let remaining = lines;
        let isFirstChunk = true;

        while (remaining.length > 0) {
            const available = (pageSize.height - MARGINS.bottom) - currentY;
            const fitsCount = Math.floor(available / lineHeightPt);

            // Zu wenig Platz für MIN_LINES_BEFORE_SPLIT Zeilen → Seitenumbruch, neu berechnen
            if (fitsCount < LAYOUT.MIN_LINES_BEFORE_SPLIT) {
                newPage();
                continue; // naechste While-Iteration berechnet fitsCount auf neuer Seite neu
            }

            let chunk;
            let spacingAfter;

            if (fitsCount >= remaining.length) {
                // Alles passt auf diese Seite — kein Split nötig
                chunk = remaining;
                remaining = [];
                spacingAfter = extraSpacingAfter;
            } else {
                // Split: erste fitsCount Zeilen auf diese Seite, Rest auf naechste
                chunk = remaining.slice(0, fitsCount);
                remaining = remaining.slice(fitsCount);
                spacingAfter = 0; // kein Abstand nach erstem Teil (Seite voll)
            }

            currentBlocks.push({
                type: 'text',
                x: MARGINS.left,
                y: currentY,
                width: contentWidth,
                height: chunk.length * lineHeightPt,
                data: {
                    lines: chunk,   // vorberechnete Zeilen — Renderer müssen nicht mehr splitten
                    fontSize,
                    fontStyle,
                    alignment: alignment || config.textAlign || 'left',
                    lineHeight: lineHeightFactor,
                    isSplitContinuation: !isFirstChunk, // Fortsetzung eines gesplitteten Blocks
                    ...flags
                }
            });

            currentY += chunk.length * lineHeightPt + spacingAfter;
            isFirstChunk = false;

            // Seitenumbruch nach diesem Chunk falls noch Zeilen verbleiben
            if (remaining.length > 0) {
                newPage();
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Item-Traversal — analoge Logik zu generatePDF.js processElementGroups
    // ---------------------------------------------------------------------------
    for (const item of items) {

        // Manueller Seitenumbruch — Marker am Ende der aktuellen Seite fuer domRenderer
        if (item.classList.contains('page-break')) {
            currentBlocks.push({
                type: 'page-break-marker',
                x: MARGINS.left,
                y: currentY,
                width: contentWidth,
                height: 16,
                data: { label: 'Manueller Seitenumbruch' }
            });
            newPage();
            continue;
        }

        // Trenner / Icon
        if (item.classList.contains('trenner')) {
            const iconType = item.getAttribute('data-icon-type') || 'line';
            const scaledIconSize   = scaleValue(SPACING.ICON_SIZE,   scaledFontSize);
            const scaledIconMargin = scaleValue(SPACING.ICON_MARGIN,  scaledFontSize);

            if (currentY + scaledIconSize > pageSize.height - MARGINS.bottom) newPage();

            currentBlocks.push({
                type: 'icon',
                x: MARGINS.left,
                y: currentY,
                width: contentWidth,
                height: scaledIconSize,
                data: { iconType }
            });
            currentY += scaledIconSize + scaledIconMargin;
            continue;
        }

        // Bild-Element (custom-image oder beliebiges img-Element)
        const imgEl = item.querySelector('img');
        if (imgEl) {
            // imageSizeOverride: widthFraction (0.1–1.0) skaliert Bildbreite
            const itemKey = item.getAttribute('data-override-key') || '';
            const imgSizeOverride = imageSizeOverrides[itemKey];
            const effectiveWidth = imgSizeOverride
                ? Math.max(10, imgSizeOverride.widthFraction * contentWidth)
                : contentWidth;

            const imgHeight = (imgEl.naturalHeight && imgEl.naturalWidth)
                ? (imgEl.naturalHeight / imgEl.naturalWidth) * effectiveWidth
                : 150; // Fallback falls naturalWidth/Height noch 0

            const scaledImgTop    = scaleValue(Math.abs(SPACING.IMAGE_TOP),    scaledFontSize);
            const scaledImgBottom = scaleValue(SPACING.IMAGE_BOTTOM, scaledFontSize);

            // IMAGE_TOP ist negativ (weniger Abstand vor Bildern)
            currentY += SPACING.IMAGE_TOP < 0 ? -scaledImgTop : scaledImgTop;

            if (currentY + imgHeight > pageSize.height - MARGINS.bottom) newPage();

            currentBlocks.push({
                type: 'image',
                x: MARGINS.left,
                y: currentY,
                width: effectiveWidth,
                height: imgHeight,
                data: {
                    src: imgEl.src,
                    naturalWidth: imgEl.naturalWidth,
                    naturalHeight: imgEl.naturalHeight,
                    overrideKey: itemKey,  // NEU: fuer domRenderer Bild-Resize-Handle
                    widthFraction: imgSizeOverride ? imgSizeOverride.widthFraction : 1.0
                }
            });
            currentY += imgHeight + scaledImgBottom;
            continue;
        }

        // overrideKey des aktuellen Items — fuer alle Bloecke dieses Items
        const currentItemOverrideKey = item.getAttribute('data-override-key') || '';

        // Freier Text (Quill) — item.classList enthält 'freier-text'
        const quillEditor = item.querySelector('.ql-editor');
        if (quillEditor) {
            const runs = parseQuillHTML(quillEditor.innerHTML);

            for (const run of runs) {
                let fontSize    = scaledFontSize;
                let marginTop   = 0;
                let marginBottom = 0;
                let fontStyle   = 'regular';

                // Heading-Skalierung und Abstände
                if (run.tag === 'h1' || run.isQuillHeading) {
                    fontSize     = scaledFontSize * FONT.H1_SCALE;
                    marginTop    = scaleValue(SPACING.QUILL_H1_TOP,    scaledFontSize);
                    marginBottom = scaleValue(SPACING.QUILL_H1_BOTTOM, scaledFontSize);
                } else if (run.tag === 'h2') {
                    fontSize     = scaledFontSize * FONT.H2_SCALE;
                    marginTop    = scaleValue(SPACING.QUILL_H2_TOP,    scaledFontSize);
                    marginBottom = scaleValue(SPACING.QUILL_H2_BOTTOM, scaledFontSize);
                } else if (run.tag === 'h3') {
                    fontSize     = scaledFontSize * FONT.H3_SCALE;
                    marginTop    = scaleValue(SPACING.QUILL_H3_TOP,    scaledFontSize);
                    marginBottom = scaleValue(SPACING.QUILL_H3_BOTTOM, scaledFontSize);
                }

                if (run.bold && run.italic) fontStyle = 'boldItalic';
                else if (run.bold)          fontStyle = 'bold';
                else if (run.italic)        fontStyle = 'italic';

                currentY += marginTop;
                await pushTextBlock(run.text, fontSize, fontStyle, run.alignment,
                    marginBottom, { isQuillHeading: run.isQuillHeading, overrideKey: currentItemOverrideKey });
            }

            currentY += scaleValue(SPACING.OBJECT_DEFAULT, scaledFontSize);

            // Spacing-Override-Marker nach Item einfuegen (fuer Spacing-Handle in domRenderer)
            const spacingOv = spacingOverrides[currentItemOverrideKey];
            if (spacingOv && typeof spacingOv.after === 'number') {
                currentBlocks.push({
                    type: 'spacing-override-marker',
                    x: MARGINS.left,
                    y: currentY,
                    width: contentWidth,
                    height: 0,
                    data: { overrideKey: currentItemOverrideKey, afterPt: spacingOv.after }
                });
                currentY += spacingOv.after;
            }
            continue;
        }

        // Standard Lied-Item — Titel + Strophen/Refrains/Copyright
        const subElements = item.querySelectorAll(
            'h1, h2, h3, p, .copyright-info, .strophe, .refrain'
        );

        for (const subEl of subElements) {
            // innerText ist DOM-Accessor — als reine Text-Quelle (kein Layout-Zugriff)
            const text = (subEl.innerText || subEl.textContent || '').trim();
            if (!text) continue;

            const isCopyright = subEl.classList.contains('copyright-info');
            const isRefrain   = subEl.classList.contains('refrain');
            const isStrophe   = subEl.classList.contains('strophe');

            let fontSize     = scaledFontSize;
            let marginTop    = 0;
            let marginBottom = 0;
            let fontStyle    = 'regular';

            if (subEl.tagName === 'H1') {
                fontSize     = scaledFontSize * FONT.H1_SCALE;
                fontStyle    = 'bold';
                marginBottom = scaleValue(SPACING.TITLE_BOTTOM, scaledFontSize);
            } else if (subEl.tagName === 'H2') {
                fontSize = scaledFontSize * FONT.H2_SCALE;
            } else if (subEl.tagName === 'H3') {
                fontSize = scaledFontSize * FONT.H3_SCALE;
            } else if (isCopyright) {
                fontSize     = scaleValue(FONT.COPYRIGHT_SIZE, scaledFontSize);
                marginTop    = scaleValue(SPACING.COPYRIGHT_TOP,    scaledFontSize);
                marginBottom = scaleValue(SPACING.COPYRIGHT_BOTTOM, scaledFontSize);
            }

            if (isStrophe || isRefrain) {
                marginBottom = scaleValue(SPACING.STROPHE, scaledFontSize);
            }

            currentY += marginTop;
            await pushTextBlock(text, fontSize, fontStyle, config.textAlign,
                marginBottom, { isCopyright, isRefrain, isStrophe, overrideKey: currentItemOverrideKey });
        }

        currentY += scaleValue(SPACING.OBJECT_DEFAULT, scaledFontSize);

        // Spacing-Override-Marker nach Item einfuegen (fuer Spacing-Handle in domRenderer)
        const spacingOvStd = spacingOverrides[currentItemOverrideKey];
        if (spacingOvStd && typeof spacingOvStd.after === 'number') {
            currentBlocks.push({
                type: 'spacing-override-marker',
                x: MARGINS.left,
                y: currentY,
                width: contentWidth,
                height: 0,
                data: { overrideKey: currentItemOverrideKey, afterPt: spacingOvStd.after }
            });
            currentY += spacingOvStd.after;
        }
    }

    // Letzte Seite abschließen (auch wenn leer, aber nur wenn mindestens ein Block)
    if (currentBlocks.length > 0) {
        pages.push({ pageNumber: pages.length + 1, blocks: currentBlocks });
    }

    return { pages, totalPages: pages.length };
}
