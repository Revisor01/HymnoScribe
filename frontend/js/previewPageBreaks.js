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

// Skalieren eines Wertes basierend auf der globalen Schriftgröße
function scaleValue(value, fontSize) {
    return (value / BASE_FONT_SIZE) * fontSize;
}

/**
 * Berechnet die Höhe eines Elements in der Vorschau
 * @param {HTMLElement} element - Das zu messende Element
 * @param {Object} globalConfig - Die globale Konfiguration
 * @returns {number} - Die Höhe des Elements in Pixeln
 */
export function calculateElementHeight(element) {
    if (!element) return 0;
    
    const computedStyle = window.getComputedStyle(element);
    const marginTop = parseFloat(computedStyle.marginTop);
    const marginBottom = parseFloat(computedStyle.marginBottom);

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
    
    const elements = liedblattContent.children;
    const breaks = [];
    let currentHeight = 0;
    let pageNumber = 1;
    let currentPageElements = [];
    
    const elementsWithHeight = [];

    // Sammle alle Elemente und ihre geschätzte Höhe
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Wenn es ein manueller Seitenumbruch ist, beginne eine neue Seite
        if (element.classList.contains('page-break')) {
            if (currentPageElements.length > 0) {
                breaks.push({
                    type: 'manual',
                    afterElement: currentPageElements[currentPageElements.length - 1],
                    pageNumber: pageNumber
                });
                pageNumber++;
                currentHeight = 0;
                currentPageElements = [];
            }
            continue;
        }
        
        // Höhe des aktuellen Elements berechnen
        const elementHeight = calculateElementHeight(element);
        
        // Loggen der Elementhöhe für Debugging-Zwecke
        console.log(`Element ${i} (${element.tagName.toLowerCase()}${element.className ? '.' + element.className.split(' ').join('.') : ''}) Höhe: ${elementHeight}px`);
        
        elementsWithHeight.push({
            element: element,
            height: elementHeight,
            isTitle: element.querySelector('.item-title') !== null,
            isImageContent: element.classList.contains('image-content'),
            isStrophe: element.querySelector('.strophe') !== null,
            isRefrain: element.querySelector('.refrain') !== null
        });
    }

    // Verarbeite jetzt die Elemente mit der berechneten Höhe
    currentHeight = 0;
    
    for (let i = 0; i < elementsWithHeight.length; i++) {
        const { element, height, isTitle, isImageContent, isStrophe, isRefrain } = elementsWithHeight[i];
        
        // Füge das Element zur aktuellen Seite hinzu
        currentPageElements.push(element);
        
        // Wenn dieses Element auf die aktuelle Seite nicht passt
        if (currentHeight + height > availableHeight) {
            // Spezielle Regeln für Lieder
            let breakPosition = i - 1; // Standardmäßig vor dem aktuellen Element umbrechen
            
            // Prüfen ob Umbruch zwischen Titel und Strophe wäre
            let titleBeforeStrophe = false;
            if (i > 0 && elementsWithHeight[i-1].isTitle && (isStrophe || isRefrain)) {
                titleBeforeStrophe = true;
            }
            
            // Prüfen ob Umbruch innerhalb einer Strophe wäre
            let withinStrophe = false;
            if (isStrophe && i > 0 && elementsWithHeight[i-1].isStrophe) {
                withinStrophe = true;
            }
            
            // Wenn der Umbruch zwischen Titel und Strophe wäre oder innerhalb einer Strophe,
            // versuche einen besseren Umbruchpunkt zu finden
            if (titleBeforeStrophe || withinStrophe) {
                // Gehe zurück bis zum Anfang des Liedes/der Strophe
                let j = i - 1;
                while (j >= 0) {
                    if (!elementsWithHeight[j].isTitle && 
                        !elementsWithHeight[j].isStrophe && 
                        !elementsWithHeight[j].isRefrain) {
                        breakPosition = j;
                        break;
                    }
                    j--;
                }
            }
            
            // Füge einen Umbruch ein, wenn wir eine Position haben
            if (breakPosition >= 0 && breakPosition < elementsWithHeight.length) {
                breaks.push({
                    type: 'auto',
                    afterElement: elementsWithHeight[breakPosition].element,
                    pageNumber: pageNumber
                });
                
                // Berechne die Höhe neu für die nächste Seite
                currentHeight = 0;
                for (let j = breakPosition + 1; j <= i; j++) {
                    currentHeight += elementsWithHeight[j].height;
                }
                
                // Aktualisiere die aktuelle Seite
                pageNumber++;
                currentPageElements = elementsWithHeight.slice(breakPosition + 1, i + 1).map(e => e.element);
            } else {
                // Wenn kein passender Umbruchpunkt gefunden wurde, breche einfach vor dem aktuellen Element um
                breaks.push({
                    type: 'auto',
                    afterElement: elementsWithHeight[i-1].element,
                    pageNumber: pageNumber
                });
                pageNumber++;
                currentHeight = height;
                currentPageElements = [element];
            }
        } else {
            // Wenn es passt, aktualisiere einfach die aktuelle Höhe
            currentHeight += height;
        }
    }

    console.log("Berechnete Seitenumbrüche:", breaks);
    return breaks;
}

