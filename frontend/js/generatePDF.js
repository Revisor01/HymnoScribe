// generatePDF.js

import { globalConfig } from './script.js';
const { PDFDocument, rgb } = PDFLib;

window.generatePDF = generatePDF;

// Konstanten für skalierbare Faktoren
const BASE_FONT_SIZE = 14; // Grundschriftgröße in Punkten
const HEADING_1_SCALE = 1.6; // Skalierungsfaktor für Überschrift 1
const HEADING_2_SCALE = 1.4; // Skalierungsfaktor für Überschrift 2
const HEADING_3_SCALE = 1.2; // Skalierungsfaktor für Überschrift 3
const COPYRIGHT_FONT_SIZE = 12; // Schriftgröße für Copyright-Informationen
const ICON_SIZE = 20; // Größe der Icons in Pixeln
const ICON_MARGIN = 25; // Abstand nach Icons in Punkten
const DEFAULT_OBJECT_SPACING = 15; // Neuer fixer Abstand nach jedem Objekt in Punkten
const IMAGE_MARGIN_TOP = -10; // Abstand vor Bildern in Punkten
const IMAGE_MARGIN_BOTTOM = 15; // Abstand nach Bildern in Punkten
const STROPHE_SPACING = 8; // Abstand nach Strophen in Punkten

// Konstanten für semantische Umbruchregeln
const MAX_STROPHES_BEFORE_BREAK = 3;      // Maximale Anzahl Strophen vor einem Umbruch
const MAX_PSALM_LINES_BEFORE_BREAK = 4;   // Maximale Anzahl Zeilen in Psalmen/Gebeten vor Umbruch
const MIN_SPACE_FOR_NEXT_GROUP = 50;      // Minimaler Platz für nächste Gruppe

// Neue Konstanten für Quill-Überschriften
const QUILL_H1_MARGIN_TOP = 0;
const QUILL_H1_MARGIN_BOTTOM = 12;
const QUILL_H2_MARGIN_TOP = 5;
const QUILL_H2_MARGIN_BOTTOM = 10;
const QUILL_H3_MARGIN_TOP = 5;
const QUILL_H3_MARGIN_BOTTOM = 5;
const COPYRIGHT_MARGIN_TOP = -5;
const COPYRIGHT_MARGIN_BOTTOM = -5;

/**
* Bestimmt, ob ein Element ein Titel ist - erweiterte Version
* @param {HTMLElement} element - Das zu prüfende Element
* @returns {boolean} - True, wenn es sich um einen Titel handelt
*/
function isTitle(element) {
    // Prüft auf verschiedene Titel-Indikatoren
    return element.querySelector('.item-title') !== null || 
    element.querySelector('h1, h2, h3') !== null ||
    element.classList.contains('title') || 
    element.tagName === 'H1' || 
    element.tagName === 'H2' || 
    element.tagName === 'H3';
}

/**
* Bestimmt, ob ein Element eine Strophe oder ein Refrain ist - robuste Version
* @param {HTMLElement} element - Das zu prüfende Element
* @returns {boolean} - True, wenn es sich um eine Strophe oder Refrain handelt
*/
function isStropheOrRefrain(element) {
    return (
        element.querySelector('.strophe') !== null || 
        element.querySelector('.refrain') !== null ||
        element.classList.contains('strophe') || 
        element.classList.contains('refrain')
    );
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
    
    // Fall 3: Psalm/Gebet mit weniger als MAX_PSALM_LINES_BEFORE_BREAK Zeilen
    if (isPsalmOrPrayer(currentElement)) {
        const textContent = currentElement.textContent || '';
        const lineCount = (textContent.match(/\n/g) || []).length + 1;
        if (lineCount < MAX_PSALM_LINES_BEFORE_BREAK) {
            return true;
        }
    }
    
    return false;
}

// Funktion zum Skalieren der Werte basierend auf der globalen Schriftgröße
function scaleValue(value, globalFontSize) {
    return (value / BASE_FONT_SIZE) * globalFontSize;
}

const mmToPt = (mm) => mm * 2.83465;
const PX_TO_PT_RATIO = 0.75;
const pxToPt = (px) => px * PX_TO_PT_RATIO;

const pageSizes = {
    'a5': { width: mmToPt(148), height: mmToPt(210) },
    'dl': { width: mmToPt(99), height: mmToPt(210) },
    'a4-schmal': { width: mmToPt(105), height: mmToPt(297) },
    'a3-schmal': { width: mmToPt(148), height: mmToPt(420) }
};

// Anpassen der headingStyles
const headingStyles = {
    title: { fontSize: BASE_FONT_SIZE * HEADING_1_SCALE, bold: true, lineHeight: 1.1, spacingBefore: 10, spacingAfter: 3 },
    subtitle: { fontSize: BASE_FONT_SIZE * HEADING_2_SCALE, lineHeight: 1.1, spacingBefore: 10, spacingAfter: 10},
    heading: { fontSize: BASE_FONT_SIZE * HEADING_3_SCALE, bold: true, lineHeight: 1.1, spacingBefore: 10, spacingAfter: 10 },
    bodyText: { fontSize: BASE_FONT_SIZE, lineHeight: 1.2, spacingBefore: 10, spacingAfter: 10 }
};

/**
* Schätzt die Höhe eines Elements für die PDF-Darstellung
* @param {HTMLElement} element - Das zu messende Element
* @param {Object} config - Die globale Konfiguration
* @returns {number} - Die geschätzte Höhe in PT
*/
function estimatePDFElementHeight(element, config) {
    // Grundlegende Elementgröße ermitteln
    const computedStyle = window.getComputedStyle(element);
    
    // Ausgangshöhe aus DOM
    let baseHeight = element.offsetHeight;
    
    // Skalierungsfaktoren und Konfiguration
    const fontSize = parseFloat(config.fontSize || 10.5);
    const lineHeight = parseFloat(config.lineHeight || 1.2);
    
    // Spezialbehandlung für verschiedene Elementtypen
    if (element.querySelector('.item-title')) {
        // Titel haben größere Schrift
        baseHeight *= HEADING_3_SCALE;
    }
    
    // Strophen und Refrains
    if (element.querySelector('.strophe') || element.querySelector('.refrain')) {
        // Zeilenanzahl schätzen basierend auf Text
        const textContent = element.textContent || '';
        const totalChars = textContent.length;
        const charsPerLine = 50; // Durchschnittliche Zeichen pro Zeile
        const estimatedLines = Math.max(1, Math.ceil(totalChars / charsPerLine));
        
        // Höhe basierend auf Zeilenanzahl, Schriftgröße und Zeilenabstand
        const lineHeightPx = fontSize * lineHeight;
        baseHeight = estimatedLines * lineHeightPx;
        
        // Zusätzlicher Abstand für Strophen
        baseHeight += STROPHE_SPACING;
    }
    
    // Bilder direkt messen
    if (element.querySelector('img')) {
        const img = element.querySelector('img');
        if (img.offsetHeight) {
            baseHeight = img.offsetHeight;
        } else {
            // Fallback wenn Bildhöhe nicht verfügbar
            baseHeight = 150; // Standardhöhe für Bilder
        }
    }
    
    // Ränder hinzufügen
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    baseHeight += marginTop + marginBottom;
    
    // In PT umrechnen für PDF-Kompatibilität
    return baseHeight * PX_TO_PT_RATIO;
}

