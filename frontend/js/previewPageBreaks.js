// previewPageBreaks.js - Optimierte Version für akkurate PDF-ähnliche Seitenumbrüche

import { globalConfig } from './script.js';

// Umrechnungskonstanten für Maßeinheiten
const mmToPt = (mm) => mm * 2.83465;
const PX_TO_PT_RATIO = 0.75;
const pxToPt = (px) => px * PX_TO_PT_RATIO;
const ptToPx = (pt) => pt / PX_TO_PT_RATIO;

// Seitengrößen wie in generatePDF.js
const pageSizes = {
    'a5': { width: mmToPt(148), height: mmToPt(210) },
    'dl': { width: mmToPt(99), height: mmToPt(210) },
    'a4-schmal': { width: mmToPt(105), height: mmToPt(297) },
    'a3-schmal': { width: mmToPt(148), height: mmToPt(420) }
};

// Konstanten für Abstandsberechnungen und Formatierung
// Optimierte Werte für weniger Seiten
const BASE_FONT_SIZE = 14;
const HEADING_1_SCALE = 1.6;
const HEADING_2_SCALE = 1.4;
const HEADING_3_SCALE = 1.2;
const COPYRIGHT_FONT_SIZE = 10;
const STROPHE_SPACING = 6;  // Reduziert von 8
const DEFAULT_OBJECT_SPACING = 12; // Reduziert von 15
const TITLE_MARGIN_BOTTOM = 6; // Reduziert von 8
const STROPHE_MARGIN_BOTTOM = 8; // Reduziert von 10

// Konstanten für Elemente, die nicht getrennt werden sollten
const MIN_ELEMENT_HEIGHT_FOR_SPLIT = 180; // Reduziert von 200
const MIN_SPACE_FOR_NEXT_GROUP = 50;      // Reduziert von 60

// Debouncing-Variablen
let calculateTimeout = null;
let isCalculating = false;

/**
 * Aktualisiert die Vorschauansicht mit berechneten Seitenumbrüchen
 * @param {string} format - Das gewählte Papierformat (a5, dl, usw.)
 */
export function updatePreviewWithPageBreaks(format = 'a5') {
    if (calculateTimeout) {
        clearTimeout(calculateTimeout);
    }
    
    calculateTimeout = setTimeout(() => {
        if (isCalculating) return;
        isCalculating = true;
        
        try {
            console.log("Aktualisiere Vorschau mit Seitenumbrüchen für Format:", format);
            
            // Entferne vorhandene Seitenumbrüche aus der Vorschau
            const liedblattContent = document.getElementById('liedblatt-content');
            if (!liedblattContent) return;
            
            const existingBreaks = liedblattContent.querySelectorAll('.preview-page-break');
            existingBreaks.forEach(breakEl => breakEl.remove());
            
            // Berechne Seitenumbrüche basierend auf der PDF-Generierungslogik
            const { breakPositions } = calculatePrecisePageBreaks(format);
            
            // Füge Seitenumbruch-Marker in die Vorschau ein
            breakPositions.forEach(breakInfo => {
                insertPageBreakMarker(breakInfo.element, breakInfo.pageNumber, format);
            });
            
            // Speichere die Umbruchinformationen für die PDF-Generierung
            window.lastCalculatedBreakPositions = breakPositions;
            
        } catch (error) {
            console.error("Fehler bei der Seitenumbruchberechnung:", error);
        } finally {
            isCalculating = false;
        }
    }, 300);
}