/**
 * Fügt Seitenumbrüche in die Vorschau ein
 * @param {Array} pageBreaks - Die berechneten Positionen der Seitenumbrüche
 */
export function applyPageBreaksToPreview(pageBreaks, format = 'a5') {
    const liedblattContent = document.getElementById('liedblatt-content');
    if (!liedblattContent) return;
    
    // Entferne bestehende Seitenvorschauelemente
    const existingPagePreviews = liedblattContent.querySelectorAll('.page-preview');
    existingPagePreviews.forEach(preview => {
        // Hole die Kindelemente und füge sie direkt in liedblattContent ein
        const children = Array.from(preview.children);
        children.forEach(child => {
            if (!child.classList.contains('page-preview-header')) {
                liedblattContent.insertBefore(child, preview);
            }
        });
        liedblattContent.removeChild(preview);
    });
    
    // Entferne alle bestehenden Seitenumbrüche in der Vorschau
    const existingBreaks = liedblattContent.querySelectorAll('.preview-page-break');
    existingBreaks.forEach(breakEl => breakEl.remove());
    
    // Wenn keine Seitenumbrüche vorhanden sind, beenden
    if (!pageBreaks || pageBreaks.length === 0) return;
    
    const pageSize = previewPageSizes[format] || previewPageSizes['a5'];
    
    // Umhülle Inhalte in Seitenvorschauelemente
    const allElements = Array.from(liedblattContent.children);
    let currentPageElements = [];
    let pageCounter = 1;
    
    // Erstelle die erste Seite
    let currentPage = document.createElement('div');
    currentPage.className = 'page-preview';
    currentPage.style.width = `${pageSize.width * 0.9}px`; // Etwas kleiner für die Anzeige
    
    // Füge den Seitenkopf hinzu
    const pageHeader = document.createElement('div');
    pageHeader.className = 'page-preview-header';
    pageHeader.textContent = `Seite ${pageCounter} - ${pageSize.name}`;
    currentPage.appendChild(pageHeader);
    
    liedblattContent.insertBefore(currentPage, liedblattContent.firstChild);
    
    // Füge die Elemente den Seiten hinzu
    for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        
        // Prüfe, ob nach diesem Element ein Umbruch kommt
        const hasBreakAfter = pageBreaks.some(breakInfo => 
            breakInfo.afterElement === element
        );
        
        // Füge das aktuelle Element zur Seite hinzu
        if (element.parentNode !== currentPage) {
            currentPage.appendChild(element);
        }
        
        // Wenn ein Umbruch kommt, erstelle eine neue Seite
        if (hasBreakAfter) {
            pageCounter++;
            
            // Erstelle eine neue Seite
            currentPage = document.createElement('div');
            currentPage.className = 'page-preview';
            currentPage.style.width = `${pageSize.width * 0.9}px`;
            
            // Füge den Seitenkopf hinzu
            const pageHeader = document.createElement('div');
            pageHeader.className = 'page-preview-header';
            pageHeader.textContent = `Seite ${pageCounter} - ${pageSize.name}`;
            currentPage.appendChild(pageHeader);
            
            liedblattContent.appendChild(currentPage);
        }
    }
}

/**
 * Aktualisiert die Vorschauansicht mit den berechneten Seitenumbrüchen
 * @param {string} format - Das gewählte Format (a5, dl, a4-schmal, a3-schmal)
 */
export function updatePreviewWithPageBreaks(format = 'a5') {
    console.log("Aktualisiere Vorschau mit Seitenumbrüchen für Format:", format);
    
    // Berechnete Seitenumbrüche
    const pageBreaks = calculatePageBreaksForPreview(format);
    
    // Anwenden der Seitenumbrüche in der Vorschau
    applyPageBreaksToPreview(pageBreaks, format);
}

/**
 * Initialisiert die Formatauswahl für die Vorschau
 */
export function initPreviewFormatSelector() {
    const previewFormatSelect = document.getElementById('previewFormat');
    if (!previewFormatSelect) return;
    
    // Event-Listener für Änderungen des Vorschauformats
    previewFormatSelect.addEventListener('change', (e) => {
        const selectedFormat = e.target.value;
        updatePreviewWithPageBreaks(selectedFormat);
    });
    
    // Initiale Aktualisierung mit dem Standardformat
    updatePreviewWithPageBreaks(previewFormatSelect.value);
}

// Export der Funktionen
export default {
    calculatePageBreaksForPreview,
    applyPageBreaksToPreview,
    updatePreviewWithPageBreaks,
    initPreviewFormatSelector
};