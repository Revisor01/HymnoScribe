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

// Füge diese Hilfsfunktion hinzu (am Anfang der Datei oder im Funktionsbereich)
/**
* Bestimmt, ob ein Element ein Titel ist
* @param {HTMLElement} element - Das zu prüfende Element
* @returns {boolean} - True, wenn es sich um einen Titel handelt
*/
function isTitle(element) {
    return element.querySelector('.item-title') !== null;
}

/**
* Bestimmt, ob ein Element eine Strophe oder ein Refrain ist
* @param {HTMLElement} element - Das zu prüfende Element
* @returns {boolean} - True, wenn es sich um eine Strophe oder einen Refrain handelt
*/
function isStropheOrRefrain(element) {
    return element.querySelector('.strophe') !== null || element.querySelector('.refrain') !== null;
}

/**
* Prüft, ob ein Seitenumbruch an einer bestimmten Stelle vermieden werden sollte
* @param {Array} elements - Alle Elemente des Dokuments
* @param {number} currentIndex - Der aktuelle Index
* @returns {boolean} - True, wenn der Umbruch vermieden werden sollte
*/
function shouldAvoidPageBreak(elements, currentIndex) {
    if (currentIndex <= 0 || currentIndex >= elements.length) return false;
    
    const currentElement = elements[currentIndex];
    const nextElement = elements[currentIndex + 1];
    const prevElement = elements[currentIndex - 1];
    
    // Fall 1: Aktuelles Element ist ein Titel und das nächste eine Strophe/Refrain
    if (isTitle(currentElement) && nextElement && isStropheOrRefrain(nextElement)) {
        return true;
    }
    
    // Fall 2: Vorheriges Element ist eine Strophe und aktuelles auch
    if (prevElement && isStropheOrRefrain(prevElement) && isStropheOrRefrain(currentElement)) {
        return true;
    }
    
    return false;
}

/**
* Identifiziert zusammengehörige Elementgruppen, die nicht getrennt werden sollten
* @param {Array} elements - Alle Elemente im Dokument
* @returns {Array} - Array von Element-Gruppen
*/
function identifyElementGroups(elements) {
    const groups = [];
    let currentGroup = [];
    let inStropheGroup = false;
    let inTitleGroup = false;
    
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Manueller Seitenumbruch beendet eine Gruppe
        if (element.classList.contains('page-break')) {
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            inStropheGroup = false;
            inTitleGroup = false;
            continue;
        }
        
        // Prüfe, ob es ein Titel ist
        const isElementTitle = isTitle(element);
        
        // Prüfe, ob es eine Strophe oder ein Refrain ist
        const isElementStropheOrRefrain = isStropheOrRefrain(element);
        
        // Wenn wir einen Titel gefunden haben, beginne eine neue Titel-Gruppe
        if (isElementTitle) {
            // Wenn bereits eine Gruppe aktiv ist, beende sie
            if (currentGroup.length > 0 && !inTitleGroup) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            
            // Starte eine neue Titel-Gruppe
            currentGroup.push(element);
            inTitleGroup = true;
            continue;
        }
        
        // Wenn wir eine Strophe/Refrain nach einem Titel haben, füge es zur Titelgruppe hinzu
        if (isElementStropheOrRefrain && inTitleGroup) {
            currentGroup.push(element);
            continue;
        }
        
        // Wenn wir eine Strophe/Refrain haben, aber nicht in einer Titelgruppe sind
        if (isElementStropheOrRefrain) {
            // Wenn keine Gruppe aktiv ist, beginne eine neue
            if (currentGroup.length === 0) {
                currentGroup.push(element);
                inStropheGroup = true;
            } 
            // Wenn bereits eine Strophengruppe aktiv ist, füge es hinzu
            else if (inStropheGroup) {
                currentGroup.push(element);
            } 
            // Sonst beginne eine neue Gruppe
            else {
                groups.push([...currentGroup]);
                currentGroup = [element];
                inStropheGroup = true;
                inTitleGroup = false;
            }
            continue;
        }
        
        // Für andere Elemente, die nicht zu speziellen Gruppen gehören
        if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
        }
        
        currentGroup = [element];
        inStropheGroup = false;
        inTitleGroup = false;
    }
    
    // Füge die letzte Gruppe hinzu, falls vorhanden
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}
/**
 * Berechnet Seitenumbrüche basierend auf der PDF-Generierungslogik
 * @param {string} format - Das gewählte Format
 */

