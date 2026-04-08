// frontend/js/layout/fontManager.js
// Font-Manager: lädt und cached Font-ArrayBuffers, trennt Laden von Embedding.
// ArrayBuffers sind format-agnostisch (nutzbar für pdf-lib und DOM).
// pdf-lib-spezifisches embedFont() ruft erst pdfRenderer.js auf.

const arrayBufferCache = new Map(); // key: "FontFamily-Style", value: ArrayBuffer

const FONT_FAMILY_MAPPING = {
    'Playfair Display': 'PlayfairDisplay',
    'Crimson Text': 'CrimsonText',
    'Open Sans': 'OpenSans',
    'Alegreya Sans': 'AlegreyaSans',
    'Andada Pro': 'AndadaPro',
    'Bodoni Moda': 'BodoniModa',
};

const FONT_STYLES = ['Regular', 'Bold', 'Italic', 'BoldItalic'];

function normalizeFamily(fontFamily) {
    const trimmed = fontFamily.trim();
    return FONT_FAMILY_MAPPING[trimmed] || trimmed.replace(/\s+/g, '');
}

/**
 * Lädt ArrayBuffers für alle Stile einer Schriftfamilie.
 * Cached Ergebnisse — mehrfache Aufrufe laden nicht erneut.
 * @param {string} fontFamily - z.B. 'Jost', 'Playfair Display'
 * @returns {Promise<Object>} { regular, bold, italic, bolditalic } — je ArrayBuffer
 */
export async function loadFontArrayBuffers(fontFamily) {
    const formattedFamily = normalizeFamily(fontFamily);
    const result = {};

    for (const style of FONT_STYLES) {
        const cacheKey = `${formattedFamily}-${style}`;
        if (arrayBufferCache.has(cacheKey)) {
            result[style.toLowerCase()] = arrayBufferCache.get(cacheKey);
            continue;
        }

        const url = `/api/ttf/${formattedFamily}-${style}.ttf`;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status} für ${url}`);

            const buffer = await response.arrayBuffer();
            arrayBufferCache.set(cacheKey, buffer);
            result[style.toLowerCase()] = buffer;
        } catch (error) {
            console.error(`fontManager: Fehler beim Laden von ${cacheKey}:`, error);
            if (style !== 'Regular' && result.regular) {
                console.warn(`fontManager: Nutze Regular als Fallback für ${style}`);
                result[style.toLowerCase()] = result.regular;
            } else if (style === 'Regular') {
                throw new Error(`fontManager: Regular-Font nicht ladbar für ${fontFamily}: ${error.message}`);
            }
        }
    }

    if (!result.regular) {
        throw new Error(`fontManager: Kein Regular-Font für ${fontFamily}`);
    }

    return result;
}

/**
 * Bettet ArrayBuffers in ein PDFDocument ein.
 * Gibt PDFFont-Objekte zurück — nur für pdfRenderer.js gedacht.
 * @param {PDFDocument} doc - pdf-lib PDFDocument
 * @param {Object} arrayBuffers - { regular, bold, italic, bolditalic } ArrayBuffers
 * @returns {Promise<Object>} { regular, bold, italic, bolditalic } — PDFFont-Objekte
 */
export async function embedFontsInDoc(doc, arrayBuffers) {
    const embedded = {};
    const embedOptions = { subset: true, features: { liga: true, kern: true } };

    for (const [style, buffer] of Object.entries(arrayBuffers)) {
        try {
            const font = await doc.embedFont(buffer, embedOptions);
            if (!font || typeof font.widthOfTextAtSize !== 'function') {
                throw new Error(`Eingebetteter Font für ${style} hat kein widthOfTextAtSize`);
            }
            // Schnelltest
            const testWidth = font.widthOfTextAtSize('Test', 12);
            if (typeof testWidth !== 'number' || isNaN(testWidth)) {
                throw new Error(`widthOfTextAtSize defekt für ${style}`);
            }
            embedded[style] = font;
        } catch (error) {
            console.error(`fontManager: Embed-Fehler für ${style}:`, error);
            if (style !== 'regular' && embedded.regular) {
                embedded[style] = embedded.regular;
            } else if (style === 'regular') {
                throw error;
            }
        }
    }

    return embedded;
}

/**
 * Wählt den richtigen PDFFont für eine Formatierungskombination.
 * @param {Object} fonts - { regular, bold, italic, bolditalic } PDFFont-Objekte
 * @param {boolean} bold
 * @param {boolean} italic
 * @returns {PDFFont}
 */
export function getFontForStyle(fonts, bold, italic) {
    if (bold && italic) return fonts.bolditalic || fonts.bold || fonts.regular;
    if (bold)           return fonts.bold       || fonts.regular;
    if (italic)         return fonts.italic     || fonts.regular;
    return fonts.regular;
}

/** Cache leeren (z.B. für Tests oder Font-Wechsel) */
export function clearFontCache() {
    arrayBufferCache.clear();
}
