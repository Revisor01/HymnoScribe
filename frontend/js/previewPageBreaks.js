// previewPageBreaks.js - Thin-Wrapper für die Unified Layout Engine

import { globalConfig } from './script.js';
import { calculateLayout } from './layout/engine.js';
import { renderToDOM } from './layout/domRenderer.js';
import { loadFontArrayBuffers, embedFontsInDoc } from './layout/fontManager.js';
import { getOverrides } from './layout/overrideState.js';

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
const BASE_FONT_SIZE = 14;
const HEADING_1_SCALE = 1.6;
const HEADING_2_SCALE = 1.4;
const HEADING_3_SCALE = 1.2;
const COPYRIGHT_FONT_SIZE = 10;
const STROPHE_SPACING = 6;
const DEFAULT_OBJECT_SPACING = 12;
const TITLE_MARGIN_BOTTOM = 6;
const STROPHE_MARGIN_BOTTOM = 8;

// Konstanten für semantische Umbruchregeln
const MAX_STROPHES_BEFORE_BREAK = 3;      // Maximale Anzahl Strophen vor einem Umbruch
const MAX_PSALM_LINES_BEFORE_BREAK = 4;   // Maximale Anzahl Zeilen in Psalmen/Gebeten vor Umbruch
const MIN_ELEMENT_HEIGHT_FOR_SPLIT = 180; // Minimale Höhe für teilbare Elemente
const MIN_SPACE_FOR_NEXT_GROUP = 50;      // Minimaler Platz für nächste Gruppe

// Debouncing-Variablen
let calculateTimeout = null;
let isCalculating = false;

/**
 * Aktualisiert die Vorschauansicht mit berechneten Seitenumbrüchen
 * @param {string} format - Das gewählte Papierformat (a5, dl, usw.)
 */