/**
* Berechnet alle Positionen für Seitenumbrüche in der Vorschau
* @param {string} format - Das gewählte Format (a5, dl, a4-schmal, a3-schmal)
* @returns {Object} - Berechnete Seitenumbrüche und Elementinformationen
*/
export function calculatePageBreaksForPreview(format = 'a5') {
    const liedblattContent = document.getElementById('liedblatt-content');
    if (!liedblattContent) return { breaks: [], elementsWithProps: [] };
    
    // PDF-Seitengröße und Seitenränder
    const pageSize = pageSizes[format];
    const margin = { top: 30, right: 20, bottom: 20, left: 20 };
    
    // Verfügbare Seitenhöhe (in PT)
    const availableHeight = pageSize.height - margin.top - margin.bottom;
    
    // Alle Elemente im Liedblatt analysieren (ohne bestehende Umbrüche)
    const elements = Array.from(liedblattContent.children).filter(el => 
        !el.classList.contains('preview-page-break')
    );
    
    // Elementeigenschaften sammeln
    const elementsWithProps = elements.map((element, index) => ({
        element: element,
        index: index,
        height: estimatePDFElementHeight(element, globalConfig),
        isTitle: element.querySelector('.item-title') !== null,
        isStrophe: element.querySelector('.strophe') !== null,
        isRefrain: element.querySelector('.refrain') !== null,
        isPageBreak: element.classList.contains('page-break')
    }));
    
    // Aktuelle Y-Position und Seitenumbrüche
    let currentY = pageSize.height - margin.top;
    let pageNumber = 1;
    const breaks = [];
    
    // Element-zu-Element durchgehen und Höhen schätzen
    for (let i = 0; i < elementsWithProps.length; i++) {
        const elementProps = elementsWithProps[i];
        
        // Manueller Seitenumbruch
        if (elementProps.isPageBreak) {
            breaks.push({
                afterElementIndex: i,
                pageNumber: pageNumber,
                type: 'manual'
            });
            pageNumber++;
            currentY = pageSize.height - margin.top;
            continue;
        }
        
        // Höhe des Elements berechnen
        let elementHeight = elementProps.height;
        
        // Prüfen, ob ein Umbruch nötig ist
        if (currentY - elementHeight < margin.bottom) {
            // Spezielle Behandlung: Titel nicht vom Inhalt trennen
            if (elementProps.isTitle && i < elementsWithProps.length - 1 && 
                (elementsWithProps[i+1].isStrophe || elementsWithProps[i+1].isRefrain)) {
                    // Wenn es ein Titel ist und danach ein Strophe oder Refrain kommt,
                    // schieben wir beides auf die nächste Seite
                    breaks.push({
                        afterElementIndex: i - 1 >= 0 ? i - 1 : i,
                        pageNumber: pageNumber,
                        type: 'auto'
                    });
                    pageNumber++;
                    currentY = pageSize.height - margin.top;
                } 
            // Spezielle Behandlung: Strophen nicht unterbrechen
            else if (elementProps.isStrophe && i > 0 && elementsWithProps[i-1].isStrophe) {
                // Suche nach dem Beginn der Strophengruppe
                let j = i - 1;
                while (j >= 0 && elementsWithProps[j].isStrophe) {
                    j--;
                }
                
                breaks.push({
                    afterElementIndex: j >= 0 ? j : i - 1,
                    pageNumber: pageNumber,
                    type: 'auto'
                });
                pageNumber++;
                currentY = pageSize.height - margin.top;
            }
            // Normale Umbruchbehandlung
            else {
                breaks.push({
                    afterElementIndex: i - 1 >= 0 ? i - 1 : i,
                    pageNumber: pageNumber,
                    type: 'auto'
                });
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
    
    return { breaks, elementsWithProps };
}

function calculatePDFLikePageBreaks(format) {
    const liedblattContent = document.getElementById('liedblatt-content');
    if (!liedblattContent) return;
    
    // PDF-Seitengröße und Seitenränder
    const pageSize = pageSizes[format];
    const margin = { top: 30, right: 20, bottom: 20, left: 20 };
    const contentWidth = pageSize.width - margin.left - margin.right;
    
    // Verfügbare Seitenhöhe (in PT)
    const availableHeight = pageSize.height - margin.top - margin.bottom;
    
    // Aktuelle Y-Position (in PT), beginnt am oberen Rand
    let currentY = pageSize.height - margin.top;
    let pageNumber = 1;
    
    // Alle Elemente im Liedblatt analysieren
    const elements = Array.from(liedblattContent.children).filter(el => 
        !el.classList.contains('preview-page-break')
    );
    
    console.log(`PDF-Berechnung für ${format}: ${elements.length} Elemente gefunden`);
    
    // Identifiziere die Element-Gruppen für intelligente Umbrüche
    const elementGroups = identifyElementGroups(elements);
    console.log("Identifizierte Elementgruppen:", elementGroups.length);
    
    // Debug: Gruppendetails ausgeben
    elementGroups.forEach((group, index) => {
        console.log(`Gruppe ${index + 1}: ${group.length} Elemente`);
        console.log(" - Erster Elementtyp:", group[0].tagName, Array.from(group[0].classList));
        const hasTitle = group.some(el => isTitle(el));
        const hasStrophe = group.some(el => isStropheOrRefrain(el));
        console.log(" - Enthält Titel:", hasTitle, "Enthält Strophe:", hasStrophe);
    });
    
    // Sammle Seitenumbrüche
    const breakPositions = [];
    
    // Gehe durch alle Gruppen und berechne deren Platz
    let processedElements = 0;
    
    for (let groupIndex = 0; groupIndex < elementGroups.length; groupIndex++) {
        const group = elementGroups[groupIndex];
        
        // Schätze die Höhe der gesamten Gruppe
        const groupHeight = estimateGroupHeight(group);
        console.log(`Gruppe ${groupIndex + 1}: Geschätzte Höhe ${groupHeight}pt, Verfügbarer Platz: ${currentY - margin.bottom}pt`);
        
        // Wenn die Gruppe auf die aktuelle Seite passt oder es die erste Gruppe auf der Seite ist
        if (currentY - groupHeight >= margin.bottom || currentY === pageSize.height - margin.top) {
            console.log(`Gruppe ${groupIndex + 1} passt auf aktuelle Seite`);
            // Gruppe passt auf die Seite, verarbeite alle Elemente
            for (const element of group) {
                const elementHeight = estimatePDFElementHeight(element, globalConfig);
                currentY -= elementHeight;
                
                // Standard-Abstand nach jedem Element
                currentY -= scaleValue(DEFAULT_OBJECT_SPACING, globalConfig.fontSize) * PX_TO_PT_RATIO;
                processedElements++;
            }
        } else {
            // Gruppe passt nicht auf aktuelle Seite, füge Umbruch ein
            if (processedElements > 0) {
                console.log(`Gruppe ${groupIndex + 1} passt nicht - Seitenumbruch nach Element ${processedElements}`);
                breakPositions.push({
                    afterElement: elements[processedElements - 1],
                    pageNumber: pageNumber,
                    type: 'auto'
                });
                
                pageNumber++;
                currentY = pageSize.height - margin.top;
                
                // Jetzt verarbeite die Gruppe auf der neuen Seite
                for (const element of group) {
                    const elementHeight = estimatePDFElementHeight(element, globalConfig);
                    currentY -= elementHeight;
                    
                    // Standard-Abstand nach jedem Element
                    currentY -= scaleValue(DEFAULT_OBJECT_SPACING, globalConfig.fontSize) * PX_TO_PT_RATIO;
                    processedElements++;
                }
            } else {
                // Es ist die erste Gruppe auf der Seite, aber zu groß - trotzdem versuchen
                console.log(`Gruppe ${groupIndex + 1} ist zu groß für eine Seite, aber wird trotzdem platziert (erste auf Seite)`);
                for (const element of group) {
                    const elementHeight = estimatePDFElementHeight(element, globalConfig);
                    currentY -= elementHeight;
                    
                    // Standard-Abstand nach jedem Element
                    currentY -= scaleValue(DEFAULT_OBJECT_SPACING, globalConfig.fontSize) * PX_TO_PT_RATIO;
                    processedElements++;
                    
                    // Wenn kein Platz mehr ist, füge Umbruch ein und setze Y zurück
                    if (currentY < margin.bottom && processedElements < elements.length) {
                        breakPositions.push({
                            afterElement: element,
                            pageNumber: pageNumber,
                            type: 'overflow'
                        });
                        pageNumber++;
                        currentY = pageSize.height - margin.top;
                    }
                }
            }
        }
    }
    
    console.log("Berechnete Seitenumbrüche:", breakPositions.length);
    
    // Gehe durch alle erkannten Bruchpositionen und füge Marker ein
    for (const breakInfo of breakPositions) {
        insertPageBreakMarker(breakInfo.afterElement, breakInfo.pageNumber, format);
    }
}

function estimateGroupHeight(group) {
    let totalHeight = 0;
    
    console.log("Schätze Gruppenhöhe für", group.length, "Elemente");
    
    // Vorabprüfung der Gruppe
    const hasTitle = group.some(el => isTitle(el));
    const hasStrophe = group.some(el => isStropheOrRefrain(el));
    
    // Zusätzlicher Puffer für Gruppen mit Titel und Strophen
    const groupBuffer = (hasTitle && hasStrophe) ? 20 : 0;
    
    for (const element of group) {
        const height = estimatePDFElementHeight(element, globalConfig);
        totalHeight += height;
        
        // Debugging für jedes Element
        console.log(` - Element (${element.tagName}): ${height}pt`);
        
        // Standard-Abstand zwischen Elementen
        totalHeight += scaleValue(DEFAULT_OBJECT_SPACING, globalConfig.fontSize) * PX_TO_PT_RATIO;
    }
    
    // Gruppenbuffer für komplexere Gruppen hinzufügen
    totalHeight += groupBuffer * PX_TO_PT_RATIO;
    
    console.log(`Geschätzte Gruppenhöhe: ${totalHeight}pt (mit Buffer: ${groupBuffer})`);
    return totalHeight;
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