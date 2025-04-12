// previewPageBreaks.js

import { globalConfig } from './script.js';

// Werte aus generatePDF.js
const BASE_FONT_SIZE = 14;
const HEADING_1_SCALE = 1.6;
const HEADING_2_SCALE = 1.4;
const HEADING_3_SCALE = 1.2;
const COPYRIGHT_FONT_SIZE = 12;
const ICON_SIZE = 20;
const ICON_MARGIN = 25;
const DEFAULT_OBJECT_SPACING = 15;
const IMAGE_MARGIN_TOP = -10;
const IMAGE_MARGIN_BOTTOM = 15;
const STROPHE_SPACING = 8;

// Umrechnungsfaktoren für Maßeinheiten
const mmToPx = (mm) => mm * 3.8; // Ungefähre Umrechnung mm zu Pixel
const ptToPx = (pt) => pt * 1.33; // Ungefähre Umrechnung pt zu Pixel

// Seitengrößen in Pixeln für die Vorschau (basierend auf den PDF-Seitengrößen)
const previewPageSizes = {
    'a5': { 
        width: mmToPx(148), 
        height: mmToPx(210),
        name: 'DIN A5'
    },
    'dl': { 
        width: mmToPx(99), 
        height: mmToPx(210),
        name: 'DIN Lang'
    },
    'a4-schmal': { 
        width: mmToPx(105), 
        height: mmToPx(297),
        name: 'DIN A4 schmal'
    },
    'a3-schmal': { 
        width: mmToPx(148), 
        height: mmToPx(420),
        name: 'DIN A3 schmal'
    }
};

/**
 * Berechnet die Höhe eines Elements in der Vorschau
 * @param {HTMLElement} element - Das zu messende Element
 * @returns {number} - Die Höhe des Elements in Pixeln
 */
function calculateElementHeight(element) {
    if (!element) return 0;
    
    const computedStyle = window.getComputedStyle(element);
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const borderTopWidth = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottomWidth = parseFloat(computedStyle.borderBottomWidth) || 0;

    // Element-Höhe inklusive Padding, Border und Margin
    const totalHeight = element.offsetHeight + marginTop + marginBottom;
    
    // Umrechnen in ein vernünftiges Maß für die Vorschau
    return totalHeight;
}

/**
 * Berechnet alle Positionen für Seitenumbrüche in der Vorschau
 * @param {string} format - Das gewählte Format (a5, dl, a4-schmal, a3-schmal)
 * @returns {Array} - Ein Array mit den Positionen der Seitenumbrüche
 */
