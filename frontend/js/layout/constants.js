// frontend/js/layout/constants.js
// Single source of truth für alle Layout-Konstanten.
// Alle Werte in pt (PDF-Punkte). Bei Divergenz zwischen generatePDF.js und
// previewPageBreaks.js gewinnt immer der PDF-Wert — das ist was gedruckt wird.

const mmToPt = (mm) => mm * 2.83465;

export const FONT = {
    BASE_SIZE: 14,        // pt — Grundschriftgröße
    H1_SCALE: 1.6,
    H2_SCALE: 1.4,
    H3_SCALE: 1.2,
    COPYRIGHT_SIZE: 12,   // pt — PDF-Wert gewinnt (previewPageBreaks.js hatte 10)
    LINE_HEIGHT: 1.5,     // Standard-Zeilenhöhe (Faktor, nicht pt)
};

export const SPACING = {
    STROPHE: 8,           // pt — PDF-Wert gewinnt (previewPageBreaks.js hatte 6)
    OBJECT_DEFAULT: 15,   // pt — PDF-Wert gewinnt (previewPageBreaks.js hatte 12)
    TITLE_BOTTOM: 6,      // pt — nur in previewPageBreaks.js vorhanden, sinnvoll übernehmen
    STROPHE_BOTTOM: 8,    // pt — nur in previewPageBreaks.js vorhanden, sinnvoll übernehmen
    IMAGE_TOP: -10,       // pt — nur in generatePDF.js
    IMAGE_BOTTOM: 15,     // pt — nur in generatePDF.js
    ICON_SIZE: 20,        // pt
    ICON_MARGIN: 25,      // pt
    COPYRIGHT_TOP: -5,    // pt
    COPYRIGHT_BOTTOM: -5, // pt
    QUILL_H1_TOP: 0,
    QUILL_H1_BOTTOM: 12,
    QUILL_H2_TOP: 5,
    QUILL_H2_BOTTOM: 10,
    QUILL_H3_TOP: 5,
    QUILL_H3_BOTTOM: 5,
};

export const MARGINS = {
    top: 30,    // pt
    right: 20,  // pt
    bottom: 20, // pt
    left: 20,   // pt
};

export const PAGE_SIZES = {
    'a5':        { width: mmToPt(148), height: mmToPt(210) },   // 419.53 x 595.28 pt
    'dl':        { width: mmToPt(99),  height: mmToPt(210) },   // 280.63 x 595.28 pt
    'a4-schmal': { width: mmToPt(105), height: mmToPt(297) },   // 297.64 x 841.89 pt
    'a3-schmal': { width: mmToPt(148), height: mmToPt(420) },   // 419.53 x 1190.55 pt
};

export const LAYOUT = {
    MAX_STROPHES_BEFORE_BREAK: 3,
    MAX_PSALM_LINES_BEFORE_BREAK: 4,
    MIN_SPACE_FOR_NEXT_GROUP: 50,  // pt — Mindestplatz für nächste Gruppe
    MIN_LINES_BEFORE_SPLIT: 2,     // Mindestzeilen auf einer Seite vor Split (Orphan-Schutz)
};

// DOM-Renderer: pt → px Umrechnungsfaktor (96 DPI / 72 pt per inch)
export const PT_TO_PX = 96 / 72; // 1.3333...