/**
* Berechnet präzise Seitenumbruchpositionen unter Berücksichtigung semantischer Regeln
* @param {string} format - Das gewählte Papierformat
* @returns {Object} Informationen zu Seitenumbrüchen
*/
function calculatePrecisePageBreaks(format) {
    const liedblattContent = document.getElementById('liedblatt-content');
    if (!liedblattContent) return { breakPositions: [] };
    
    // PDF-Seitengröße und Ränder
    const pageSize = pageSizes[format];
    const margin = { top: 30, right: 20, bottom: 20, left: 20 };
    
    // Verfügbare Höhe für Inhalt auf einer Seite
    const availableHeight = pageSize.height - margin.top - margin.bottom;
    
    // Alle Content-Elemente (ohne bestehende Umbrüche)
    const elements = Array.from(liedblattContent.children).filter(el => 
        !el.classList.contains('preview-page-break')
    );
    
    // Stellen sicher, dass alle Elemente eine ID haben
    elements.forEach((element, index) => {
        if (!element.getAttribute('data-liedblatt-id') && !element.getAttribute('data-original-id')) {
            element.setAttribute('data-liedblatt-id', `element-${index}-${Date.now()}`);
        }
    });
    
    // Identifiziere semantische Gruppen (Titel mit Inhalten, Strophenblöcke usw.)
    const elementGroups = identifySemanticGroups(elements);
    console.log(`${elementGroups.length} semantische Gruppen identifiziert`);
    
    // Positionsverfolgung und Ergebnissammlung
    let currentY = availableHeight;
    let currentPage = 1;
    const breakPositions = [];
    
    // Semantische Zähler für die Umbruchslogik
    let stropheCounter = 0;
    let lastStropheElement = null;
    
    // Verarbeite alle Gruppen und entscheide über Seitenumbrüche
    elementGroups.forEach((group, groupIndex) => {
        // Manuellen Seitenumbruch prüfen
        if (group.length === 1 && group[0].classList.contains('page-break')) {
            breakPositions.push({
                element: group[0],
                pageNumber: currentPage,
                type: 'manual'
            });
            currentPage++;
            currentY = availableHeight;
            
            // Semantische Zähler zurücksetzen
            stropheCounter = 0;
            lastStropheElement = null;
            return;
        }
        
        // Berechne Gruppenhöhe mit verbesserter Genauigkeit
        const groupHeight = calculateGroupHeight(group);
        console.log(`Gruppe ${groupIndex + 1}: Höhe=${groupHeight}pt, Platz=${currentY}pt`);
        
        // Entscheide, ob die Gruppe auf die aktuelle Seite passt
        if (groupHeight <= currentY) {
            // Gruppe passt komplett - prüfe auf semantische Umbrüche innerhalb der Gruppe
            let elementY = currentY;
            
            for (let i = 0; i < group.length; i++) {
                const element = group[i];
                const elementHeight = calculateElementHeight(element);
                
                // Prüfe semantische Umbruchregeln
                if (isStropheOrRefrain(element)) {
                    stropheCounter++;
                    lastStropheElement = element;
                    
                    // Nach jeder dritten Strophe/Refrain einen Umbruch einfügen
                    if (stropheCounter > 0 && stropheCounter % 3 === 0 && i < group.length - 1) {
                        breakPositions.push({
                            element,
                            pageNumber: currentPage,
                            type: 'strophe-rule'
                        });
                        currentPage++;
                        elementY = availableHeight;
                        continue;
                    }
                } else if (isPsalmOrPrayer(element)) {
                    // Zähle Zeilen im Gebet/Psalm
                    const textContent = element.textContent || '';
                    const lineCount = (textContent.match(/\n/g) || []).length + 1;
                    
                    // Nach 4 oder mehr Zeilen einen Umbruch einfügen
                    if (lineCount >= 4 && i < group.length - 1) {
                        breakPositions.push({
                            element,
                            pageNumber: currentPage,
                            type: 'prayer-rule'
                        });
                        currentPage++;
                        elementY = availableHeight;
                        continue;
                    }
                } else if (!isCloselyRelatedToStrophe(element) && !isHeading(element)) {
                    // Bei nicht-verwandten Elementen Strophenzähler zurücksetzen
                    stropheCounter = 0;
                }
                
                // Aktuelle Höhe reduzieren
                elementY -= elementHeight;
                
                // Prüfe, ob nach diesem Element ein Umbruch erlaubt ist
                if (canBreakAfter(element, group, i) && elementY < margin.bottom && i < group.length - 1) {
                    breakPositions.push({
                        element,
                        pageNumber: currentPage,
                        type: 'overflow'
                    });
                    currentPage++;
                    elementY = availableHeight;
                }
            }
            
            // Aktualisiere die verbleibende Höhe
            currentY = elementY;
            console.log(`Gruppe ${groupIndex + 1} passt auf Seite ${currentPage}`);
        } else if (groupHeight > availableHeight && group.length > 1) {
            // Große Gruppe, muss aufgeteilt werden
            let elementY = currentY;
            let lastBreakElement = null;
            
            // Gehe durch Elemente und suche Stellen für Umbrüche
            for (let i = 0; i < group.length; i++) {
                const element = group[i];
                const elementHeight = calculateElementHeight(element);
                
                // Prüfe semantische Regeln
                if (isStropheOrRefrain(element)) {
                    stropheCounter++;
                    lastStropheElement = element;
                    
                    // Nach jeder dritten Strophe einen Umbruch setzen
                    if (stropheCounter > 0 && stropheCounter % 3 === 0) {
                        breakPositions.push({
                            element,
                            pageNumber: currentPage,
                            type: 'strophe-rule'
                        });
                        currentPage++;
                        elementY = availableHeight;
                        continue;
                    }
                } else if (!isCloselyRelatedToStrophe(element) && !isHeading(element)) {
                    stropheCounter = 0;
                }
                
                // Prüfe, ob Element auf aktuelle Seite passt
                if (elementHeight > elementY) {
                    // Element passt nicht mehr - Umbruch einfügen
                    if (lastBreakElement) {
                        breakPositions.push({
                            element: lastBreakElement,
                            pageNumber: currentPage,
                            type: 'split'
                        });
                        currentPage++;
                        elementY = availableHeight;
                        lastBreakElement = null;
                    } else if (i > 0) {
                        breakPositions.push({
                            element: group[i-1],
                            pageNumber: currentPage,
                            type: 'split'
                        });
                        currentPage++;
                        elementY = availableHeight;
                    } else {
                        // Auch das erste Element passt nicht - erzwungener Umbruch
                        breakPositions.push({
                            element: element,
                            pageNumber: currentPage,
                            type: 'force'
                        });
                        currentPage++;
                        elementY = availableHeight - elementHeight;
                        continue;
                    }
                }
                
                // Aktuelle Höhe reduzieren
                elementY -= elementHeight;
                
                // Bestimme, ob dies eine gute Stelle für einen möglichen Umbruch ist
                if (canBreakAfter(element, group, i)) {
                    lastBreakElement = element;
                }
            }
            
            // Aktualisiere die verbleibende Höhe für die nächste Gruppe
            currentY = elementY;
        } else {
            // Gruppe passt nicht, aber ist zu klein zum Aufteilen - auf nächste Seite verschieben
            const lastElementFromPrevPage = group.length > 0 ? 
            (groupIndex > 0 && elementGroups[groupIndex-1].length > 0 ? 
                elementGroups[groupIndex-1][elementGroups[groupIndex-1].length-1] : null) 
            : null;
            
            if (lastElementFromPrevPage) {
                breakPositions.push({
                    element: lastElementFromPrevPage,
                    pageNumber: currentPage,
                    type: 'group'
                });
                currentPage++;
                currentY = availableHeight - groupHeight;
            } else if (currentY < MIN_SPACE_FOR_NEXT_GROUP) {
                // Nicht genug Platz - erzwungener Umbruch
                const prevElement = getPreviousVisibleElement(elements, group[0]);
                if (prevElement) {
                    breakPositions.push({
                        element: prevElement,
                        pageNumber: currentPage,
                        type: 'space'
                    });
                    currentPage++;
                    currentY = availableHeight - groupHeight;
                }
            } else {
                // Versuche trotzdem auf aktueller Seite
                currentY -= groupHeight;
            }
        }
    });
    
    return { breakPositions };
}