export function calculatePageBreaksForPreview(format = 'a5') {
    const pageSize = previewPageSizes[format] || previewPageSizes['a5'];
    const pageHeight = pageSize.height;
    
    // Standardseitenrand von oben und unten in Pixeln
    const margins = {
        top: 30 * 1.33, // 30pt in px
        bottom: 20 * 1.33 // 20pt in px
    };
    
    // Verfügbare Höhe für Inhalte auf einer Seite
    const availableHeight = pageHeight - margins.top - margins.bottom;
    
    // Alle Elemente im Liedblatt
    const liedblattContent = document.getElementById('liedblatt-content');
    
    if (!liedblattContent) return [];
    
    // Entferne zuerst alle bestehenden automatischen Seitenumbrüche
    const existingAutoBreaks = liedblattContent.querySelectorAll('.preview-page-break');
    existingAutoBreaks.forEach(breakEl => breakEl.remove());
    
    const elements = Array.from(liedblattContent.children);
    const breaks = [];
    let currentHeight = 0;
    let pageNumber = 1;
    
    // Array für Elemente mit ihren Eigenschaften
    const elementsWithProps = [];
    
    // Sammle alle Elemente und ihre Eigenschaften
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Überspringe bereits vorhandene Seitenumbruch-Marker
        if (element.classList.contains('preview-page-break')) {
            continue;
        }
        
        // Wenn es ein manueller Seitenumbruch ist
        if (element.classList.contains('page-break')) {
            elementsWithProps.push({
                element: element,
                isPageBreak: true,
                height: 0
            });
            continue;
        }
        
        // Höhe des Elements berechnen
        const elementHeight = calculateElementHeight(element);
        
        // Element-Typ bestimmen
        const isTitle = element.querySelector('.item-title') !== null;
        const isImageContent = element.classList.contains('image-content');
        const isStrophe = element.querySelector('.strophe') !== null;
        const isRefrain = element.querySelector('.refrain') !== null;
        
        elementsWithProps.push({
            element: element,
            height: elementHeight,
            isTitle: isTitle,
            isImageContent: isImageContent,
            isStrophe: isStrophe,
            isRefrain: isRefrain,
            isPageBreak: false
        });
    }
    
    // Aktuell verfügbare Höhe auf der ersten Seite
    let remainingHeight = availableHeight;
    
    // Iteriere durch die Elemente und berechne Seitenumbrüche
    for (let i = 0; i < elementsWithProps.length; i++) {
        const elementProps = elementsWithProps[i];
        
        // Bei einem manuellen Seitenumbruch
        if (elementProps.isPageBreak) {
            pageNumber++;
            remainingHeight = availableHeight;
            continue;
        }
        
        // Prüfen ob das Element auf die aktuelle Seite passt
        if (elementProps.height > remainingHeight) {
            // Element passt nicht auf aktuelle Seite - finde geeignete Umbruchstelle
            
            // Prüfen ob Umbruch zwischen Titel und Strophe wäre
            let titleBeforeStrophe = false;
            if (i > 0 && elementsWithProps[i-1].isTitle && 
                (elementProps.isStrophe || elementProps.isRefrain)) {
                titleBeforeStrophe = true;
            }
            
            // Prüfen ob Umbruch innerhalb einer Strophe wäre
            let withinStrophe = false;
            if (elementProps.isStrophe && i > 0 && elementsWithProps[i-1].isStrophe) {
                withinStrophe = true;
            }
            
            // Entscheiden, wo der Umbruch erfolgen soll
            let breakIndex = i - 1;
            
            // Wenn wir einen ungünstigen Umbruch haben, suchen wir einen besseren Umbruchpunkt
            if (titleBeforeStrophe || withinStrophe) {
                // Gehe zurück bis zum letzten nicht-Titel und nicht-Strophen Element
                for (let j = i - 1; j >= 0; j--) {
                    if (!elementsWithProps[j].isTitle && 
                        !elementsWithProps[j].isStrophe && 
                        !elementsWithProps[j].isRefrain) {
                        breakIndex = j;
                        break;
                    }
                }
            }
            
            // Füge den Seitenumbruch nach dem gefundenen Element hinzu
            if (breakIndex >= 0) {
                breaks.push({
                    afterElementIndex: breakIndex,
                    pageNumber: pageNumber,
                    type: 'auto'
                });
                
                // Erhöhe die Seitenzahl und setze die verfügbare Höhe zurück
                pageNumber++;
                remainingHeight = availableHeight;
                
                // Ziehe die Höhe des aktuellen Elements ab
                remainingHeight -= elementProps.height;
            } else {
                // Wenn kein passender Umbruchpunkt gefunden wurde
                remainingHeight = availableHeight - elementProps.height;
            }
        } else {
            // Element passt auf die aktuelle Seite
            remainingHeight -= elementProps.height;
        }
    }
    
    return { breaks, elementsWithProps };
}

/**
 * Fügt Seitenumbrüche in die Vorschau ein
 * @param {Object} breakData - Die berechneten Seitenumbrüche und Element-Informationen
 * @param {string} format - Das gewählte Format
 */
