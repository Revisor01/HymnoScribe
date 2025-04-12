// previewPageBreaks.js - optimierte Version mit PDF-ähnlicher Logik

import { globalConfig } from './script.js';

// Seitengrößen von generatePDF.js übernehmen
const mmToPt = (mm) => mm * 2.83465;
const PX_TO_PT_RATIO = 0.75;
const pxToPt = (px) => px * PX_TO_PT_RATIO;

// Direkt aus generatePDF.js kopiert
const pageSizes = {
    'a5': { width: mmToPt(148), height: mmToPt(210) },
    'dl': { width: mmToPt(99), height: mmToPt(210) },
    'a4-schmal': { width: mmToPt(105), height: mmToPt(297) },
    'a3-schmal': { width: mmToPt(148), height: mmToPt(420) }
};

// Umrechnung von PT (PDF) zu PX (Vorschau)
const ptToPx = (pt) => pt / PX_TO_PT_RATIO;

// Konstanten für die Berechnung (aus generatePDF.js)
const BASE_FONT_SIZE = 14;
const HEADING_1_SCALE = 1.6;
const HEADING_2_SCALE = 1.4;
const HEADING_3_SCALE = 1.2;
const COPYRIGHT_FONT_SIZE = 12;
const STROPHE_SPACING = 8;
const DEFAULT_OBJECT_SPACING = 15;

// Debouncing für die Berechnung
let calculateTimeout = null;
let isCalculating = false;

/**
 * Aktualisiert die Vorschauansicht mit den berechneten Seitenumbrüchen
 * @param {string} format - Das gewählte Format (a5, dl, a4-schmal, a3-schmal)
 */
export function updatePreviewWithPageBreaks(format = 'a5') {
    // Debouncing implementieren
    if (calculateTimeout) {
        clearTimeout(calculateTimeout);
    }
    
    calculateTimeout = setTimeout(() => {
        if (isCalculating) return;
        isCalculating = true;
        
        try {
            console.log("Aktualisiere Vorschau mit Seitenumbrüchen für Format:", format);
            
            // Entferne vorhandene Seitenumbrüche
            const liedblattContent = document.getElementById('liedblatt-content');
            if (!liedblattContent) return;
            
            const existingBreaks = liedblattContent.querySelectorAll('.preview-page-break');
            existingBreaks.forEach(breakEl => breakEl.remove());
            
            // Berechne Seitenumbrüche mit PDF-ähnlicher Logik
            calculatePDFLikePageBreaks(format);
        } catch (error) {
            console.error("Fehler bei der Seitenumbruchberechnung:", error);
        } finally {
            isCalculating = false;
        }
    }, 300);
}

/**
 * Berechnet Seitenumbrüche basierend auf der PDF-Generierungslogik
 * @param {string} format - Das gewählte Format
 */
function calculatePDFLikePageBreaks(format) {
    const liedblattContent = document.getElementById('liedblatt-content');
    if (!liedblattContent) return;
    
    // PDF-Seitengröße und Seitenränder
    const pageSize = pageSizes[format];
    const margin = { top: 30, right: 20, bottom: 20, left: 20 };
    
    // Verfügbare Seitenhöhe (in PT)
    const availableHeight = pageSize.height - margin.top - margin.bottom;
    
    // Aktuelle Y-Position (in PT), beginnt am oberen Rand
    let currentY = pageSize.height - margin.top;
    let pageNumber = 1;
    
    // Alle Elemente im Liedblatt analysieren
    const elements = Array.from(liedblattContent.children).filter(el => 
        !el.classList.contains('preview-page-break')
    );
    
    // Element-zu-Element durchgehen und Höhen schätzen
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Manueller Seitenumbruch
        if (element.classList.contains('page-break')) {
            pageNumber++;
            currentY = pageSize.height - margin.top;
            continue;
        }
        
        // Elementtyp bestimmen für spezielle Behandlung
        const isTitle = element.querySelector('.item-title') !== null;
        const isStrophe = element.querySelector('.strophe') !== null;
        const isRefrain = element.querySelector('.refrain') !== null;
        const isImage = element.querySelector('img') !== null;
        
        // Höhe des Elements in PT berechnen (angepasst an PDF-Logik)
        let elementHeight = estimatePDFElementHeight(element, globalConfig);
        
        // Prüfen, ob ein Umbruch nötig ist
        if (currentY - elementHeight < margin.bottom) {
            // Spezielle Behandlung: Titel nicht vom Inhalt trennen
            if (isTitle && i < elements.length - 1 && 
                (elements[i+1].querySelector('.strophe') || elements[i+1].querySelector('.refrain'))) {
                // Wenn es ein Titel ist und danach ein Strophe oder Refrain kommt,
                // schieben wir beides auf die nächste Seite
                insertPageBreakMarker(elements[i-1] || element, pageNumber, format);
                pageNumber++;
                currentY = pageSize.height - margin.top;
            } 
            // Spezielle Behandlung: Strophen nicht unterbrechen
            else if (isStrophe && i > 0 && elements[i-1].querySelector('.strophe')) {
                // Suche nach dem Beginn der Strophengruppe
                let j = i - 1;
                while (j >= 0 && elements[j].querySelector('.strophe')) {
                    j--;
                }
                
                insertPageBreakMarker(elements[j], pageNumber, format);
                pageNumber++;
                currentY = pageSize.height - margin.top;
            }
            // Normale Umbruchbehandlung
            else {
                insertPageBreakMarker(elements[i-1] || element, pageNumber, format);
                pageNumber++;
                currentY = pageSize.height - margin.top - elementHeight;
            }
        } else {
            // Element passt auf die aktuelle Seite
            currentY -= elementHeight;
        }
        
        // Nach jedem Element einen Standardabstand abziehen
        currentY -= scaleValue(DEFAULT_OBJECT_SPACING, globalConfig.fontSize) * PX_TO_PT_RATIO;
    }
}