/**
* Bestimmt, ob nach diesem Element ein Seitenumbruch eingefügt werden soll
* basierend auf semantischen Regeln
* @param {HTMLElement} element - Das zu prüfende Element
* @param {Array} group - Die Gruppe, zu der das Element gehört
* @param {number} index - Index innerhalb der Gruppe
* @returns {boolean} True, wenn nach diesem Element ein Umbruch erfolgen soll
*/
function canBreakAfter(element, group, index) {
    // Wenn es das letzte Element in der Gruppe ist, immer Umbruch erlauben
    if (index === group.length - 1) return true;
    
    const nextElement = group[index + 1];
    
    // Nie nach Titeln umbrechen
    if (isHeading(element)) return false;
    
    // Nie nach Copyright-Infos umbrechen
    if (element.classList.contains('copyright-info')) return false;
    
    // SEMANTISCHE REGEL 1: Umbruch nach jeder dritten Strophe/Refrain
    if (isStropheOrRefrain(element)) {
        // Zähle aufeinanderfolgende Strophen/Refrains bis zu diesem Element
        let consecutiveStrophes = 0;
        for (let i = 0; i <= index; i++) {
            if (isStropheOrRefrain(group[i])) {
                consecutiveStrophes++;
            } else if (!isCloselyRelatedToStrophe(group[i])) {
                // Bei nicht-verwandten Elementen (wie Überschriften) Zähler zurücksetzen
                consecutiveStrophes = 0;
            }
        }
        
        // Nach jeder dritten Strophe einen Umbruch einfügen
        if (consecutiveStrophes > 0 && consecutiveStrophes % 3 === 0) {
            console.log(`Semantischer Umbruch nach der ${consecutiveStrophes}. Strophe eingefügt`);
            return true;
        }
        
        // Sonst nur Umbruch, wenn das nächste Element kein Strophe/Refrain ist
        return !isStropheOrRefrain(nextElement);
    }
    
    // SEMANTISCHE REGEL 2: Umbruch nach Gebeten/Psalmen mit vielen Zeilen
    if (isPsalmOrPrayer(element)) {
        // Zähle die Textzeilen
        const textContent = element.textContent || '';
        const lineCount = (textContent.match(/\n/g) || []).length + 1;
        
        // Nach 4 oder mehr Zeilen einen Umbruch einfügen
        if (lineCount >= 4) {
            console.log(`Semantischer Umbruch nach ${lineCount} Zeilen in Gebet/Psalm eingefügt`);
            return true;
        }
    }
    
    // Standard-Fall: Erlaube Umbrüche nach den meisten anderen Elementen
    return true;
}