// In previewPageBreaks.js
export function applyPageBreaksToPreview(breakData, format = 'a5') {
    const { breaks, elementsWithProps } = breakData;
    const liedblattContent = document.getElementById('liedblatt-content');
    
    if (!liedblattContent || window.isUpdatingPageBreaks) return;
    
    // Event-Flag setzen, um Rekursion zu vermeiden
    window.isUpdatingPageBreaks = true;
    
    try {
        // Existierende Umbrüche entfernen
        const existingBreaks = liedblattContent.querySelectorAll('.preview-page-break');
        
        // Optimierung: Nur entfernen wenn nötig
        if (existingBreaks.length > 0) {
            existingBreaks.forEach(breakEl => breakEl.remove());
        }
        
        // Wenn keine Umbrüche vorhanden, direkt beenden
        if (!breaks || breaks.length === 0) {
            return;
        }
        
        // Das gewählte Format für die Anzeige
        const pageSize = previewPageSizes[format] || previewPageSizes['a5'];
        
        // DocumentFragment zur performanten DOM-Manipulation verwenden
        const fragment = document.createDocumentFragment();
        const markers = [];
        
        // Umbrüche erst sammeln
        breaks.forEach(breakInfo => {
            if (breakInfo.type === 'auto' && breakInfo.afterElementIndex >= 0 && 
                breakInfo.afterElementIndex < elementsWithProps.length) {
                    
                    const elementAfterBreak = elementsWithProps[breakInfo.afterElementIndex].element;
                    
                    // Erstelle die Umbruchmarkierung
                    const pageBreakMarker = document.createElement('div');
                    pageBreakMarker.className = 'preview-page-break';
                    pageBreakMarker.dataset.pageNumber = breakInfo.pageNumber;
                    pageBreakMarker.dataset.formatName = pageSize.name;
                    
                    markers.push({
                        marker: pageBreakMarker,
                        elementAfter: elementAfterBreak
                    });
                }
        });
        
        // Dann gesammelt einfügen, um DOM-Operationen zu minimieren
        markers.forEach(({ marker, elementAfter }) => {
            if (elementAfter.nextSibling) {
                liedblattContent.insertBefore(marker, elementAfter.nextSibling);
            } else {
                liedblattContent.appendChild(marker);
            }
        });
    } finally {
        // Flag zurücksetzen
        window.isUpdatingPageBreaks = false;
    }
}

/**
 * Aktualisiert die Vorschauansicht mit den berechneten Seitenumbrüchen
 * @param {string} format - Das gewählte Format (a5, dl, a4-schmal, a3-schmal)
 */
export function updatePreviewWithPageBreaks(format = 'a5') {
    console.log("Aktualisiere Vorschau mit Seitenumbrüchen für Format:", format);
    
    try {
        // Berechnete Seitenumbrüche
        const breakData = calculatePageBreaksForPreview(format);
        
        // Anwenden der Seitenumbrüche in der Vorschau
        applyPageBreaksToPreview(breakData, format);
    } catch (error) {
        console.error("Fehler bei der Berechnung der Seitenumbrüche:", error);
    }
}

/**
 * Initialisiert die Formatauswahl für die Vorschau
 */
export function initPreviewFormatSelector() {
    const previewFormatSelect = document.getElementById('previewFormat');
    if (!previewFormatSelect) {
        console.error("Format-Auswahl für Vorschau nicht gefunden!");
        return;
    }
    
    // Event-Listener mit Debouncing
    let formatChangeTimeout;
    previewFormatSelect.addEventListener('change', (e) => {
        if (formatChangeTimeout) {
            clearTimeout(formatChangeTimeout);
        }
        
        const selectedFormat = e.target.value;
        
        formatChangeTimeout = setTimeout(() => {
            window.isUpdatingPageBreaks = true;
            try {
                updatePreviewWithPageBreaks(selectedFormat);
            } finally {
                window.isUpdatingPageBreaks = false;
            }
        }, 200);
    });
    
    // Initiale Aktualisierung mit Verzögerung
    setTimeout(() => {
        window.isUpdatingPageBreaks = true;
        try {
            updatePreviewWithPageBreaks(previewFormatSelect.value);
        } finally {
            window.isUpdatingPageBreaks = false;
        }
    }, 500);
}

// Export der Funktionen
export default {
    calculatePageBreaksForPreview,
    applyPageBreaksToPreview,
    updatePreviewWithPageBreaks,
    initPreviewFormatSelector
};