/**
 * Fügt eine Seitenumbruchmarkierung nach dem angegebenen Element ein
 * @param {HTMLElement} elementBefore - Element vor dem Umbruch
 * @param {number} pageNumber - Aktuelle Seitennummer
 * @param {string} format - Gewähltes Format
 */
function insertPageBreakMarker(elementBefore, pageNumber, format) {
    if (!elementBefore || !elementBefore.parentNode) return;
    
    const formatName = getFormatName(format);
    const pageBreakMarker = document.createElement('div');
    pageBreakMarker.className = 'preview-page-break';
    pageBreakMarker.textContent = `Seite ${pageNumber} endet hier (${formatName})`;
    
    elementBefore.parentNode.insertBefore(pageBreakMarker, elementBefore.nextSibling);
}

/**
 * Schätzt die Höhe eines Elements wie sie im PDF sein würde
 * @param {HTMLElement} element - Das zu messende Element
 * @param {Object} config - Die globale Konfiguration
 * @returns {number} - Die geschätzte Höhe in PT
 */
function estimatePDFElementHeight(element, config) {
    const computedStyle = window.getComputedStyle(element);
    
    // Grundlegende Höhe vom DOM
    let baseHeight = element.offsetHeight;
    
    // Schriftgröße und Zeilenabstand berücksichtigen
    const fontSize = parseFloat(config.fontSize || 12);
    const lineHeight = parseFloat(config.lineHeight || 1.5);
    
    // Besondere Behandlung für bestimmte Elementtypen
    if (element.querySelector('.item-title')) {
        // Titel haben größere Schrift
        baseHeight *= HEADING_3_SCALE;
    }
    
    if (element.querySelector('.strophe') || element.querySelector('.refrain')) {
        // Text zählen und Zeilenanzahl schätzen
        const textContent = element.textContent || '';
        const totalChars = textContent.length;
        const charsPerLine = 50; // Geschätzte Zeichen pro Zeile
        const estimatedLines = Math.ceil(totalChars / charsPerLine);
        
        // Höhe basierend auf Zeilenanzahl, Schriftgröße und Zeilenabstand
        const lineHeightPx = fontSize * lineHeight;
        baseHeight = estimatedLines * lineHeightPx;
        
        // Zusätzlicher Abstand für Strophen
        baseHeight += STROPHE_SPACING;
    }
    
    if (element.querySelector('img')) {
        // Bilder direkt messen
        const img = element.querySelector('img');
        baseHeight = img.offsetHeight;
    }
    
    // Margins hinzufügen
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    baseHeight += marginTop + marginBottom;
    
    // In PT umrechnen für PDF-Kompatibilität
    return baseHeight * PX_TO_PT_RATIO;
}

/**
 * Skaliert einen Wert basierend auf der Schriftgröße
 * @param {number} value - Der zu skalierende Wert
 * @param {number} fontSize - Die Schriftgröße
 * @returns {number} - Der skalierte Wert
 */
function scaleValue(value, fontSize) {
    return (value / BASE_FONT_SIZE) * fontSize;
}

/**
 * Gibt den lesbaren Namen des Formats zurück
 * @param {string} format - Der Format-Schlüssel
 * @returns {string} - Der lesbare Name
 */
function getFormatName(format) {
    const formatNames = {
        'a5': 'DIN A5',
        'dl': 'DIN Lang',
        'a4-schmal': 'DIN A4 schmal',
        'a3-schmal': 'DIN A3 schmal'
    };
    return formatNames[format] || format;
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
    
    // Event-Listener für Änderungen
    previewFormatSelect.addEventListener('change', (e) => {
        const selectedFormat = e.target.value;
        
        // Speichern des Formats in der Konfiguration
        if (globalConfig) {
            globalConfig.previewFormat = selectedFormat;
            try {
                localStorage.setItem('liedblattConfig', JSON.stringify(globalConfig));
            } catch (error) {
                console.error("Fehler beim Speichern der Konfiguration:", error);
            }
        }
        
        // Aktualisierung der Vorschau
        updatePreviewWithPageBreaks(selectedFormat);
    });
    
    // Initiale Aktualisierung
    requestAnimationFrame(() => {
        setTimeout(() => {
            updatePreviewWithPageBreaks(previewFormatSelect.value);
        }, 500);
    });
}

// Export der Funktionen
export default {
    updatePreviewWithPageBreaks,
    initPreviewFormatSelector
};