/**
* Verbesserte Schätzung der Höhe einer Elementgruppe
* @param {Array} group - Gruppe von Elementen
* @returns {number} - Geschätzte Höhe der Gruppe in PT
*/
function estimateGroupHeight(group) {
    let totalHeight = 0;
    
    // Debug-Information
    console.log("Schätze Gruppenhöhe für", group.length, "Elemente");
    
    // Titel oder Strophen in der Gruppe?
    const hasTitle = group.some(el => isTitle(el));
    const hasStrophe = group.some(el => isStropheOrRefrain(el));
    
    // Zusätzlicher Puffer für Gruppen mit Titel und Strophen
    const groupBuffer = (hasTitle && hasStrophe) ? 20 : 0;
    
    // Element für Element verarbeiten
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
* Identifiziert zusammengehörige Elementgruppen, die nicht getrennt werden sollten
* @param {Array} items - Alle Elemente im Dokument
* @returns {Array} - Array von Element-Gruppen
*/
function identifyElementGroups(items) {
    // Debug-Ausgabe für bessere Nachvollziehbarkeit
    console.log("Starte Gruppenerkennung mit", items.length, "Elementen");
    
    const groups = [];
    let currentGroup = [];
    let inStropheGroup = false;
    let inTitleGroup = false;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Detaillierte Debug-Informationen
        console.log(`Verarbeite Element #${i}:`, {
            isTitle: isTitle(item),
            isStrophe: isStropheOrRefrain(item),
            isPsalm: isPsalmOrPrayer(item),
            hasClass: Array.from(item.classList)
        });
        
        // Seitenumbruch beendet Gruppe
        if (item.classList.contains('page-break')) {
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
                console.log("Gruppe beendet wegen Seitenumbruch:", currentGroup.length, "Elemente");
                currentGroup = [];
            }
            inStropheGroup = false;
            inTitleGroup = false;
            // Füge den Seitenumbruch als separate Gruppe hinzu
            groups.push([item]);
            continue;
        }
        
        // Element-Eigenschaften prüfen
        const isItemTitle = isTitle(item);
        const isItemStropheOrRefrain = isStropheOrRefrain(item);
        const isItemPsalm = isPsalmOrPrayer(item);
        
        // Titelgruppe beginnen
        if (isItemTitle) {
            if (currentGroup.length > 0 && !inTitleGroup) {
                groups.push([...currentGroup]);
                console.log("Neue Titelgruppe - vorherige Gruppe abgeschlossen:", currentGroup.length, "Elemente");
                currentGroup = [];
            }
            
            currentGroup.push(item);
            inTitleGroup = true;
            inStropheGroup = false; // Reset Strophen-Gruppierung
            continue;
        }
        
        // Strophe nach Titel
        if (isItemStropheOrRefrain && inTitleGroup) {
            currentGroup.push(item);
            console.log("Strophe zu Titelgruppe hinzugefügt");
            continue;
        }
        
        // Psalm/Gebet nach Titel
        if (isItemPsalm && inTitleGroup) {
            currentGroup.push(item);
            console.log("Psalm/Gebet zu Titelgruppe hinzugefügt");
            continue;
        }
        
        // Strophengruppe
        if (isItemStropheOrRefrain) {
            if (currentGroup.length === 0) {
                currentGroup.push(item);
                inStropheGroup = true;
                inTitleGroup = false;
                console.log("Neue Strophengruppe begonnen");
            } 
            else if (inStropheGroup) {
                // Prüfen, ob wir die maximale Anzahl von Strophen in einer Gruppe erreicht haben
                let stropheCount = currentGroup.filter(el => isStropheOrRefrain(el)).length;
                
                if (stropheCount >= MAX_STROPHES_BEFORE_BREAK) {
                    // Nach X Strophen eine neue Gruppe beginnen
                    groups.push([...currentGroup]);
                    console.log(`Neue Gruppe nach ${stropheCount} Strophen gestartet`);
                    currentGroup = [item];
                } else {
                    currentGroup.push(item);
                    console.log("Strophe zu Strophengruppe hinzugefügt");
                }
            } 
            else {
                groups.push([...currentGroup]);
                console.log("Neue Strophengruppe - vorherige Gruppe abgeschlossen:", currentGroup.length, "Elemente");
                currentGroup = [item];
                inStropheGroup = true;
                inTitleGroup = false;
            }
            continue;
        }
        
        // Psalm/Gebet-Gruppe
        if (isItemPsalm) {
            if (currentGroup.length === 0) {
                currentGroup.push(item);
                inStropheGroup = false;
                inTitleGroup = false;
                console.log("Neue Psalm/Gebet-Gruppe begonnen");
            } else {
                groups.push([...currentGroup]);
                console.log("Neue Psalm/Gebet-Gruppe - vorherige Gruppe abgeschlossen:", currentGroup.length, "Elemente");
                currentGroup = [item];
                inStropheGroup = false;
                inTitleGroup = false;
            }
            continue;
        }
        
        // Für alle anderen Elemente
        if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
            console.log("Gruppe mit normalen Elementen abgeschlossen:", currentGroup.length, "Elemente");
        }
        
        currentGroup = [item];
        inStropheGroup = false;
        inTitleGroup = false;
    }
    
    // Letzte Gruppe hinzufügen
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
        console.log("Letzte Gruppe hinzugefügt:", currentGroup.length, "Elemente");
    }
    
    console.log("Gruppenerkennung abgeschlossen:", groups.length, "Gruppen identifiziert");
    return groups;
}

/**
* Extrahiert Seitenumbruchmarker aus der Vorschauansicht
* @returns {Object} Informationen über Seitenumbruchmarker
*/
function extractPageBreaksFromPreview() {
    const liedblattContent = document.getElementById('liedblatt-content');
    if (!liedblattContent) return { elementIds: [], manualBreakElements: [], breakInfo: [] };
    
    const allElements = Array.from(liedblattContent.children);
    
    // Sammle alle Element-IDs, nach denen ein Umbruch erfolgen soll
    const elementIds = [];
    const manualBreakElements = [];
    const breakInfo = []; // Detaillierte Informationen zu jedem Umbruch
    
    // Erster Durchlauf: Identifiziere manuelle Umbrüche
    for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        
        // Manuellen Seitenumbruch erfassen
        if (element.classList.contains('page-break')) {
            manualBreakElements.push(element);
            // Finde das Element vor dem Umbruch für die PDF-Generierung
            if (i > 0) {
                const prevElementId = allElements[i-1].getAttribute('data-original-id') || 
                allElements[i-1].getAttribute('data-liedblatt-id');
                if (prevElementId) {
                    breakInfo.push({
                        elementId: prevElementId,
                        type: 'manual',
                        element: allElements[i-1],
                        afterIndex: i-1
                    });
                }
            }
        }
    }
    
    // Zweiter Durchlauf: Identifiziere automatische Umbrüche
    // Wir berücksichtigen nur Umbrüche, die nicht direkt nach einem manuellen Umbruch kommen
    for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        
        // Automatischen Vorschau-Seitenumbruch finden
        if (element.classList.contains('preview-page-break')) {
            // Holen das vorherige Element (nach dem der Umbruch erfolgt)
            const afterElementId = element.getAttribute('data-after-element-id');
            const breakType = element.getAttribute('data-break-type') || 'auto';
            
            if (afterElementId) {
                // Prüfe, ob dieser Umbruch nicht mit einem manuellen kollidiert
                const isNearManual = manualBreakElements.some(manualBreak => {
                    const manualIndex = allElements.indexOf(manualBreak);
                    // Ignoriere automatische Umbrüche, die zu nahe an manuellen sind
                    return Math.abs(i - manualIndex) <= 2;
                });
                
                if (!isNearManual) {
                    elementIds.push(afterElementId);
                    // Finde das Element für die detaillierte Information
                    const afterElement = allElements.find(el => 
                        (el.getAttribute('data-original-id') === afterElementId || 
                            el.getAttribute('data-liedblatt-id') === afterElementId));
                    
                    if (afterElement) {
                        breakInfo.push({
                            elementId: afterElementId,
                            type: breakType,
                            element: afterElement,
                            afterIndex: allElements.indexOf(afterElement)
                        });
                    }
                }
            }
        }
    }
    
    // Sortiere die Umbrüche nach ihrer Position im Dokument
    breakInfo.sort((a, b) => a.afterIndex - b.afterIndex);
    
    // Entferne doppelte Umbrüche (wenn mehrere Umbrüche direkt hintereinander folgen)
    const uniqueBreakInfo = breakInfo.filter((info, index, array) => {
        if (index === 0) return true;
        const prevInfo = array[index - 1];
        // Wenn der vorherige Umbruch direkt vor diesem Element ist, ignoriere diesen
        return info.afterIndex - prevInfo.afterIndex > 1;
    });
    
    return {
        elementIds: uniqueBreakInfo.map(info => info.elementId),
        manualBreakElements,
        breakInfo: uniqueBreakInfo
    };
}