/**
* Prüft, ob ein Element ein Gebet oder Psalm ist
* @param {HTMLElement} element - Das zu prüfende Element
* @returns {boolean} True, wenn es ein Gebet oder Psalm ist
*/
function isPsalmOrPrayer(element) {
    // Direkte Klassen prüfen
    if (element.classList.contains('psalm') || 
        element.classList.contains('prayer') ||
        element.classList.contains('gebet')) return true;
    
    // Klassen in untergeordneten Elementen prüfen
    if (element.querySelector('.psalm') || 
        element.querySelector('.prayer') ||
        element.querySelector('.gebet')) return true;
    
    // Titel prüfen, die auf Gebet oder Psalm hindeuten
    const titleEl = element.querySelector('.item-title, h1, h2, h3');
    if (titleEl) {
        const title = titleEl.textContent.toLowerCase();
        if (title.includes('psalm') || 
            title.includes('gebet') || 
            title.includes('vater unser') ||
            title.includes('prayer')) {
                return true;
            }
    }
    
    return false;
}

/**
* Identifiziert semantisch zusammengehörige Elementgruppen mit optimierter Strophenerkennung
* @param {Array} elements - Alle Elemente des Dokuments
* @returns {Array} Array von Element-Gruppen
*/
function identifySemanticGroups(elements) {
    const groups = [];
    let currentGroup = [];
    let currentContext = null; // 'title', 'strophe', 'prayer', 'psalm', 'other'
    let stropheCount = 0;
    
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Manueller Seitenumbruch bildet immer eine eigene Gruppe
        if (element.classList.contains('page-break')) {
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            groups.push([element]);
            currentContext = null;
            stropheCount = 0;
            continue;
        }
        
        const isTitle = isHeading(element);
        const isStrophe = isStropheOrRefrain(element);
        const hasCopyright = element.classList.contains('copyright-info');
        const isPsalm = isPsalmOrPrayer(element);
        
        // Regel: Nach 3 aufeinanderfolgenden Strophen neue Gruppe beginnen
        if (isStrophe) {
            stropheCount++;
            
            // Nach der dritten Strophe eine neue Gruppe beginnen
            if (stropheCount > 3 && currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
                stropheCount = 1; // Diese Strophe ist die erste in der neuen Gruppe
                currentContext = 'strophe';
                currentGroup.push(element);
                continue;
            }
        } else if (!isCloselyRelatedToStrophe(element) && !hasCopyright) {
            // Bei unabhängigen Elementen (nicht verwandt mit Strophen) den Zähler zurücksetzen
            stropheCount = 0;
        }
        
        // Reguläre Gruppenbildung wie bisher
        if (isTitle) {
            // Titel beginnt neue Gruppe, außer wir sind bereits in einer Titelgruppe
            if (currentContext !== 'title' && currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            currentGroup.push(element);
            currentContext = 'title';
            stropheCount = 0;
        } 
        else if (hasCopyright) {
            // Copyright-Info gehört immer zur aktuellen Gruppe
            currentGroup.push(element);
        }
        else if (isStrophe) {
            // Strophe nach Titel: bleibt in der Gruppe
            // Strophe nach Strophe: bleibt in der Gruppe
            // Strophe alleine: bildet eigene Strophengruppe
            if (currentContext !== 'title' && currentContext !== 'strophe' && currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
                currentContext = 'strophe';
            } else if (currentGroup.length === 0) {
                currentContext = 'strophe';
            }
            currentGroup.push(element);
        }
        else if (isPsalm) {
            // Psalm/Gebet nach Titel: bleibt in der Gruppe
            // Sonst: neue Gruppe
            if (currentContext !== 'title' && currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            currentGroup.push(element);
            currentContext = isPsalmOrPrayer(element) ? 'psalm' : 'prayer';
        }
        else {
            // Anderes Element, prüfen ob es zur aktuellen Gruppe gehört
            if ((currentContext === 'title' && isCloselyRelatedToTitle(element)) || 
                (currentContext === 'strophe' && isCloselyRelatedToStrophe(element)) ||
                (currentContext === 'psalm' && isCloselyRelatedToPsalm(element))) {
                    currentGroup.push(element);
                } else {
                    // Sonst: Neue Gruppe beginnen
                    if (currentGroup.length > 0) {
                        groups.push([...currentGroup]);
                    }
                    currentGroup = [element];
                    currentContext = 'other';
                }
        }
    }
    
    // Letzte Gruppe hinzufügen
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}

/**
* Prüft, ob ein Element eng mit einem Psalm/Gebet verbunden ist
* @param {HTMLElement} element - Das zu prüfende Element
* @returns {boolean} Ist mit Psalm/Gebet verbunden
*/
function isCloselyRelatedToPsalm(element) {
    return element.classList.contains('prayer') || 
    element.classList.contains('psalm') ||
    element.querySelector('.prayer') || 
    element.querySelector('.psalm') ||
    element.classList.contains('vater-unser') ||
    element.classList.contains('response');
}

/**
 * Prüft, ob ein Element eng mit einem Titel verbunden ist
 * @param {HTMLElement} element - Das zu prüfende Element
 * @returns {boolean} Ist mit Titel verbunden
 */
function isCloselyRelatedToTitle(element) {
    // Z.B. Copyright-Info, Untertitel, Anmerkungen
    return element.classList.contains('copyright-info') || 
           element.classList.contains('item-subtitle') ||
           element.tagName === 'P' ||
           element.tagName === 'EM';
}

/**
 * Prüft, ob ein Element eng mit einer Strophe verbunden ist
 * @param {HTMLElement} element - Das zu prüfende Element
 * @returns {boolean} Ist mit Strophe verbunden
 */
function isCloselyRelatedToStrophe(element) {
    // Z.B. Refrain nach Strophe, weitere Strophen
    return element.classList.contains('refrain') || 
           element.classList.contains('strophe') ||
           (element.tagName === 'P' && element.innerHTML.includes('Refrain'));
}

/**
 * Prüft, ob ein Element eine Überschrift ist
 * @param {HTMLElement} element - Das zu prüfende Element
 * @returns {boolean} Ist eine Überschrift
 */
function isHeading(element) {
    return element.querySelector('.item-title') !== null || 
           element.classList.contains('item-title') ||
           ['H1', 'H2', 'H3'].includes(element.tagName) ||
           (element.classList.contains('isQuillHeading'));
}

/**
 * Prüft, ob ein Element eine Strophe oder ein Refrain ist
 * @param {HTMLElement} element - Das zu prüfende Element
 * @returns {boolean} Ist eine Strophe oder ein Refrain
 */
function isStropheOrRefrain(element) {
    return element.classList.contains('strophe') || 
           element.classList.contains('refrain') ||
           element.querySelector('.strophe') !== null || 
           element.querySelector('.refrain') !== null;
}

/**
 * Berechnet die Gesamthöhe einer Elementgruppe
 * @param {Array} group - Die Elementgruppe
 * @returns {number} Die berechnete Höhe
 */
function calculateGroupHeight(group) {
    let totalHeight = 0;
    
    // Spezielle Flags für bestimmte Elementkombinationen
    const hasTitle = group.some(el => isHeading(el));
    const hasStrophe = group.some(el => isStropheOrRefrain(el));
    const hasCopyright = group.some(el => el.classList.contains('copyright-info'));
    
    // Zusätzlicher Puffer basierend auf Gruppenkomplexität
    const groupBuffer = hasTitle && hasStrophe ? 15 : // Reduziert von 20
                        hasTitle || hasStrophe ? 8 : 3; // Reduziert von 10/5
    
    // Für jedes Element in der Gruppe
    group.forEach((element, index) => {
        // Berechne die Höhe des Elements
        const elementHeight = calculateElementHeight(element);
        totalHeight += elementHeight;
        
        // Bestimme zusätzliche Abstände zwischen Elementen
        if (index < group.length - 1) {
            const nextElement = group[index + 1];
            let spacing = DEFAULT_OBJECT_SPACING;
            
            // Anpassungen für bestimmte Elementkombinationen
            if (isHeading(element) && !hasCopyright) {
                // Weniger Abstand nach Überschrift
                spacing = TITLE_MARGIN_BOTTOM;
            } else if (isStropheOrRefrain(element) && isStropheOrRefrain(nextElement)) {
                // Strophen dichter beieinander
                spacing = STROPHE_MARGIN_BOTTOM;
            } else if (element.classList.contains('copyright-info')) {
                // Weniger Abstand nach Copyright
                spacing = 4; // Reduziert von 5
            }
            
            // Skalierung auf die aktuelle Schriftgröße
            totalHeight += scaleValue(spacing, globalConfig.fontSize) * PX_TO_PT_RATIO;
        }
    });
    
    // Zusätzlicher Puffer für die Gruppe
    totalHeight += groupBuffer * PX_TO_PT_RATIO;
    
    return totalHeight;
}

/**
 * Berechnet die Höhe eines einzelnen Elements
 * @param {HTMLElement} element - Das Element
 * @returns {number} Die berechnete Höhe in Punkten
 */
function calculateElementHeight(element) {
    const computedStyle = window.getComputedStyle(element);
    
    // Ausgangshöhe aus DOM
    let baseHeight = element.offsetHeight;
    
    // Skalierungsfaktoren anwenden
    const fontSize = parseFloat(globalConfig.fontSize || BASE_FONT_SIZE);
    const lineHeight = parseFloat(globalConfig.lineHeight || 1.5);
    
    // Spezialbehandlung für verschiedene Elementtypen
    if (isHeading(element)) {
        // Überschriften haben größere Höhe
        if (element.querySelector('h1, .isQuillHeading')) {
            baseHeight *= HEADING_1_SCALE * 0.75; // Reduziert von 0.8
        } else if (element.querySelector('h2')) {
            baseHeight *= HEADING_2_SCALE * 0.75; // Reduziert von 0.8
        } else {
            baseHeight *= HEADING_3_SCALE * 0.75; // Reduziert von 0.8
        }
    }
    
    if (isStropheOrRefrain(element)) {
        // Bessere Berechnung für Strophen basierend auf Text und Zeilen
        const textContent = element.textContent || '';
        
        // Zähle tatsächliche Zeilenumbrüche
        const lineBreaksCount = (textContent.match(/\n/g) || []).length;
        
        // Schätze Zeilenanzahl basierend auf Text und verfügbarer Breite
        const wordsPerLine = 8; // Erhöht von 7 für kompaktere Darstellung
        const words = textContent.split(/\s+/).length;
        const estimatedLines = Math.max(
            lineBreaksCount + 1,
            Math.ceil(words / wordsPerLine)
        );
        
        // Berechne Höhe basierend auf Zeilen
        baseHeight = estimatedLines * fontSize * lineHeight * 0.95; // Faktor für weniger Höhe
        
        // Zusätzlicher Abstand für Strophen
        baseHeight += scaleValue(STROPHE_SPACING, fontSize);
    }
    
    if (element.classList.contains('copyright-info')) {
        // Copyright-Info hat spezielle Größe
        baseHeight = scaleValue(COPYRIGHT_FONT_SIZE, fontSize) * 1.2;
    }
    
    // Bilder direkt messen
    if (element.querySelector('img')) {
        const img = element.querySelector('img');
        baseHeight = img.offsetHeight || 150; // Fallback, falls noch nicht geladen
    }
    
    // Ränder hinzufügen
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    baseHeight += marginTop + marginBottom;
    
    // In PT umrechnen für PDF-Kompatibilität
    return baseHeight * PX_TO_PT_RATIO;
}

/**
 * Findet das vorherige sichtbare Element im Dokument
 * @param {Array} allElements - Alle Elemente
 * @param {HTMLElement} currentElement - Das aktuelle Element
 * @returns {HTMLElement|null} Das vorherige Element oder null
 */
function getPreviousVisibleElement(allElements, currentElement) {
    const index = allElements.indexOf(currentElement);
    if (index <= 0) return null;
    return allElements[index - 1];
}

/**
 * Fügt einen Seitenumbruch nach dem angegebenen Element ein
 * @param {HTMLElement} element - Element, nach dem der Umbruch eingefügt wird
 * @param {number} pageNumber - Seitennummer
 * @param {string} format - Das gewählte Format
 */
function insertPageBreakMarker(element, pageNumber, format) {
    if (!element || !element.parentNode) return;
    
    const formatName = getFormatName(format);
    const pageBreakMarker = document.createElement('div');
    pageBreakMarker.className = 'preview-page-break';
    pageBreakMarker.textContent = `Seite ${pageNumber} endet hier (${formatName})`;
    
    // Sicherstellen, dass das Element eine ID hat
    const elementId = element.getAttribute('data-original-id') || 
                     element.getAttribute('data-liedblatt-id');
    
    if (!elementId) {
        element.setAttribute('data-liedblatt-id', `auto-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
    
    // Speichere die ID des Elements auch im Umbruchmarker
    pageBreakMarker.setAttribute('data-after-element-id', 
        element.getAttribute('data-original-id') || element.getAttribute('data-liedblatt-id'));
    
    element.parentNode.insertBefore(pageBreakMarker, element.nextSibling);
}

/**
 * Skaliert einen Wert basierend auf der Schriftgröße
 * @param {number} value - Der zu skalierende Wert
 * @param {number} fontSize - Die Schriftgröße
 * @returns {number} Der skalierte Wert
 */
function scaleValue(value, fontSize) {
    return (value / BASE_FONT_SIZE) * fontSize;
}

/**
 * Gibt den lesbaren Namen eines Formats zurück
 * @param {string} format - Der Format-Schlüssel
 * @returns {string} Der lesbare Name
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
 * Initialisiert die Auswahl des Vorschauformats
 */
export function initPreviewFormatSelector() {
    const previewFormatSelect = document.getElementById('previewFormat');
    if (!previewFormatSelect) {
        console.error("Format-Auswahl für Vorschau nicht gefunden!");
        return;
    }
    
    // Event-Listener für Formatänderungen
    previewFormatSelect.addEventListener('change', (e) => {
        const selectedFormat = e.target.value;
        
        // Format in Konfiguration speichern
        if (globalConfig) {
            globalConfig.previewFormat = selectedFormat;
            try {
                localStorage.setItem('liedblattConfig', JSON.stringify(globalConfig));
            } catch (error) {
                console.error("Fehler beim Speichern der Konfiguration:", error);
            }
        }
        
        // Vorschau aktualisieren
        updatePreviewWithPageBreaks(selectedFormat);
    });
    
    // Initiale Aktualisierung der Vorschau
    requestAnimationFrame(() => {
        setTimeout(() => {
            updatePreviewWithPageBreaks(previewFormatSelect.value);
        }, 500);
    });
}

// Exportieren der Funktionen
export default {
    updatePreviewWithPageBreaks,
    initPreviewFormatSelector
};