export function updatePreviewWithPageBreaks(format = 'a5') {
    if (calculateTimeout) clearTimeout(calculateTimeout);

    calculateTimeout = setTimeout(async () => {
        if (isCalculating) return;
        isCalculating = true;

        try {
            const container = document.getElementById('liedblatt-content');
            if (!container) return;

            // Config aus localStorage laden
            let config;
            try {
                const saved = localStorage.getItem('liedblattConfig');
                config = saved ? JSON.parse(saved) : {};
            } catch (e) { config = {}; }

            config.format = format;
            const fontSizePt = (parseFloat(config.fontSize) || 12) * 0.75;
            const engineConfig = {
                format,
                fontSize: fontSizePt,
                lineHeight: parseFloat(config.lineHeight) || 1.5,
                textAlign: config.textAlign || 'left',
                fontFamily: config.fontFamily || 'Jost',
            };

            // Font-Objekte für Engine (calculateLayout braucht PDFFont.widthOfTextAtSize)
            const arrayBuffers = await loadFontArrayBuffers(engineConfig.fontFamily);
            const { PDFDocument } = window.PDFLib;
            const fontkit = window.fontkit;
            const tempDoc = await PDFDocument.create();
            tempDoc.registerFontkit(fontkit);
            const fonts = await embedFontsInDoc(tempDoc, arrayBuffers);

            const items = Array.from(container.children);
            const layoutResult = await calculateLayout(items, engineConfig, fonts, getOverrides());

            // DOM-Renderer befüllt container komplett neu (seitenweise Blätter)
            renderToDOM(layoutResult, engineConfig, container);

        } catch (error) {
            console.error("Fehler bei der Vorschau-Aktualisierung:", error);
        } finally {
            isCalculating = false;
        }
    }, 150); // war 300ms — per Entscheidung auf 150ms
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
    
    // Alle Content-Elemente (einschließlich manueller Umbrüche)
    const elements = Array.from(liedblattContent.children);
    
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
    let lastWasTitle = false;
    
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
            lastWasTitle = false;
            return;
        }
        
        // Berechne Gruppenhöhe mit verbesserter Genauigkeit
        const groupHeight = calculateGroupHeight(group);
        console.log(`Gruppe ${groupIndex + 1}: Höhe=${groupHeight}pt, Platz=${currentY}pt`);
        
        // Entscheide, ob die Gruppe auf die aktuelle Seite passt
        if (groupHeight <= currentY) {
            // Gruppe passt komplett - prüfe auf semantische Umbrüche innerhalb der Gruppe
            let elementY = currentY;
            let elementsWithinPage = [];
            
            for (let i = 0; i < group.length; i++) {
                const element = group[i];
                const elementHeight = calculateElementHeight(element);
                
                // Prüfe semantische Umbruchregeln
                if (isStropheOrRefrain(element)) {
                    stropheCounter++;
                    lastStropheElement = element;
                    
                    // SEMANTISCHE REGEL: Nach jeder dritten Strophe/Refrain einen Umbruch einfügen
                    if (stropheCounter >= MAX_STROPHES_BEFORE_BREAK && i < group.length - 1) {
                        // Nur brechen, wenn wir nicht direkt nach einer Überschrift sind
                        if (!lastWasTitle) {
                            breakPositions.push({
                                element,
                                pageNumber: currentPage,
                                type: 'strophe-rule'
                            });
                            currentPage++;
                            elementY = availableHeight;
                            stropheCounter = 0;
                            elementsWithinPage = [];
                            continue;
                        }
                    }
                    
                    lastWasTitle = false;
                } else if (isPsalmOrPrayer(element)) {
                    // SEMANTISCHE REGEL: Bei Psalmen/Gebeten nach X Zeilen umbrechen
                    const textContent = element.textContent || '';
                    const lineCount = (textContent.match(/\n/g) || []).length + 1;
                    
                    if (lineCount >= MAX_PSALM_LINES_BEFORE_BREAK && i < group.length - 1) {
                        if (!lastWasTitle) {
                            breakPositions.push({
                                element,
                                pageNumber: currentPage,
                                type: 'psalm-rule'
                            });
                            currentPage++;
                            elementY = availableHeight;
                            stropheCounter = 0;
                            elementsWithinPage = [];
                            continue;
                        }
                    }
                    
                    lastWasTitle = false;
                } else if (isHeading(element)) {
                    // SEMANTISCHE REGEL: Nach Überschriften keine Umbrüche
                    lastWasTitle = true;
                    stropheCounter = 0;
                } else if (!isCloselyRelatedToStrophe(element) && !isHeading(element)) {
                    // Bei nicht-verwandten Elementen Strophenzähler zurücksetzen
                    stropheCounter = 0;
                    lastWasTitle = false;
                }
                
                // Prüfe, ob das Element auf die aktuelle Seite passt
                if (elementY - elementHeight < margin.bottom) {
                    // Element passt nicht mehr - Umbruch einfügen
                    // Aber NIE nach einer Überschrift umbrechen
                    if (lastWasTitle) {
                        if (elementsWithinPage.length > 0) {
                            // Wenn wir gerade eine Überschrift haben, brechen wir VOR ihr (nach dem vorherigen Element)
                            const lastElementBeforeTitle = elementsWithinPage[elementsWithinPage.length - 1];
                            breakPositions.push({
                                element: lastElementBeforeTitle,
                                pageNumber: currentPage,
                                type: 'overflow-before-title'
                            });
                        } else {
                            // Wenn die Überschrift das erste Element auf der Seite ist, 
                            // versuchen wir, sie trotzdem zu platzieren
                            elementY -= elementHeight;
                            elementsWithinPage.push(element);
                            continue;
                        }
                    } else {
                        // Normaler Überlaufumbruch nach dem letzten Element auf der Seite
                        if (i > 0) {
                            const lastElement = group[i-1];
                            breakPositions.push({
                                element: lastElement,
                                pageNumber: currentPage,
                                type: 'overflow'
                            });
                        } else if (elementsWithinPage.length > 0) {
                            // Falls i=0, aber wir haben bereits Elemente
                            const lastElement = elementsWithinPage[elementsWithinPage.length - 1];
                            breakPositions.push({
                                element: lastElement,
                                pageNumber: currentPage,
                                type: 'overflow'
                            });
                        }
                    }
                    
                    currentPage++;
                    elementY = availableHeight;
                    stropheCounter = 0;
                    elementsWithinPage = [];
                    
                    // Element nach dem Umbruch verarbeiten
                    if (isStropheOrRefrain(element)) {
                        stropheCounter = 1;
                        lastStropheElement = element;
                    }
                    
                    // Nach Umbruch Element erneut verarbeiten
                    i--;
                    continue;
                }
                
                // Aktuelle Höhe reduzieren und Element zur Seite hinzufügen
                elementY -= elementHeight;
                elementsWithinPage.push(element);
                
                // Prüfe, ob nach diesem Element ein Umbruch erlaubt ist
                if (canBreakAfter(element, group, i) && 
                    i < group.length - 1 && 
                    elementY < MIN_SPACE_FOR_NEXT_GROUP) {
                    breakPositions.push({
                        element,
                        pageNumber: currentPage,
                        type: 'limited-space'
                    });
                    currentPage++;
                    elementY = availableHeight;
                    stropheCounter = 0;
                    elementsWithinPage = [];
                }
            }
            
            // Aktualisiere die verbleibende Höhe
            currentY = elementY;
            console.log(`Gruppe ${groupIndex + 1} passt auf Seite ${currentPage}`);
        } else if (groupHeight > availableHeight && group.length > 1) {
            // Große Gruppe, muss aufgeteilt werden
            let elementY = currentY;
            let lastBreakElement = null;
            let elementsWithinPage = [];
            
            // Gehe durch Elemente und suche Stellen für Umbrüche
            for (let i = 0; i < group.length; i++) {
                const element = group[i];
                const elementHeight = calculateElementHeight(element);
                
                // Prüfe semantische Regeln
                if (isStropheOrRefrain(element)) {
                    stropheCounter++;
                    lastStropheElement = element;
                    
                    // Nach jeder dritten Strophe einen Umbruch setzen, außer nach Überschrift
                    if (stropheCounter >= MAX_STROPHES_BEFORE_BREAK && !lastWasTitle) {
                        breakPositions.push({
                            element,
                            pageNumber: currentPage,
                            type: 'strophe-rule'
                        });
                        currentPage++;
                        elementY = availableHeight;
                        stropheCounter = 0;
                        elementsWithinPage = [];
                        continue;
                    }
                    
                    lastWasTitle = false;
                } else if (isHeading(element)) {
                    lastWasTitle = true;
                    stropheCounter = 0;
                } else if (!isCloselyRelatedToStrophe(element) && !isHeading(element)) {
                    lastWasTitle = false;
                    stropheCounter = 0;
                }
                
                // Prüfe, ob Element auf aktuelle Seite passt
                if (elementHeight > elementY) {
                    // Element passt nicht mehr - Umbruch einfügen
                    
                    // Aber NIE nach einer Überschrift umbrechen
                    if (lastWasTitle) {
                        if (elementsWithinPage.length > 0) {
                            // Wenn wir gerade eine Überschrift haben, brechen wir VOR ihr
                            const lastElementBeforeTitle = elementsWithinPage[elementsWithinPage.length - 1];
                            breakPositions.push({
                                element: lastElementBeforeTitle,
                                pageNumber: currentPage,
                                type: 'overflow-before-title'
                            });
                            currentPage++;
                            elementY = availableHeight;
                            i--; // Element erneut verarbeiten
                            elementsWithinPage = [];
                            continue;
                        } else if (i > 0) {
                            // Wenn die Überschrift das erste Element ist und nicht passt,
                            // brechen wir VOR ihr
                            breakPositions.push({
                                element: group[i-1],
                                pageNumber: currentPage,
                                type: 'overflow-before-title'
                            });
                            currentPage++;
                            elementY = availableHeight;
                            i--; // Element erneut verarbeiten
                            elementsWithinPage = [];
                            continue;
                        }
                    }
                    
                    if (lastBreakElement && !lastWasTitle) {
                        breakPositions.push({
                            element: lastBreakElement,
                            pageNumber: currentPage,
                            type: 'split'
                        });
                        currentPage++;
                        elementY = availableHeight;
                        lastBreakElement = null;
                        elementsWithinPage = [];
                        i--; // Element erneut verarbeiten
                        continue;
                    } else if (i > 0 && !lastWasTitle) {
                        breakPositions.push({
                            element: group[i-1],
                            pageNumber: currentPage,
                            type: 'split'
                        });
                        currentPage++;
                        elementY = availableHeight;
                        elementsWithinPage = [];
                        i--; // Element erneut verarbeiten
                        continue;
                    } else {
                        // Auch das erste Element passt nicht - erzwungener Umbruch
                        if (elementHeight > availableHeight) {
                            // Element ist größer als die Seite - teilen wir es künstlich auf
                            breakPositions.push({
                                element: element,
                                pageNumber: currentPage,
                                type: 'force'
                            });
                            currentPage++;
                            elementY = availableHeight;
                            elementsWithinPage = [];
                            continue;
                        } else {
                            // Element passt auf leere Seite, also neue Seite
                            currentPage++;
                            elementY = availableHeight;
                            i--; // Element erneut verarbeiten
                            elementsWithinPage = [];
                            continue;
                        }
                    }
                }
                
                // Aktuelle Höhe reduzieren und Element zur Seite hinzufügen
                elementY -= elementHeight;
                elementsWithinPage.push(element);
                
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
    
    // SEMANTISCHE REGEL: Nie nach Titeln umbrechen
    if (isHeading(element)) return false;
    
    // SEMANTISCHE REGEL: Nie nach Copyright-Infos umbrechen
    if (element.classList.contains('copyright-info')) return false;
    
    // SEMANTISCHE REGEL: Umbruch nach Strophen/Refrains erlaubt
    if (isStropheOrRefrain(element)) {
        const nextElement = index < group.length - 1 ? group[index + 1] : null;
        
        // Umbruch erzwingen wenn:
        // 1. Eine Strophe auf ein Refrain folgt oder umgekehrt
        if (nextElement && isStropheOrRefrain(nextElement)) {
            const currentIsRefrain = element.classList.contains('refrain') || 
            element.querySelector('.refrain');
            const nextIsRefrain = nextElement.classList.contains('refrain') || 
            nextElement.querySelector('.refrain');
            
            // Wenn eines ein Refrain ist und das andere eine Strophe, erlaube Umbruch
            if (currentIsRefrain !== nextIsRefrain) {
                console.log("Umbruch zwischen Strophe und Refrain");
                return true;
            }
        }
    }
    
    // SEMANTISCHE REGEL: Umbruch nach Gebeten/Psalmen mit vielen Zeilen
    if (isPsalmOrPrayer(element)) {
        // Zähle die Textzeilen
        const textContent = element.textContent || '';
        const lineCount = (textContent.match(/\n/g) || []).length + 1;
        
        // Nach 4 oder mehr Zeilen einen Umbruch einfügen
        if (lineCount >= MAX_PSALM_LINES_BEFORE_BREAK) {
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
    
    // Prüfe auf charakteristische Formationen in Absätzen
    const paragraphs = element.querySelectorAll('p');
    if (paragraphs.length >= 3) {
        // Typisches Muster für Psalmen ist, dass jeder Absatz kurz ist
        let shortParagraphCount = 0;
        paragraphs.forEach(p => {
            if (p.textContent.length < 100) shortParagraphCount++;
        });
        if (shortParagraphCount >= paragraphs.length * 0.7) return true;
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
            if (stropheCount > MAX_STROPHES_BEFORE_BREAK && currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
                stropheCount = 1; // Diese Strophe ist die erste in der neuen Gruppe
                currentContext = 'strophe';
                currentGroup.push(element);
                continue;
            }
        } else if (!isCloselyRelatedToStrophe(element) && !hasCopyright) {
            // Bei unabhängigen Elementen den Zähler zurücksetzen
            stropheCount = 0;
        }
        
        // Reguläre Gruppenbildung
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
    const groupBuffer = hasTitle && hasStrophe ? 15 : 
                        hasTitle || hasStrophe ? 8 : 3;
    
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
                spacing = TITLE_MARGIN_BOTTOM;
            } else if (isStropheOrRefrain(element) && isStropheOrRefrain(nextElement)) {
                spacing = STROPHE_MARGIN_BOTTOM;
            } else if (element.classList.contains('copyright-info')) {
                spacing = 4;
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
    
    // VERBESSERT: Korrekturfaktor für genauere Berechnungen
    const heightCorrectionFactor = 1.15; // 15% mehr Höhe als Puffer
    
    // Spezialbehandlung für verschiedene Elementtypen
    if (isHeading(element)) {
        // Überschriften haben größere Höhe
        if (element.querySelector('h1, .isQuillHeading')) {
            baseHeight *= HEADING_1_SCALE * 0.8;
        } else if (element.querySelector('h2')) {
            baseHeight *= HEADING_2_SCALE * 0.8;
        } else {
            baseHeight *= HEADING_3_SCALE * 0.8;
        }
    }
    
    if (isStropheOrRefrain(element)) {
        // VERBESSERT: Bessere Berechnung für Strophen
        const textContent = element.textContent || '';
        
        // Zähle tatsächliche Zeilenumbrüche
        const lineBreaksCount = (textContent.match(/\n/g) || []).length;
        
        // Schätze Zeilenanzahl basierend auf Text und verfügbarer Breite
        const contentWidth = element.offsetWidth - 
        (parseFloat(computedStyle.paddingLeft) || 0) - 
        (parseFloat(computedStyle.paddingRight) || 0);
        const avgCharWidth = fontSize * 0.6; // Durchschnittliche Zeichenbreite
        const charsPerLine = Math.floor(contentWidth / avgCharWidth);
        
        const words = textContent.split(/\s+/).length;
        const estimatedLines = Math.max(
            lineBreaksCount + 1,
            Math.ceil(textContent.length / Math.max(1, charsPerLine)),
            Math.ceil(words / 8) // Durchschnittlich 8 Wörter pro Zeile
        );
        
        // VERBESSERT: Genauere Höhenberechnung für Strophen
        baseHeight = (estimatedLines * fontSize * lineHeight) + STROPHE_SPACING;
    }
    
    // Bilder direkt messen
    if (element.querySelector('img')) {
        const img = element.querySelector('img');
        if (img.complete && img.naturalHeight) {
            // Wenn Bild geladen, verwende die tatsächliche Höhe
            baseHeight = img.offsetHeight || 150;
        } else {
            // Fallback, falls noch nicht geladen
            baseHeight = 200; // Konservativere Schätzung
        }
    }
    
    // Ränder hinzufügen
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    baseHeight += marginTop + marginBottom;
    
    // Korrekturfaktor anwenden und in PT umrechnen
    return baseHeight * PX_TO_PT_RATIO * heightCorrectionFactor;
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
* @param {string} type - Typ des Umbruchs (overflow, auto, etc.)
*/
function insertPageBreakMarker(element, pageNumber, format, type) {
    if (!element || !element.parentNode) return;
    
    const formatName = getFormatName(format);
    const pageBreakMarker = document.createElement('div');
    pageBreakMarker.className = 'preview-page-break';
    pageBreakMarker.setAttribute('data-break-type', type);
    
    // Einheitlicher Stil für alle automatischen Umbrüche 
    // (reduzierte Komplexität gegenüber verschiedenen Stilen pro Typ)
    pageBreakMarker.style.borderTop = '2px dashed #4285f4';
    pageBreakMarker.style.margin = '10px 0';
    pageBreakMarker.style.position = 'relative';
    pageBreakMarker.style.padding = '10px 0';
    
    pageBreakMarker.textContent = `Seite ${pageNumber} endet hier (${formatName})`;
    
    // Sicherstellen, dass das Element eine ID hat
    const elementId = element.getAttribute('data-original-id') || 
    element.getAttribute('data-liedblatt-id');
    
    if (!elementId) {
        element.setAttribute('data-liedblatt-id', `auto-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
    
    // Speichere die ID des Elements im Umbruchmarker
    pageBreakMarker.setAttribute('data-after-element-id', 
        element.getAttribute('data-original-id') || element.getAttribute('data-liedblatt-id'));
    
    element.parentNode.insertBefore(pageBreakMarker, element.nextSibling);
}


/**
 * Aktualisiert die Anzeige eines manuellen Seitenumbruchs mit der Seitenzahl
 * @param {HTMLElement} element - Das Element des manuellen Seitenumbruchs
 * @param {number} pageNumber - Die aktuelle Seitenzahl
 * @param {string} format - Das gewählte Format
 */
function updateManualPageBreakMarker(element, pageNumber, format) {
    if (!element) return;
    
    const formatName = getFormatName(format);
    
    // Überprüfe, ob es bereits ein Label für den manuellen Umbruch gibt
    let breakLabel = element.querySelector('.page-break-label');
    
    if (!breakLabel) {
        // Erstelle ein neues Label
        breakLabel = document.createElement('div');
        breakLabel.className = 'page-break-label';
        breakLabel.style.fontWeight = 'bold';
        breakLabel.style.color = '#0066cc';
        breakLabel.style.padding = '5px';
        breakLabel.style.marginTop = '5px';
        breakLabel.style.backgroundColor = '#f0f8ff';
        breakLabel.style.borderRadius = '4px';
        element.appendChild(breakLabel);
    }
    
    // Aktualisiere den Text
    breakLabel.textContent = `Manueller Seitenumbruch - Seite ${pageNumber} endet hier (${formatName})`;
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

        // Vorschau aktualisieren — overrides bleiben erhalten (getOverrides() aus overrideState)
        updatePreviewWithPageBreaks(selectedFormat);
    });

    // Font-Size-Presets Handler (WYSI-03)
    const fontSizePresets = document.getElementById('fontSizePresets');
    const fontSizeCustom = document.getElementById('fontSizeCustom');

    if (fontSizePresets) {
        fontSizePresets.addEventListener('change', () => {
            if (fontSizePresets.value === 'custom') {
                fontSizeCustom.style.display = 'inline-block';
                fontSizeCustom.focus();
            } else {
                fontSizeCustom.style.display = 'none';
                // pt-Wert → globalConfig.fontSize (px): Engine konvertiert intern mit * 0.75
                const ptValue = parseFloat(fontSizePresets.value);
                if (globalConfig) {
                    globalConfig.fontSize = ptValue / 0.75;
                    try {
                        localStorage.setItem('liedblattConfig', JSON.stringify(globalConfig));
                    } catch (e) {
                        console.error('Fehler beim Speichern der Schriftgröße:', e);
                    }
                }
                const currentFormat = previewFormatSelect.value || 'a5';
                updatePreviewWithPageBreaks(currentFormat);
            }
        });

        fontSizeCustom.addEventListener('change', () => {
            // Guard gegen NaN/Infinity (T-03-01-02)
            const raw = parseFloat(fontSizeCustom.value);
            const ptValue = Math.max(6, Math.min(36, isFinite(raw) ? raw : 12));
            fontSizeCustom.value = ptValue;
            if (globalConfig) {
                globalConfig.fontSize = ptValue / 0.75;
                try {
                    localStorage.setItem('liedblattConfig', JSON.stringify(globalConfig));
                } catch (e) {
                    console.error('Fehler beim Speichern der Schriftgröße:', e);
                }
            }
            const currentFormat = previewFormatSelect.value || 'a5';
            updatePreviewWithPageBreaks(currentFormat);
        });
    }

    // Initiale Aktualisierung der Vorschau
    requestAnimationFrame(() => {
        setTimeout(() => {
            updatePreviewWithPageBreaks(previewFormatSelect.value);
        }, 500);
    });
}

// Named exports sind ausreichend — kein default export nötig