async function generatePDF(format) {
    // Sicherheitsmechanismus für fehlende Funktionen
    if (typeof estimatePDFElementHeight !== 'function') {
        console.warn("estimatePDFElementHeight nicht definiert, Funktion wurde nun implementiert");
    }
    
    const progressContainer = document.getElementById('pdf-progress-container');
    const pageBreakInfo = extractPageBreaksFromPreview();
    console.log("Verwende Seitenumbrüche aus der Vorschau:", pageBreakInfo);
    const progressBar = document.getElementById('pdf-progress-bar');
    const progressText = document.getElementById('pdf-progress-text');
    progressContainer.style.display = 'block';
    showProgress(0, "Initialisiere PDF-Erstellung");
    console.log("Starting PDF generation for format:", format);
    const { PDFDocument } = window.PDFLib;
    const fontkit = window.fontkit;
    
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    
    console.log("Loading fonts...");
    showProgress(10, "Lade Schriftarten");
    
    // Lade Konfiguration
    let config;
    try {
        const savedConfig = localStorage.getItem('liedblattConfig');
        if (savedConfig) {
            config = JSON.parse(savedConfig);
            console.log("Loaded config from localStorage:", config);
        } else {
            throw new Error("No saved config found in localStorage");
        }
    } catch (error) {
        console.error("Error loading config from localStorage:", error);
        config = {
            fontFamily: 'Jost',
            fontSize: 12,
            lineHeight: 1.2,
            textAlign: 'center',
            format: 'a5',
            churchLogo: null
        };
    }
    
    const globalConfig = {
        fontFamily: config.fontFamily || 'Jost',
        fontSize: pxToPt(parseFloat(config.fontSize || 12)),
        lineHeight: parseFloat(config.lineHeight || 1.5),
        textAlign: config.textAlign || 'left',
        format: config.format || 'a5',
        churchLogo: config.churchLogo
    };
    
    const scaledFontSize = globalConfig.fontSize;
    const scaledIconSize = scaleValue(ICON_SIZE, scaledFontSize);
    const scaledIconMargin = scaleValue(ICON_MARGIN, scaledFontSize);
    const scaledDefaultObjectSpacing = scaleValue(DEFAULT_OBJECT_SPACING, scaledFontSize);
    const scaledStropheSpacing = scaleValue(STROPHE_SPACING, scaledFontSize);
    
    console.log("Global config for PDF generation:", globalConfig);
    
    console.log("Loading selected font...");
    showProgress(10, "Lade ausgewählte Schriftart");
    const fonts = await fetchAndEmbedFont(doc, config.fontFamily);
    console.log("Font loaded:", config.fontFamily);
    
    const { width, height } = pageSizes[format];
    const margin = { top: 30, right: 20, bottom: 20, left: 20 };
    const contentWidth = width - margin.left - margin.right;
    
    let page = doc.addPage([width, height]);
    let y = height - margin.top;
    
    console.log("Page size:", { width, height, contentWidth });
    
    console.log("Current global config:", JSON.stringify(globalConfig));
    
    let logoImage = null;
    if (globalConfig.churchLogo) {
        showProgress(30, "Lade Logo");
        console.log("Fetching church logo from:", globalConfig.churchLogo);
        try {
            const logoUrl = `${globalConfig.churchLogo}`;
            console.log("Full logo URL:", logoUrl);
            const logoResponse = await fetch(logoUrl);
            if (!logoResponse.ok) throw new Error(`HTTP error! Status: ${logoResponse.status}`);
            const logoArrayBuffer = await logoResponse.arrayBuffer();
            
            const logoType = getImageType(logoArrayBuffer);
            
            if (logoType === 'png') {
                logoImage = await doc.embedPng(logoArrayBuffer);
            } else if (logoType === 'jpeg') {
                logoImage = await doc.embedJpg(logoArrayBuffer);
            } else {
                throw new Error('Unsupported logo image type');
            }
            
            console.log("Church logo embedded successfully");
        } catch (error) {
            console.error("Error embedding church logo:", error);
        }
    } else {
        console.log("No church logo path found in global config");
    }
    
    function getImageType(arrayBuffer) {
        const uint8Array = new Uint8Array(arrayBuffer);
        const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
        const jpegSignature = [255, 216, 255];
        
        if (pngSignature.every((byte, index) => uint8Array[index] === byte)) {
            return 'png';
        } else if (jpegSignature.every((byte, index) => uint8Array[index] === byte)) {
            return 'jpeg';
        } else {
            return 'unknown';
        }
    }
    
    function addLogoToPage(page) {
        if (logoImage) {
            const { width, height } = page.getSize();
            const logoHeight = 30; // Fixed height of 30px
            const aspectRatio = logoImage.width / logoImage.height;
            const logoWidth = logoHeight * aspectRatio;
            
            page.drawImage(logoImage, {
                x: width - logoWidth - 20,
                y: height - logoHeight - 20,
                width: logoWidth,
                height: logoHeight,
                opacity: 0.3
            });
        }
    }   
    
    // Add logo to the first page
    addLogoToPage(page);
    
    function addPage() {
        console.log("Adding new page");
        page = doc.addPage([width, height]);
        addLogoToPage(page); // Add logo to the new page
        y = height - margin.top;
        return { page, y };
    }
    
    async function drawText(text, x, y, fontSize, maxWidth, options = {}) {
        const { 
            bold, italic, underline, alignment, indent, isCopyright, isRefrain, isStrophe, 
            isLastElement, isHeading, isQuillHeading, afterIcon, isFirstOnPage,
            // Neue Optionen für Gruppeninformationen
            isInGroup, groupIndex, elementIndex, totalElements
        } = options;
        
        let font;
        if (bold && italic) {
            font = fonts.boldItalic;
        } else if (bold) {
            font = fonts.bold;
        } else if (italic) {
            font = fonts.italic;
        } else {
            font = fonts.regular; 
        }
        if (!font) {
            console.error(`Required font style not found for ${globalConfig.fontFamily}`);
            font = fonts.regular || Object.values(fonts)[0];
        }
        
        console.log("Drawing text:", { text: text.substring(0, 20) + "...", x, y, fontSize, bold, italic, underline, alignment, indent, isCopyright, isRefrain, isStrophe, isHeading, isQuillHeading });
        
        const actualFontSize = bold ? fontSize * 1 : fontSize;
        
        const lineHeight = (isRefrain || isStrophe) 
        ? globalConfig.lineHeight * 1
        : globalConfig.lineHeight;
        
        console.log("Element-Typ:", { isStrophe, isRefrain });
        console.log("Verwendete lineHeight:", lineHeight);  
        
        const lines = await splitTextToLines(text, font, fontSize, maxWidth - indent);
        let currentY = y;
        
        // Prüfe, ob der gesamte Text auf die Seite passt
        const totalTextHeight = lines.length * fontSize * lineHeight;
        const willFitOnPage = currentY - totalTextHeight >= margin.bottom;
        
        // Wenn der Text nicht passt und zu einer Gruppe gehört, prüfe die Gruppenzugehörigkeit
        if (!willFitOnPage && isInGroup) {
            // Wenn es sich um das erste Element einer Gruppe handelt, füge einen Seitenumbruch ein
            if (elementIndex === 0 || isStrophe && lines.length > 1) {
                console.log("Element belongs to a group and needs a page break");
                ({ page, y } = addPage());
                currentY = y;
            }
            // Wenn es ein Folgeelement einer Gruppe ist und die erste Zeile nicht passt,
            // füge ebenfalls einen Seitenumbruch ein
            else if (currentY - fontSize < margin.bottom) {
                console.log("Follow-up element in group needs a page break");
                ({ page, y } = addPage());
                currentY = y;
            }
        }
        
        // Zeichne den Text zeilenweise
        for (const line of lines) {
            // Prüfe, ob die aktuelle Zeile auf die Seite passt
            if (currentY - fontSize < margin.bottom) {
                // Für Strophen: Wenn wir im ersten Drittel einer Strophe sind, verschiebe die ganze Strophe
                if (isStrophe && (elementIndex / totalElements) < 0.3) {
                    console.log("First part of strophe needs page break, moving entire strophe");
                    ({ page, y } = addPage());
                    currentY = y;
                    // Zeichne alle Zeilen neu, beginnend mit der ersten
                    return drawText(text, x, y, fontSize, maxWidth, options);
                }
                
                // Für Titel: Verhindere Umbruch nach einem Titel
                if (isHeading || options.isTitle) {
                    console.log("Heading needs page break");
                    ({ page, y } = addPage());
                    currentY = y;
                    // Zeichne den Titel neu auf der neuen Seite
                    return drawText(text, x, y, fontSize, maxWidth, options);
                }
                
                // Standardfall: Füge einen Seitenumbruch ein
                ({ page, y } = addPage());
                currentY = y;
            }
            
            let xPos = x + indent;
            if (alignment === 'center') {
                xPos = x + (maxWidth - await font.widthOfTextAtSize(line, fontSize)) / 2;
            } else if (alignment === 'right') {
                xPos = x + maxWidth - await font.widthOfTextAtSize(line, fontSize);
            } else if (alignment === 'justify' && line !== lines[lines.length - 1]) {
                await drawJustifiedText(line, x + indent, currentY, fontSize, maxWidth - indent, { bold, italic, underline });
                currentY -= fontSize * lineHeight;
                continue;
            }
            
            page.drawText(line, {
                x: xPos,
                y: currentY,
                size: fontSize,
                font: font,
                lineHeight: lineHeight,
                maxWidth: maxWidth - indent
            });
            
            if (underline) {
                const lineWidth = await font.widthOfTextAtSize(line, fontSize);
                page.drawLine({
                    start: { x: xPos, y: currentY - 2 },
                    end: { x: xPos + lineWidth, y: currentY - 2 },
                    thickness: 0.5
                });
            }
            
            currentY -= fontSize * lineHeight;
        }
        
        // Anwenden des Abstands nach der Überschrift
        if (isHeading) {
            const headingSpacing = fontSize * 0.5; // Standard-Headingabstand
            console.log("Adding spacing after heading:", headingSpacing);
            currentY -= headingSpacing;
        }
        
        // Füge Abstand für Strophen und Refrains hinzu
        if (isStrophe || isRefrain) {
            currentY -= STROPHE_SPACING;
        }
        if (isLastElement) {
            currentY -= 0;
        } else {
            y -= fontSize * 0; // Standardabstand zwischen Absätzen
        }
        
        return y - currentY;
    }
    
    async function drawJustifiedText(text, x, y, fontSize, maxWidth, options = {}) {
        const { bold, italic, underline } = options;
        const font = fonts[globalConfig.fontFamily];
        const words = text.split(' ');
        const spaceWidth = await font.widthOfTextAtSize(' ', fontSize);
        const wordWidths = await Promise.all(words.map(word => font.widthOfTextAtSize(word, fontSize)));
        const totalWordWidth = wordWidths.reduce((sum, width) => sum + width, 0);
        const totalSpaces = words.length - 1;
        const extraSpace = maxWidth - totalWordWidth;
        const extraSpacePerWord = extraSpace / totalSpaces;
        
        let currentX = x;
        for (let i = 0; i < words.length; i++) {
            page.drawText(words[i], {
                x: currentX,
                y,
                size: fontSize,
                font: font
            });
            
            if (underline) {
                const wordWidth = wordWidths[i];
                page.drawLine({
                    start: { x: currentX, y: y - 2 },
                    end: { x: currentX + wordWidth, y: y - 2 },
                    thickness: 0.5,
                });
            }
            
            if (i < words.length - 1) {
                currentX += wordWidths[i] + spaceWidth + extraSpacePerWord;
            }
        }
    }
    async function drawImage(imgSrc, x, y, imgWidth) {
        console.log("Drawing image:", { imgSrc, x, y, imgWidth });
        try {
            const response = await fetch(imgSrc);
            const imgArrayBuffer = await response.arrayBuffer();
            const imgType = getImageType(imgArrayBuffer);
            
            let img;
            if (imgType === 'png') {
                img = await doc.embedPng(imgArrayBuffer);
            } else if (imgType === 'jpeg') {
                img = await doc.embedJpg(imgArrayBuffer);
            } else {
                throw new Error('Unsupported image type');
            }
            
            const scaledDims = img.scale(imgWidth / img.width);
            
            // Überprüfe, ob das Bild auf die aktuelle Seite passt
            if (y - scaledDims.height < margin.bottom) {
                // Wenn nicht, füge eine neue Seite hinzu
                ({ page, y } = addPage());
            }
            
            // Berücksichtigen Sie den oberen Abstand
            y -= scaleValue(IMAGE_MARGIN_TOP, scaledFontSize);
            
            page.drawImage(img, {
                x,
                y: y - scaledDims.height,
                width: scaledDims.width,
                height: scaledDims.height
            });
            
            // Aktualisiere die Y-Position für den nächsten Inhalt
            y = y - scaledDims.height - scaleValue(IMAGE_MARGIN_BOTTOM, scaledFontSize);
            
            return scaledDims.height + scaleValue(IMAGE_MARGIN_TOP, scaledFontSize) + scaleValue(IMAGE_MARGIN_BOTTOM, scaledFontSize);
        } catch (error) {
            console.error("Error embedding image:", error);
            return scaleValue(IMAGE_MARGIN_TOP, scaledFontSize) + scaleValue(IMAGE_MARGIN_BOTTOM, scaledFontSize);
        }
    }
    
    async function drawIcon(iconName, x, y, size) {
        console.log("Drawing icon:", { iconName, x, y, size });
        const iconPaths = {
            'star': '/api/icons/star.png',
            'herz': '/api/icons/herz.png',
            'cross': '/api/icons/cross.png',
            'dove': '/api/icons/dove.png',
            'default': '/api/icons/default.png'
        };
        
        const iconPath = iconPaths[iconName] || iconPaths['default'];
        
        try {
            const response = await fetch(iconPath);
            const imgArrayBuffer = await response.arrayBuffer();
            const img = await doc.embedPng(imgArrayBuffer);
            
            let iconWidth, iconHeight;
            
            if (iconName === 'default') {
                iconWidth = 150;
                iconHeight = (iconWidth / img.width) * img.height;
            } else {
                const scaledSize = Math.min(size, contentWidth);
                const scaledDims = img.scale(scaledSize / img.width);
                iconWidth = scaledDims.width;
                iconHeight = scaledDims.height;
            }
            
            const xCentered = x + (contentWidth - iconWidth) / 2;
            
            page.drawImage(img, {
                x: xCentered,
                y: y - iconHeight,
                width: iconWidth,
                height: iconHeight
            });
            
            return iconHeight;
        } catch (error) {
            console.error("Error drawing icon:", error);
            return 0;
        }
    }
    
    function showProgress(percent, message = '') {
        const progressBar = document.getElementById('pdf-progress-bar');
        const progressText = document.getElementById('pdf-progress-text');
        if (progressBar && progressText) {
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${Math.round(percent)}% ${message}`;
        }
        console.log(`Progress: ${percent}% ${message}`);
    }
    
    const liedblattContent = document.getElementById('liedblatt-content');
    const items = Array.from(liedblattContent.children);
    
    // Analysiere die Dokument-Struktur für bessere Umbruchentscheidungen
    const elementGroups = identifyElementGroups(items);
    
    console.log("Gruppenerkennung für PDF:", elementGroups.length, "Gruppen identifiziert");
    
    // Debug-Ausgabe für Gruppen
    elementGroups.forEach((group, idx) => {
        const types = group.map(el => {
            const classes = Array.from(el.classList).join(' ');
            return `${el.tagName}${classes ? ' (' + classes + ')' : ''}`;
        });
        console.log(`Gruppe ${idx + 1}: ${types.join(', ')}`);
    });
    
    // Erstelle eine Map für schnellen Zugriff auf Umbruchinformationen
    const breakInfoMap = {};
    if (pageBreakInfo.breakInfo) {
        pageBreakInfo.breakInfo.forEach(info => {
            breakInfoMap[info.elementId] = info;
        });
    }
    
    // Verarbeite Element-Gruppen mit intelligenter Seitenumbruch-Logik
    showProgress(40, "Verarbeite Inhalte");
    let processedElements = 0;
    
    for (let groupIndex = 0; groupIndex < elementGroups.length; groupIndex++) {
        const group = elementGroups[groupIndex];
        
        // Höhe der Gruppe schätzen
        const groupHeight = estimateGroupHeight(group);
        console.log(`Gruppe ${groupIndex + 1}: Geschätzte Höhe ${groupHeight}pt, Verfügbarer Platz: ${y - margin.bottom}pt`);
        
        // Entscheiden, ob die Gruppe auf die aktuelle Seite passt
        if ((y - groupHeight >= margin.bottom) || y === height - margin.top) {
            console.log(`Gruppe ${groupIndex + 1} passt auf aktuelle Seite`);
            
            // Verarbeite alle Elemente der Gruppe
            for (const element of group) {
                // Manueller Seitenumbruch
                if (element.classList.contains('page-break')) {
                    console.log("Manual page break detected");
                    ({ page, y } = addPage());
                    continue;
                }
                
                const elementId = element.getAttribute('data-original-id') || 
                element.getAttribute('data-liedblatt-id');
                
                // Verbesserte Umbruchlogik mit breakInfoMap
                const breakInfo = elementId ? breakInfoMap[elementId] : null;
                
                // Zeige den Typ des Umbruchs, falls vorhanden
                if (breakInfo) {
                    console.log(`Element mit ID ${elementId} hat Umbruchtyp: ${breakInfo.type}`);
                }
                
                const isFirstOnPage = y === height - margin.top;
                const afterIcon = items[processedElements - 1] && items[processedElements - 1].querySelector('.fas, .trenner-default-img');
                
                // Zeichne Icons
                if (element.querySelector('.fas, .trenner-default-img')) {
                    let iconType = 'default';
                    const iconElement = element.querySelector('.fas, .trenner-default-img');
                    if (iconElement.classList.contains('fa-heart')) iconType = 'herz';
                    if (iconElement.classList.contains('fa-star')) iconType = 'star';
                    if (iconElement.classList.contains('fa-cross')) iconType = 'cross';
                    if (iconElement.classList.contains('fa-dove')) iconType = 'dove';
                    
                    const iconHeight = await drawIcon(iconType, margin.left, y, scaledIconSize);
                    y -= iconHeight + scaledIconMargin;
                } else {
                    const elements = element.querySelectorAll('h1, h2, h3, p, img, em, u, strong, .copyright-info');
                    
                    // Verarbeite die einzelnen Elemente in der Gruppe
                    for (let j = 0; j < elements.length; j++) {
                        const element = elements[j];
                        
                        if (element.tagName === 'STRONG' && /^\d+\.$/.test(element.textContent.trim())) {
                            continue;
                        }
                        
                        if (element.tagName === 'IMG') {
                            const imgHeight = await drawImage(element.src, margin.left, y, contentWidth);
                            y -= imgHeight;
                        } else {
                            let fontSize = scaledFontSize;
                            let marginTop = 0;
                            let marginBottom = 0;
                            let isHeading = false;
                            let isQuillHeading = false;
                            const isCopyright = element.classList.contains('copyright-info');
                            const isRefrain = element.classList.contains('refrain');
                            
                            if (element.tagName === 'H1') {
                                fontSize = scaledFontSize * HEADING_1_SCALE;
                                isHeading = true;
                                if (element.classList.contains('isQuillHeading')) {
                                    isQuillHeading = true;
                                    marginTop = scaleValue(QUILL_H1_MARGIN_TOP, scaledFontSize);
                                    marginBottom = scaleValue(QUILL_H1_MARGIN_BOTTOM, scaledFontSize);
                                }
                            } else if (element.tagName === 'H2') {
                                fontSize = scaledFontSize * HEADING_2_SCALE;
                                isHeading = true;
                                if (element.classList.contains('isQuillHeading')) {
                                    isQuillHeading = true;
                                    marginTop = scaleValue(QUILL_H2_MARGIN_TOP, scaledFontSize);
                                    marginBottom = scaleValue(QUILL_H2_MARGIN_BOTTOM, scaledFontSize);
                                }
                            } else if (element.tagName === 'H3') {
                                fontSize = scaledFontSize * HEADING_3_SCALE;
                                isHeading = true;
                                if (element.classList.contains('isQuillHeading')) {
                                    isQuillHeading = true;
                                    marginTop = scaleValue(QUILL_H3_MARGIN_TOP, scaledFontSize);
                                    marginBottom = scaleValue(QUILL_H3_MARGIN_BOTTOM, scaledFontSize);
                                }
                            }
                            
                            if (isCopyright) { 
                                fontSize = scaleValue(COPYRIGHT_FONT_SIZE, scaledFontSize);
                                marginTop = scaleValue(COPYRIGHT_MARGIN_TOP, scaledFontSize);
                                marginBottom = scaleValue(COPYRIGHT_MARGIN_BOTTOM, scaledFontSize);
                            }
                            
                            const nextElement = elements[j + 1];
                            const isNextCopyright = nextElement && nextElement.classList.contains('copyright-info');
                            
                            if (isHeading && isNextCopyright) {
                                marginBottom = 1;
                            }
                            
                            if (j !== 0 || !isFirstOnPage) {
                                y -= marginTop;
                            }
                            
                            // Definiere gemeinsame Eigenschaften für Textdarstellung
                            const textProperties = {
                                fontWeight: window.getComputedStyle(element).fontWeight,
                                fontStyle: window.getComputedStyle(element).fontStyle,
                                textDecoration: window.getComputedStyle(element).textDecoration,
                                textAlign: window.getComputedStyle(element).textAlign,
                                paddingLeft: window.getComputedStyle(element).paddingLeft
                            };
                            
                            // Bestimme Formateigenschaften
                            const isBold = element.tagName === 'STRONG' || 
                            textProperties.fontWeight === 'bold' || 
                            parseInt(textProperties.fontWeight) >= 700;
                            
                            const isItalic = isRefrain || 
                            element.tagName === 'EM' || 
                            textProperties.fontStyle === 'italic';
                            
                            const isUnderlined = element.tagName === 'U' || 
                            textProperties.textDecoration.includes('underline');
                            
                            // Optionen für drawText mit Gruppenzugehörigkeit
                            const options = {
                                bold: isBold,
                                italic: isItalic,
                                underline: isUnderlined,
                                alignment: window.getComputedStyle(element).textAlign || globalConfig.textAlign,
                                indent: parseFloat(window.getComputedStyle(element).paddingLeft) || 0,
                                isCopyright: isCopyright,
                                isRefrain: isRefrain,
                                isStrophe: element.classList.contains('strophe'),
                                isLastElement: j === elements.length - 1,
                                isHeading: isHeading,
                                isQuillHeading: isQuillHeading,
                                afterIcon: afterIcon,
                                isFirstOnPage: isFirstOnPage,
                                // Gruppeninformationen
                                isInGroup: true,
                                groupIndex: groupIndex,
                                elementIndex: j,
                                totalElements: elements.length
                            };
                            
                            let textContent = element.innerText;
                            const textHeight = await drawText(textContent, margin.left, y, fontSize, contentWidth, options);
                            y -= textHeight;
                            y += marginBottom;
                        }
                        
                        if (y < margin.bottom) {
                            ({ page, y } = addPage());
                        }
                    }
                }
                
                // Standard-Abstand nach jedem Element hinzufügen
                y -= scaledDefaultObjectSpacing;
                processedElements++;
                
                // Umbruchlogik basierend auf detaillierten Informationen
                if (breakInfo) {
                    // Verwende den Umbruchtyp, falls vorhanden
                    const breakType = breakInfo.type;
                    console.log(`Seitenumbruch nach Element mit ID ${elementId} (Typ: ${breakType})`);
                    
                    // Verhindere Umbrüche nach Überschriften, es sei denn, es ist ein manueller Umbruch
                    if (breakType === 'manual' || !isTitle(element)) {
                        ({ page, y } = addPage());
                    } else {
                        console.log(`Umbruch nach Überschrift vermieden für Element: ${elementId}`);
                    }
                }
            }
        } else {
            // Gruppe passt nicht auf die aktuelle Seite
            console.log(`Gruppe ${groupIndex + 1} passt nicht - Seitenumbruch nach Element ${processedElements}`);
            
            if (processedElements > 0) {
                // Seitenumbruch einfügen
                console.log("Group doesn't fit on current page, adding page break");
                ({ page, y } = addPage());
                
                // Verarbeite die Gruppe auf der neuen Seite
                for (const element of group) {
                    // Manueller Seitenumbruch
                    if (element.classList.contains('page-break')) {
                        console.log("Manual page break detected");
                        ({ page, y } = addPage());
                        continue;
                    }
                    
                    const elementId = element.getAttribute('data-original-id') || 
                    element.getAttribute('data-liedblatt-id');
                    
                    // Verbesserte Umbruchlogik mit breakInfoMap
                    const breakInfo = elementId ? breakInfoMap[elementId] : null;
                    
                    const isFirstOnPage = y === height - margin.top;
                    const afterIcon = items[processedElements - 1] && items[processedElements - 1].querySelector('.fas, .trenner-default-img');
                    
                    // Zeichne Icons
                    if (element.querySelector('.fas, .trenner-default-img')) {
                        let iconType = 'default';
                        const iconElement = element.querySelector('.fas, .trenner-default-img');
                        if (iconElement.classList.contains('fa-heart')) iconType = 'herz';
                        if (iconElement.classList.contains('fa-star')) iconType = 'star';
                        if (iconElement.classList.contains('fa-cross')) iconType = 'cross';
                        if (iconElement.classList.contains('fa-dove')) iconType = 'dove';
                        
                        const iconHeight = await drawIcon(iconType, margin.left, y, scaledIconSize);
                        y -= iconHeight + scaledIconMargin;
                    } else {
                        const elements = element.querySelectorAll('h1, h2, h3, p, img, em, u, strong, .copyright-info');
                        
                        // Verarbeite die einzelnen Elemente in der Gruppe
                        for (let j = 0; j < elements.length; j++) {
                            const element = elements[j];
                            
                            if (element.tagName === 'STRONG' && /^\d+\.$/.test(element.textContent.trim())) {
                                continue;
                            }
                            
                            if (element.tagName === 'IMG') {
                                const imgHeight = await drawImage(element.src, margin.left, y, contentWidth);
                                y -= imgHeight;
                            } else {
                                let fontSize = scaledFontSize;
                                let marginTop = 0;
                                let marginBottom = 0;
                                let isHeading = false;
                                let isQuillHeading = false;
                                const isCopyright = element.classList.contains('copyright-info');
                                const isRefrain = element.classList.contains('refrain');
                                
                                if (element.tagName === 'H1') {
                                    fontSize = scaledFontSize * HEADING_1_SCALE;
                                    isHeading = true;
                                    if (element.classList.contains('isQuillHeading')) {
                                        isQuillHeading = true;
                                        marginTop = scaleValue(QUILL_H1_MARGIN_TOP, scaledFontSize);
                                        marginBottom = scaleValue(QUILL_H1_MARGIN_BOTTOM, scaledFontSize);
                                    }
                                } else if (element.tagName === 'H2') {
                                    fontSize = scaledFontSize * HEADING_2_SCALE;
                                    isHeading = true;
                                    if (element.classList.contains('isQuillHeading')) {
                                        isQuillHeading = true;
                                        marginTop = scaleValue(QUILL_H2_MARGIN_TOP, scaledFontSize);
                                        marginBottom = scaleValue(QUILL_H2_MARGIN_BOTTOM, scaledFontSize);
                                    }
                                } else if (element.tagName === 'H3') {
                                    fontSize = scaledFontSize * HEADING_3_SCALE;
                                    isHeading = true;
                                    if (element.classList.contains('isQuillHeading')) {
                                        isQuillHeading = true;
                                        marginTop = scaleValue(QUILL_H3_MARGIN_TOP, scaledFontSize);
                                        marginBottom = scaleValue(QUILL_H3_MARGIN_BOTTOM, scaledFontSize);
                                    }
                                }
                                
                                if (isCopyright) { 
                                    fontSize = scaleValue(COPYRIGHT_FONT_SIZE, scaledFontSize);
                                    marginTop = scaleValue(COPYRIGHT_MARGIN_TOP, scaledFontSize);
                                    marginBottom = scaleValue(COPYRIGHT_MARGIN_BOTTOM, scaledFontSize);
                                }
                                
                                const nextElement = elements[j + 1];
                                const isNextCopyright = nextElement && nextElement.classList.contains('copyright-info');
                                
                                if (isHeading && isNextCopyright) {
                                    marginBottom = 1;
                                }
                                
                                if (j !== 0 || !isFirstOnPage) {
                                    y -= marginTop;
                                }
                                
                                // Definiere gemeinsame Eigenschaften für Textdarstellung
                                const textProperties = {
                                    fontWeight: window.getComputedStyle(element).fontWeight,
                                    fontStyle: window.getComputedStyle(element).fontStyle,
                                    textDecoration: window.getComputedStyle(element).textDecoration,
                                    textAlign: window.getComputedStyle(element).textAlign,
                                    paddingLeft: window.getComputedStyle(element).paddingLeft
                                };
                                
                                // Bestimme Formateigenschaften
                                const isBold = element.tagName === 'STRONG' || 
                                textProperties.fontWeight === 'bold' || 
                                parseInt(textProperties.fontWeight) >= 700;
                                
                                const isItalic = isRefrain || 
                                element.tagName === 'EM' || 
                                textProperties.fontStyle === 'italic';
                                
                                const isUnderlined = element.tagName === 'U' || 
                                textProperties.textDecoration.includes('underline');
                                
                                // Optionen für drawText mit Gruppenzugehörigkeit
                                const options = {
                                    bold: isBold,
                                    italic: isItalic,
                                    underline: isUnderlined,
                                    alignment: window.getComputedStyle(element).textAlign || globalConfig.textAlign,
                                    indent: parseFloat(window.getComputedStyle(element).paddingLeft) || 0,
                                    isCopyright: isCopyright,
                                    isRefrain: isRefrain,
                                    isStrophe: element.classList.contains('strophe'),
                                    isLastElement: j === elements.length - 1,
                                    isHeading: isHeading,
                                    isQuillHeading: isQuillHeading,
                                    afterIcon: afterIcon,
                                    isFirstOnPage: isFirstOnPage,
                                    // Gruppeninformationen
                                    isInGroup: true,
                                    groupIndex: groupIndex,
                                    elementIndex: j,
                                    totalElements: elements.length
                                };
                                
                                let textContent = element.innerText;
                                const textHeight = await drawText(textContent, margin.left, y, fontSize, contentWidth, options);
                                y -= textHeight;
                                y += marginBottom;
                            }
                            
                            if (y < margin.bottom) {
                                ({ page, y } = addPage());
                            }
                        }
                    }
                    
                    // Standard-Abstand nach jedem Element hinzufügen
                    y -= scaledDefaultObjectSpacing;
                    processedElements++;
                    
                    // Umbruchlogik basierend auf detaillierten Informationen
                    if (breakInfo) {
                        // Verwende den Umbruchtyp, falls vorhanden
                        const breakType = breakInfo.type;
                        console.log(`Seitenumbruch nach Element mit ID ${elementId} (Typ: ${breakType})`);
                        
                        // Verhindere Umbrüche nach Überschriften, es sei denn, es ist ein manueller Umbruch
                        if (breakType === 'manual' || !isTitle(element)) {
                            ({ page, y } = addPage());
                        } else {
                            console.log(`Umbruch nach Überschrift vermieden für Element: ${elementId}`);
                        }
                    }
                }
            } else {
                // Erste Gruppe auf der Seite, aber zu groß
                console.log(`Gruppe ${groupIndex + 1} zu groß für die Seite, wird aufgeteilt`);
                
                // Versuche trotzdem, so viele Elemente wie möglich zu platzieren
                for (const element of group) {
                    // Manueller Seitenumbruch
                    if (element.classList.contains('page-break')) {
                        console.log("Manual page break detected");
                        ({ page, y } = addPage());
                        continue;
                    }
                    
                    const elementId = element.getAttribute('data-original-id') || 
                    element.getAttribute('data-liedblatt-id');
                    
                    // Verbesserte Umbruchlogik mit breakInfoMap
                    const breakInfo = elementId ? breakInfoMap[elementId] : null;
                    
                    const isFirstOnPage = y === height - margin.top;
                    const afterIcon = items[processedElements - 1] && items[processedElements - 1].querySelector('.fas, .trenner-default-img');
                    
                    // Zeichne Icons
                    if (element.querySelector('.fas, .trenner-default-img')) {
                        let iconType = 'default';
                        const iconElement = element.querySelector('.fas, .trenner-default-img');
                        if (iconElement.classList.contains('fa-heart')) iconType = 'herz';
                        if (iconElement.classList.contains('fa-star')) iconType = 'star';
                        if (iconElement.classList.contains('fa-cross')) iconType = 'cross';
                        if (iconElement.classList.contains('fa-dove')) iconType = 'dove';
                        
                        const iconHeight = await drawIcon(iconType, margin.left, y, scaledIconSize);
                        y -= iconHeight + scaledIconMargin;
                    } else {
                        const elements = element.querySelectorAll('h1, h2, h3, p, img, em, u, strong, .copyright-info');
                        
                        // Verarbeite die einzelnen Elemente in der Gruppe
                        for (let j = 0; j < elements.length; j++) {
                            const element = elements[j];
                            
                            if (element.tagName === 'STRONG' && /^\d+\.$/.test(element.textContent.trim())) {
                                continue;
                            }
                            
                            if (element.tagName === 'IMG') {
                                const imgHeight = await drawImage(element.src, margin.left, y, contentWidth);
                                y -= imgHeight;
                            } else {
                                let fontSize = scaledFontSize;
                                let marginTop = 0;
                                let marginBottom = 0;
                                let isHeading = false;
                                let isQuillHeading = false;
                                const isCopyright = element.classList.contains('copyright-info');
                                const isRefrain = element.classList.contains('refrain');
                                
                                if (element.tagName === 'H1') {
                                    fontSize = scaledFontSize * HEADING_1_SCALE;
                                    isHeading = true;
                                    if (element.classList.contains('isQuillHeading')) {
                                        isQuillHeading = true;
                                        marginTop = scaleValue(QUILL_H1_MARGIN_TOP, scaledFontSize);
                                        marginBottom = scaleValue(QUILL_H1_MARGIN_BOTTOM, scaledFontSize);
                                    }
                                } else if (element.tagName === 'H2') {
                                    fontSize = scaledFontSize * HEADING_2_SCALE;
                                    isHeading = true;
                                    if (element.classList.contains('isQuillHeading')) {
                                        isQuillHeading = true;
                                        marginTop = scaleValue(QUILL_H2_MARGIN_TOP, scaledFontSize);
                                        marginBottom = scaleValue(QUILL_H2_MARGIN_BOTTOM, scaledFontSize);
                                    }
                                } else if (element.tagName === 'H3') {
                                    fontSize = scaledFontSize * HEADING_3_SCALE;
                                    isHeading = true;
                                    if (element.classList.contains('isQuillHeading')) {
                                        isQuillHeading = true;
                                        marginTop = scaleValue(QUILL_H3_MARGIN_TOP, scaledFontSize);
                                        marginBottom = scaleValue(QUILL_H3_MARGIN_BOTTOM, scaledFontSize);
                                    }
                                }
                                
                                if (isCopyright) { 
                                    fontSize = scaleValue(COPYRIGHT_FONT_SIZE, scaledFontSize);
                                    marginTop = scaleValue(COPYRIGHT_MARGIN_TOP, scaledFontSize);
                                    marginBottom = scaleValue(COPYRIGHT_MARGIN_BOTTOM, scaledFontSize);
                                }
                                
                                const nextElement = elements[j + 1];
                                const isNextCopyright = nextElement && nextElement.classList.contains('copyright-info');
                                
                                if (isHeading && isNextCopyright) {
                                    marginBottom = 1;
                                }
                                
                                if (j !== 0 || !isFirstOnPage) {
                                    y -= marginTop;
                                }
                                
                                // Definiere gemeinsame Eigenschaften für Textdarstellung
                                const textProperties = {
                                    fontWeight: window.getComputedStyle(element).fontWeight,
                                    fontStyle: window.getComputedStyle(element).fontStyle,
                                    textDecoration: window.getComputedStyle(element).textDecoration,
                                    textAlign: window.getComputedStyle(element).textAlign,
                                    paddingLeft: window.getComputedStyle(element).paddingLeft
                                };
                                
                                // Bestimme Formateigenschaften
                                const isBold = element.tagName === 'STRONG' || 
                                textProperties.fontWeight === 'bold' || 
                                parseInt(textProperties.fontWeight) >= 700;
                                
                                const isItalic = isRefrain || 
                                element.tagName === 'EM' || 
                                textProperties.fontStyle === 'italic';
                                
                                const isUnderlined = element.tagName === 'U' || 
                                textProperties.textDecoration.includes('underline');
                                
                                // Optionen für drawText mit Gruppenzugehörigkeit
                                const options = {
                                    bold: isBold,
                                    italic: isItalic,
                                    underline: isUnderlined,
                                    alignment: window.getComputedStyle(element).textAlign || globalConfig.textAlign,
                                    indent: parseFloat(window.getComputedStyle(element).paddingLeft) || 0,
                                    isCopyright: isCopyright,
                                    isRefrain: isRefrain,
                                    isStrophe: element.classList.contains('strophe'),
                                    isLastElement: j === elements.length - 1,
                                    isHeading: isHeading,
                                    isQuillHeading: isQuillHeading,
                                    afterIcon: afterIcon,
                                    isFirstOnPage: isFirstOnPage,
                                    // Gruppeninformationen
                                    isInGroup: true,
                                    groupIndex: groupIndex,
                                    elementIndex: j,
                                    totalElements: elements.length
                                };
                                
                                let textContent = element.innerText;
                                const textHeight = await drawText(textContent, margin.left, y, fontSize, contentWidth, options);
                                y -= textHeight;
                                y += marginBottom;
                            }
                            
                            // Nach jedem Element prüfen, ob noch Platz ist
                            if (y < margin.bottom && processedElements < items.length - 1) {
                                ({ page, y } = addPage());
                            }
                        }
                    }
                    
                    // Standard-Abstand nach jedem Element hinzufügen
                    y -= scaledDefaultObjectSpacing;
                    processedElements++;
                    
                    // Umbruchlogik basierend auf detaillierten Informationen
                    if (breakInfo) {
                        // Verwende den Umbruchtyp, falls vorhanden
                        const breakType = breakInfo.type;
                        console.log(`Seitenumbruch nach Element mit ID ${elementId} (Typ: ${breakType})`);
                        
                        // Verhindere Umbrüche nach Überschriften, es sei denn, es ist ein manueller Umbruch
                        if (breakType === 'manual' || !isTitle(element)) {
                            ({ page, y } = addPage());
                        } else {
                            console.log(`Umbruch nach Überschrift vermieden für Element: ${elementId}`);
                        }
                    }
                }
            }
        }
        
        // Fortschritt anzeigen
        showProgress(40 + (groupIndex / elementGroups.length) * 50, "Generiere PDF-Inhalt");
    }
    
    // Stelle sicher, dass die PDF eine gerade Seitenzahl hat (wichtig für Broschüren)
    ensureEvenPageCount(doc);
    
    console.log("PDF generation complete. Saving...");
    showProgress(90, "Finalisiere PDF");
    
    try {
        console.log("PDF generation complete. Saving...");
        let pdfBytes = await doc.save();
        console.log(`Generated PDF size: ${pdfBytes.length} bytes`);
        
        const createBrochureChecked = document.getElementById('createBrochure').checked;
        if (createBrochureChecked) {
            console.log("Creating brochure...");
            showProgress(95, "Erstelle Broschüre");
            
            const tempDoc = await PDFDocument.load(pdfBytes);
            let pageCount = tempDoc.getPageCount();
            console.log(`Original page count: ${pageCount}`);
            
            console.log(`Final page count: ${pageCount}`);
            pdfBytes = await tempDoc.save();
            
            const brochurePdfBytes = await createBrochure(pdfBytes, format);
            console.log(`Generated brochure PDF size: ${brochurePdfBytes.length} bytes`);
            console.log("Brochure created. Downloading...");
            downloadPDF(brochurePdfBytes, `liedblatt_brochure_${format}.pdf`);
        } else {
            console.log("Downloading standard PDF...");
            downloadPDF(pdfBytes, `liedblatt_${format}.pdf`);
        }
        
        showProgress(100, "PDF-Erstellung abgeschlossen");
    } catch (error) {
        console.error("Error during PDF generation or brochure creation:", error);
        await customAlert(`Fehler bei der PDF-Erstellung: ${error.message}`);
    } finally {
        progressContainer.style.display = 'none';
    }
}

/**
* Stellt sicher, dass die PDF-Datei eine gerade Seitenzahl hat
* @param {PDFDocument} doc - Das PDF-Dokument
*/
function ensureEvenPageCount(doc) {
    const pageCount = doc.getPageCount();
    if (pageCount % 2 !== 0) {
        console.log("Ungerade Seitenzahl erkannt. Füge leere Seite hinzu.");
        const { width, height } = doc.getPage(0).getSize();
        const newPage = doc.addPage([width, height]);
        addMinimalContent(newPage);
    }
}

/**
* Fügt minimalen Inhalt zu einer Seite hinzu, um leere Seiten zu vermeiden
* @param {PDFPage} page - Die Seite, zu der Inhalt hinzugefügt werden soll
*/
function addMinimalContent(page) {
    page.drawCircle({
        x: 1,
        y: 1,
        size: 0.1,
        color: PDFLib.rgb(0.95, 0.95, 0.95)
    });
}

/**
* Sucht nach einem Seitenumbruch in einem Element und seinen Kindelementen
* @param {HTMLElement} element - Das zu durchsuchende Element
* @returns {HTMLElement|null} - Das gefundene Seitenumbruch-Element oder null
*/
function findPageBreak(element) {
    if (element.classList && element.classList.contains('page-break')) {
        return element;
    }
    
    for (let i = 0; i < element.children.length; i++) {
        const pageBreak = findPageBreak(element.children[i]);
        if (pageBreak) {
            return pageBreak;
        }
    }
    
    return null;
}

/**
* Bereinigt den Schriftfamiliennamen für den Font-Ladevorgang
* @param {string} fontFamily - Der zu bereinigende Schriftfamilienname
* @returns {string} - Der bereinigte Schriftfamilienname
*/
function getCleanFontFamily(fontFamily) {
    return fontFamily.split('-')[0].trim();
}

/**
* Lädt und bettet eine Schriftart in ein PDF-Dokument ein
* @param {PDFDocument} doc - Das PDF-Dokument
* @param {string} fontFamily - Der Name der Schriftfamilie
* @returns {Object} - Die eingebetteten Schriftarten
*/
async function fetchAndEmbedFont(doc, fontFamily) {
    fontFamily = getCleanFontFamily(fontFamily);
    console.log("Fetching font family:", fontFamily);
    
    const fontFamilyMapping = {
        'Playfair Display': 'PlayfairDisplay',
        'Crimson Text': 'CrimsonText',
        'Open Sans': 'OpenSans',
        'Alegreya Sans': 'AlegreyaSans',
        'Andada Pro': 'AndadaPro',
        'Bodoni Moda': 'BodoniModa'
    };
    
    const formattedFontFamily = fontFamilyMapping[fontFamily] || fontFamily.replace(/\s+/g, '');
    const styles = ['Regular', 'Bold', 'Italic', 'BoldItalic'];
    
    const loadedFonts = {};
    
    for (const style of styles) {
        const fontName = `${formattedFontFamily}-${style}`;
        const url = `/api/ttf/${fontName}.ttf`;
        
        try {
            console.log(`Attempting to load: ${url}`);
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const fontBytes = await response.arrayBuffer();
            
            const font = await doc.embedFont(fontBytes, { 
                subset: true,
                features: {
                    liga: true,
                    kern: true
                }
            });
            
            if (!font || typeof font.widthOfTextAtSize !== 'function') {
                throw new Error('Font not properly embedded or missing widthOfTextAtSize function');
            }
            
            // Testen der widthOfTextAtSize Funktion
            const testWidth = font.widthOfTextAtSize('Test', 12);
            if (typeof testWidth !== 'number' || isNaN(testWidth)) {
                throw new Error('widthOfTextAtSize function is not working correctly');
            }
            
            console.log(`Font ${fontName} embedded successfully`);
            loadedFonts[style.toLowerCase()] = font;
        } catch (error) {
            console.error(`Error fetching or embedding font: ${fontName}`, error);
            if (style !== 'Regular' && loadedFonts.regular) {
                console.warn(`Using Regular as fallback for ${style}`);
                loadedFonts[style.toLowerCase()] = loadedFonts.regular;
            } else if (style === 'Regular') {
                throw error; // Wenn Regular fehlt, werfen wir einen Fehler
            }
        }
    }
    
    if (!loadedFonts.regular) {
        throw new Error(`Failed to load Regular style for ${fontFamily}`);
    }
    
    return loadedFonts;
}

/**
* Teilt einen Text in Zeilen auf, die in eine bestimmte Breite passen
* @param {string} text - Der zu teilende Text
* @param {PDFFont} font - Die verwendete Schriftart
* @param {number} fontSize - Die Schriftgröße
* @param {number} maxWidth - Die maximale Breite
* @returns {string[]} - Die aufgeteilten Textzeilen
*/
async function splitTextToLines(text, font, fontSize, maxWidth) {
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
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

/**
* Lädt eine PDF-Datei herunter
* @param {Uint8Array} pdfBytes - Die Bytes der PDF-Datei
* @param {string} fileName - Der Name der Datei
*/
function downloadPDF(pdfBytes, fileName) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

// Event-Listener für den PDF-Generator
document.getElementById('pdf-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const format = document.getElementById('pdfFormat').value;
    generatePDF(format);
});

/**
* Erstellt eine Broschüre aus einer PDF-Datei
* @param {Uint8Array} inputPdfBytes - Die Bytes der Eingabe-PDF
* @param {string} format - Das gewählte Format
* @returns {Promise<Uint8Array>} - Die Bytes der Broschüre-PDF
*/
async function createBrochure(inputPdfBytes, format) {
    const { PDFDocument, PageSizes } = PDFLib;
    console.log("PDF-Lib verfügbar:", !!PDFLib);
    
    if (!inputPdfBytes || inputPdfBytes.length === 0) {
        throw new Error('Ungültige PDF-Daten: Die Eingabe-PDF ist leer oder undefiniert.');
    }
    
    let inputPdf;
    try {
        inputPdf = await PDFDocument.load(inputPdfBytes);
    } catch (error) {
        console.error('Fehler beim Laden des Eingabe-PDFs:', error);
        throw new Error('Das Eingabe-PDF konnte nicht geladen werden. Möglicherweise ist es beschädigt.');
    }
    
    const outputPdf = await PDFDocument.create();
    
    const pageCount = inputPdf.getPageCount();
    console.log(`Das Eingabe-PDF hat ${pageCount} Seiten`);
    
    if (pageCount === 0) {
        throw new Error('Das Eingabe-PDF enthält keine Seiten.');
    }
    
    const { width: targetWidth, height: targetHeight } = getPageDimensionsForFormat(format);
    console.log(`Ziel-Seitendimensionen für ${format}: ${targetWidth}x${targetHeight}`);
    
    const outputPageSize = getOutputPageSize(format);
    
    if (format === 'a5' || format === 'a4-schmal' || format === 'a3-schmal') {
        await createA5orA4SchmalBrochure(inputPdf, outputPdf, pageCount, format, targetWidth, targetHeight, outputPageSize);
    } else if (format === 'dl') {
        await createDinLangBrochure(inputPdf, outputPdf, pageCount, targetWidth, targetHeight, outputPageSize);
    }
    
    console.log("Broschürenerstellung abgeschlossen, PDF wird gespeichert...");
    return await outputPdf.save();
}

/**
* Erstellt eine DIN Lang-Broschüre
* @param {PDFDocument} inputPdf - Die Eingabe-PDF
* @param {PDFDocument} outputPdf - Die Ausgabe-PDF
* @param {number} pageCount - Die Anzahl der Seiten
* @param {number} targetWidth - Die Zielbreite
* @param {number} targetHeight - Die Zielhöhe
* @param {[number, number]} outputPageSize - Die Größe der Ausgabeseite
* @returns {Promise<void>}
*/
async function createDinLangBrochure(inputPdf, outputPdf, pageCount, targetWidth, targetHeight, outputPageSize) {
    const pagesPerSheet = 3;
    
    if (pageCount <= 6) {
        if (pageCount === 1) {
            const newPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 0, 0, targetWidth, targetHeight);
        } else if (pageCount === 2) {
            const newPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 0, 0, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 1, 1, targetWidth, targetHeight);
        } else if (pageCount === 3) {
            const newPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 0, 0, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 1, 1, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 2, 2, targetWidth, targetHeight);
        } else if (pageCount >= 4) {
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, secondPage, 0, 2, targetWidth, targetHeight);
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, firstPage, 1, 0, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, firstPage, 2, 1, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, firstPage, 3, 2, targetWidth, targetHeight);
            
            if (pageCount >= 5) {
                await drawPageOnSheetForDinLang(inputPdf, outputPdf, secondPage, 4, 0, targetWidth, targetHeight);
            }
            if (pageCount === 6) {
                await drawPageOnSheetForDinLang(inputPdf, outputPdf, secondPage, 5, 1, targetWidth, targetHeight);
            }
        }
    } else {
        // Für mehr als 6 Seiten verwenden wir eine allgemeine Logik
        const sheetsNeeded = Math.ceil(pageCount / pagesPerSheet);
        
        for (let sheet = 0; sheet < sheetsNeeded; sheet++) {
            const newPage = outputPdf.addPage(outputPageSize);
            console.log(`Neue Seite zum Ausgabe-PDF hinzugefügt für Blatt ${sheet + 1}`);
            
            for (let i = 0; i < pagesPerSheet; i++) {
                const pageIndex = sheet * pagesPerSheet + i;
                if (pageIndex < pageCount) {
                    await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, pageIndex, i, targetWidth, targetHeight);
                }
            }
        }
    }
}

/**
* Erstellt eine A5- oder A4-Schmal-Broschüre
* @param {PDFDocument} inputPdf - Die Eingabe-PDF
* @param {PDFDocument} outputPdf - Die Ausgabe-PDF
* @param {number} pageCount - Die Anzahl der Seiten
* @param {string} format - Das gewählte Format
* @param {number} targetWidth - Die Zielbreite
* @param {number} targetHeight - Die Zielhöhe
* @param {[number, number]} outputPageSize - Die Größe der Ausgabeseite
* @returns {Promise<void>}
*/
async function createA5orA4SchmalBrochure(inputPdf, outputPdf, pageCount, format, targetWidth, targetHeight, outputPageSize) {
    const pagesPerSheet = 2;
    let sheetsNeeded = Math.ceil(pageCount / pagesPerSheet);
    
    if (pageCount <= 8) {
        if (pageCount === 1) {
            const newPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, newPage, 0, 0, targetWidth, targetHeight, format);
        } else if (pageCount === 2) {
            const newPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, newPage, 0, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, newPage, 1, 1, targetWidth, targetHeight, format);
        } else if (pageCount === 3) {
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, -1, 0, targetWidth, targetHeight, format); // Leere Seite
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 0, 1, targetWidth, targetHeight, format);
            
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 2, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 1, 1, targetWidth, targetHeight, format);
        } else if (pageCount === 4) {
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 3, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 0, 1, targetWidth, targetHeight, format);
            
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 1, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 2, 1, targetWidth, targetHeight, format);
        } else if (pageCount === 5) {
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 3, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 0, 1, targetWidth, targetHeight, format);
            
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 1, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 2, 1, targetWidth, targetHeight, format);
            
            const thirdPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, 4, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, -1, 1, targetWidth, targetHeight, format); // Leere Seite
        } else if (pageCount === 6) {
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 5, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 0, 1, targetWidth, targetHeight, format);
            
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 1, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 2, 1, targetWidth, targetHeight, format);
            
            const thirdPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, 4, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, 3, 1, targetWidth, targetHeight, format);
        } else if (pageCount === 7) {
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 6, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 0, 1, targetWidth, targetHeight, format);
            
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 1, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 2, 1, targetWidth, targetHeight, format);
            
            const thirdPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, 4, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, 3, 1, targetWidth, targetHeight, format);
            
            const fourthPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, fourthPage, 7, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, fourthPage, -1, 1, targetWidth, targetHeight, format); // Leere Seite
        } else if (pageCount === 8) {
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 7, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, firstPage, 0, 1, targetWidth, targetHeight, format);
            
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 1, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, secondPage, 6, 1, targetWidth, targetHeight, format);
            
            const thirdPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, 5, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, thirdPage, 2, 1, targetWidth, targetHeight, format);
            
            const fourthPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, fourthPage, 3, 0, targetWidth, targetHeight, format);
            await drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, fourthPage, 4, 1, targetWidth, targetHeight, format);
        }
    } else {
        // Implementierung für mehr als 8 Seiten
        // Bei mehr als 8 Seiten brauchen wir eine komplexere Broschürenreihenfolge
        const pageOrder = calculateBookletPageOrder(pageCount);
        
        // Seiten-Paare erstellen und auf Blätter verteilen
        for (let i = 0; i < pageOrder.length; i += 2) {
            const newPage = outputPdf.addPage(outputPageSize);
            
            // Linke Seite (Rückseite)
            if (pageOrder[i] < pageCount) {
                await drawPageOnSheetForA5AndA4Schmal(
                    inputPdf, outputPdf, newPage, 
                    pageOrder[i], 0, targetWidth, targetHeight, format
                );
            } else {
                // Leere Seite für Auffüllung
                await drawPageOnSheetForA5AndA4Schmal(
                    inputPdf, outputPdf, newPage, 
                    -1, 0, targetWidth, targetHeight, format
                );
            }
            
            // Rechte Seite (Vorderseite)
            if (i + 1 < pageOrder.length && pageOrder[i + 1] < pageCount) {
                await drawPageOnSheetForA5AndA4Schmal(
                    inputPdf, outputPdf, newPage, 
                    pageOrder[i + 1], 1, targetWidth, targetHeight, format
                );
            } else {
                // Leere Seite für Auffüllung
                await drawPageOnSheetForA5AndA4Schmal(
                    inputPdf, outputPdf, newPage, 
                    -1, 1, targetWidth, targetHeight, format
                );
            }
        }
    }
}

/**
* Berechnet die Seitenreihenfolge für eine Broschüre
* @param {number} pageCount - Anzahl der Seiten
* @returns {number[]} - Array mit der Reihenfolge der Seiten für den Druck
*/
function calculateBookletPageOrder(pageCount) {
    // Auf eine durch 4 teilbare Seitenzahl auffüllen
    const totalPages = Math.ceil(pageCount / 4) * 4;
    const order = [];
    
    for (let i = 0; i < totalPages / 2; i += 2) {
        // Rückseite (links, rechts)
        order.push(totalPages - 1 - i);
        order.push(i);
        
        // Vorderseite (links, rechts)
        order.push(i + 1);
        order.push(totalPages - 2 - i);
    }
    
    return order;
}

/**
* Zeichnet eine Seite für A5 und A4-Schmal auf ein Blatt
* @param {PDFDocument} inputPdf - Die Eingabe-PDF
* @param {PDFDocument} outputPdf - Die Ausgabe-PDF
* @param {PDFPage} newPage - Die neue Seite
* @param {number} pageIndex - Der Index der zu zeichnenden Seite
* @param {number} position - Die Position auf dem Blatt
* @param {number} targetWidth - Die Zielbreite
* @param {number} targetHeight - Die Zielhöhe
* @param {string} format - Das gewählte Format
* @returns {Promise<void>}
*/
async function drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, newPage, pageIndex, position, targetWidth, targetHeight, format) {
    console.log(`Verarbeite Seite ${pageIndex + 1} für Position ${position + 1}`);
    try {
        // Falls pageIndex -1 ist, dann handelt es sich um eine leere Seite
        if (pageIndex === -1) {
            console.log(`Leere Seite für Position ${position + 1}`);
            return;
        }
        
        const [embeddedPage] = await outputPdf.embedPages([inputPdf.getPage(pageIndex)]);
        
        if (!embeddedPage) {
            console.error(`Fehler: Keine eingebettete Seite für Index ${pageIndex} erhalten`);
            return;
        }
        
        // Berechnung der Position
        const { x, y } = getPositionOnSheet(position, targetWidth, targetHeight, newPage.getWidth(), newPage.getHeight(), 'a5');
        console.log(`Positioniere Seite ${pageIndex + 1} an Position (${x}, ${y})`);
        
        // Berechnung der Skalierung
        const scale = Math.min(targetWidth / embeddedPage.width, targetHeight / embeddedPage.height);
        const scaledWidth = embeddedPage.width * scale;
        const scaledHeight = embeddedPage.height * scale;
        
        newPage.drawPage(embeddedPage, {
            x: x + (targetWidth - scaledWidth) / 2,
            y: y + (targetHeight - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight
        });
        
        console.log(`Seite ${pageIndex + 1} erfolgreich zum Blatt hinzugefügt`);
    } catch (error) {
        console.error(`Fehler beim Einbetten oder Zeichnen der Seite ${pageIndex + 1}:`, error);
    }
}

/**
* Zeichnet eine Seite für DIN Lang auf ein Blatt
* @param {PDFDocument} inputPdf - Die Eingabe-PDF
* @param {PDFDocument} outputPdf - Die Ausgabe-PDF
* @param {PDFPage} newPage - Die neue Seite
* @param {number} pageIndex - Der Index der zu zeichnenden Seite
* @param {number} position - Die Position auf dem Blatt
* @param {number} targetWidth - Die Zielbreite
* @param {number} targetHeight - Die Zielhöhe
* @returns {Promise<void>}
*/
async function drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, pageIndex, position, targetWidth, targetHeight) {
    console.log(`Verarbeite Seite ${pageIndex + 1} für Position ${position + 1}`);
    try {
        const [embeddedPage] = await outputPdf.embedPages([inputPdf.getPage(pageIndex)]);
        
        if (!embeddedPage) {
            console.error(`Fehler: Keine eingebettete Seite für Index ${pageIndex} erhalten`);
            return;
        }
        
        // Berechnung der Position
        const { x, y } = getPositionOnSheet(position, targetWidth, targetHeight, newPage.getWidth(), newPage.getHeight(), 'dl');
        console.log(`Positioniere Seite ${pageIndex + 1} an Position (${x}, ${y})`);
        
        // Berechnung der Skalierung
        const columnWidth = targetWidth / 3; // Drei Spalten für DIN Lang
        const scale = Math.min(columnWidth / embeddedPage.width, targetHeight / embeddedPage.height);
        const scaledWidth = embeddedPage.width * scale;
        const scaledHeight = embeddedPage.height * scale;
        
        newPage.drawPage(embeddedPage, {
            x: x + (columnWidth - scaledWidth) / 2,
            y: y + (targetHeight - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight
        });
        console.log(`Seite ${pageIndex + 1} erfolgreich zum Blatt hinzugefügt`);
    } catch (error) {
        console.error(`Fehler beim Einbetten oder Zeichnen der Seite ${pageIndex + 1}:`, error);
    }
}

/**
* Berechnet die Position einer Seite auf einem Blatt
* @param {number} position - Die Position auf dem Blatt
* @param {number} targetWidth - Die Zielbreite
* @param {number} targetHeight - Die Zielhöhe
* @param {number} sheetWidth - Die Blattbreite
* @param {number} sheetHeight - Die Blatthöhe
* @param {string} format - Das gewählte Format
* @returns {{x: number, y: number}} - Die berechnete Position
*/
function getPositionOnSheet(position, targetWidth, targetHeight, sheetWidth, sheetHeight, format) {
    const columnWidth = sheetWidth / (format === 'dl' ? 3 : 2); // Drei Spalten für DIN Lang, zwei für andere Formate
    const rowHeight = sheetHeight; // Ganze Höhe des Blattes wird verwendet
    
    if (format === 'a5') {
        return {
            x: position === 0 ? 0 : sheetWidth / 2,
            y: 0
        };
    } else if (format === 'a4-schmal') {
        return {
            x: position === 0 ? 0 : sheetWidth / 2,
            y: 0
        };
    } else if (format === 'dl') {
        return {
            x: position * columnWidth, // Position auf der X-Achse abhängig von der Spalte
            y: 0 // Immer oben auf der Y-Achse
        };
    }
    
    // Fallback für unbekannte Formate
    return {
        x: position * (sheetWidth / 2),
        y: 0
    };
}

/**
* Ermittelt die Seitendimensionen für ein bestimmtes Format
* @param {string} format - Das gewählte Format
* @returns {{width: number, height: number}} - Die Seitendimensionen
*/
function getPageDimensionsForFormat(format) {
    const dimensions = {
        'a5': { width: 420, height: 595 },
        'dl': { width: 849, height: 595 },
        'a4-schmal': { width: 297, height: 842 },
        'a3-schmal': { width: 420, height: 1191 }
    }[format];
    
    if (!dimensions) {
        throw new Error(`Unbekanntes Format: ${format}`);
    }
    
    return dimensions;
}

/**
* Ermittelt die Ausgabeseitengröße für ein bestimmtes Format
* @param {string} format - Das gewählte Format
* @returns {[number, number]} - Die Seitengröße
*/
function getOutputPageSize(format) {
    switch (format) {
        case 'a5':
            return [841.89, 595.28]; // A4 Querformat
        case 'dl':
            return [841.89, 595.28]; // A4 Querformat
        case 'a4-schmal':
            return [595.28, 841.89]; // A4 Hochformat
        case 'a3-schmal':
            return [841.89, 1190.55]; // A3 Querformat
        default:
            return [595.28, 841.89]; // A4 Hochformat als Fallback
    }
}

/**
* Ermittelt die Anzahl der Seiten pro Blatt für ein bestimmtes Format
* @param {string} format - Das gewählte Format
* @returns {number} - Die Anzahl der Seiten pro Blatt
*/
function getPagesPerSheet(format) {
    return {
        'a5': 2,
        'dl': 3,
        'a4-schmal': 2,
        'a3-schmal': 2
    }[format] || 2;
}