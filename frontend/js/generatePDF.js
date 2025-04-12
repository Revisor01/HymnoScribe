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

// Neue Konstanten für Quill-Überschriften
const QUILL_H1_MARGIN_TOP = 0;
const QUILL_H1_MARGIN_BOTTOM = 12;
const QUILL_H2_MARGIN_TOP = 5;
const QUILL_H2_MARGIN_BOTTOM = 10;
const QUILL_H3_MARGIN_TOP = 5;
const QUILL_H3_MARGIN_BOTTOM = 5;
const COPYRIGHT_MARGIN_TOP = -5;
const COPYRIGHT_MARGIN_BOTTOM = -5;

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

async function generatePDF(format) {
    const progressContainer = document.getElementById('pdf-progress-container');
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
    
    function addPage() {
        console.log("Adding new page");
        page = doc.addPage([width, height]);
        addLogoToPage(page);
        y = height - margin.top;
        return { page, y };
    }
    
    const liedblattContent = document.getElementById('liedblatt-content');
    const items = Array.from(liedblattContent.children);
    
    // Analysiere die Dokument-Struktur für bessere Umbruchentscheidungen
    const elementGroups = identifyElementGroups(items);
    
    console.log("Processing liedblatt content with intelligent page breaks...");
    
    let lastItemType = null;
    let currentGroupIndex = -1;
    let currentGroup = null;
    let elementsInCurrentGroup = [];
    
    showProgress(40, "Verarbeite Inhalte");
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Suche die aktuelle Gruppe
        const newGroupIndex = elementGroups.findIndex(group => group.includes(item));
        
        // Wenn wir eine neue Gruppe beginnen
        if (newGroupIndex !== -1 && newGroupIndex !== currentGroupIndex) {
            // Prüfe, ob die gesamte Gruppe auf die aktuelle Seite passt
            const groupHeight = await estimateGroupHeight(elementGroups[newGroupIndex], scaledFontSize, globalConfig, contentWidth);
            
            if (y - groupHeight < margin.bottom && y !== height - margin.top) {
                console.log(`Group ${newGroupIndex} doesn't fit on current page, adding page break`);
                ({ page, y } = addPage());
            }
            
            currentGroupIndex = newGroupIndex;
            elementsInCurrentGroup = elementGroups[newGroupIndex];
        }
        
        // Verarbeite das Element wie gewohnt, aber mit Gruppeninformationen
        const isInGroup = currentGroupIndex !== -1;
        const indexInGroup = isInGroup ? elementsInCurrentGroup.indexOf(item) : -1;
        
        // Manueller Seitenumbruch
        if (item.classList.contains('page-break')) {
            console.log("Manual page break detected");
            ({ page, y } = addPage());
            continue;
        }
        
        const isFirstOnPage = y === height - margin.top;
        const afterIcon = items[i - 1] && items[i - 1].querySelector('.fas, .trenner-default-img');
        
        // Zeichne Icons
        if (item.querySelector('.fas, .trenner-default-img')) {
            let iconType = 'default';
            const iconElement = item.querySelector('.fas, .trenner-default-img');
            if (iconElement.classList.contains('fa-heart')) iconType = 'herz';
            if (iconElement.classList.contains('fa-star')) iconType = 'star';
            if (iconElement.classList.contains('fa-cross')) iconType = 'cross';
            if (iconElement.classList.contains('fa-dove')) iconType = 'dove';
            
            const iconHeight = await drawIcon(iconType, margin.left, y, scaledIconSize);
            y -= iconHeight + scaledIconMargin;
        } else {
            const elements = item.querySelectorAll('h1, h2, h3, p, img, em, u, strong, .copyright-info');
            
            // Prüfe, ob die Elementgruppe auf die aktuelle Seite passt
            if (currentGroupIndex !== -1 && !isFirstOnPage) {
                const groupHeight = await estimateGroupHeight(elementGroups[currentGroupIndex], scaledFontSize, globalConfig);
                
                // Wenn die Gruppe nicht auf die aktuelle Seite passt, füge einen Seitenumbruch ein
                if (y - groupHeight < margin.bottom) {
                    console.log("Group doesn't fit on current page, adding page break");
                    ({ page, y } = addPage());
                }
            }
            
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
                        if (element.classList.contains('isQuillHeading')) {
                            marginTop = scaleValue(QUILL_H1_MARGIN_TOP, scaledFontSize);
                            marginBottom = scaleValue(QUILL_H1_MARGIN_BOTTOM, scaledFontSize);
                        }
                    } else if (element.tagName === 'H2') {
                        fontSize = scaledFontSize * HEADING_2_SCALE;
                        if (element.classList.contains('isQuillHeading')) {
                            marginTop = scaleValue(QUILL_H2_MARGIN_TOP, scaledFontSize);
                            marginBottom = scaleValue(QUILL_H2_MARGIN_BOTTOM, scaledFontSize);
                        }
                    } else if (element.tagName === 'H3') {
                        fontSize = scaledFontSize * HEADING_3_SCALE;
                        if (element.classList.contains('isQuillHeading')) {
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
                    const elementOptions = {
                        bold: /* ... vorhandene Optionen ... */,
                        // Zusätzliche Informationen für intelligente Umbruchentscheidungen
                        isInGroup,
                        groupIndex: currentGroupIndex,
                        indexInGroup,
                        totalElementsInGroup: isInGroup ? elementsInCurrentGroup.length : 1
                    };
                    const isNextCopyright = nextElement && nextElement.classList.contains('copyright-info');
                    
                    if (isHeading && isNextCopyright) {
                        marginBottom = 1;
                    }
                    
                    if (j !== 0 || !isFirstOnPage) {
                        y -= marginTop;
                    }
                    
                    let options = {
                        bold: element.tagName === 'STRONG' || window.getComputedStyle(element).fontWeight === 'bold' || parseInt(window.getComputedStyle(element).fontWeight) >= 700,
                        italic: isRefrain || element.tagName === 'EM' || window.getComputedStyle(element).fontStyle === 'italic',
                        underline: element.tagName === 'U' || window.getComputedStyle(element).textDecoration.includes('underline'),
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
                        isInGroup: isInGroup,
                        groupIndex: currentGroupIndex,
                        elementIndex: j,
                        totalElements: elements.length
                    };
                    
                    console.log('isQuillHeading:', options.isQuillHeading, 'Item:', item);
                    
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
        
        // Füge den fixen Abstand nach jedem Objekt hinzu
        y -= scaledDefaultObjectSpacing;

        // Überprüfe, ob genug Platz für das nächste Element vorhanden ist
        if (y < margin.bottom) {
            ({ page, y } = addPage());
        }
        
        showProgress(40 + (i / items.length) * 50, "Generiere PDF-Inhalt");
    }
    
    ensureEvenPageCount(doc);
    
    console.log("PDF generation complete. Saving...");
    showProgress(90, "Finalisiere PDF");
    const pdfBytes = await doc.save();
    console.log("PDF saved. Checking if brochure is needed...");
    
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
* Identifiziert zusammengehörige Elementgruppen, die nicht getrennt werden sollten
* @param {Array} items - Alle Elemente im Dokument
* @returns {Array} - Array von Element-Gruppen
*/
function identifyElementGroups(items) {
    const groups = [];
    let currentGroup = [];
    let inStropheGroup = false;
    let inTitleGroup = false;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Manueller Seitenumbruch beendet eine Gruppe
        if (item.classList.contains('page-break')) {
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            inStropheGroup = false;
            inTitleGroup = false;
            continue;
        }
        
        // Prüfe, ob es ein Titel ist
        const isItemTitle = isTitle(item);
        
        // Prüfe, ob es eine Strophe oder ein Refrain ist
        const isItemStropheOrRefrain = isStropheOrRefrain(item);
        
        // Wenn wir einen Titel gefunden haben, beginne eine neue Titel-Gruppe
        if (isItemTitle) {
            // Wenn bereits eine Gruppe aktiv ist, beende sie
            if (currentGroup.length > 0 && !inTitleGroup) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            
            // Starte eine neue Titel-Gruppe
            currentGroup.push(item);
            inTitleGroup = true;
            continue;
        }
        
        // Wenn wir eine Strophe/Refrain nach einem Titel haben, füge es zur Titelgruppe hinzu
        if (isItemStropheOrRefrain && inTitleGroup) {
            currentGroup.push(item);
            continue;
        }
        
        // Wenn wir eine Strophe/Refrain haben, aber nicht in einer Titelgruppe sind
        if (isItemStropheOrRefrain) {
            // Wenn keine Gruppe aktiv ist, beginne eine neue
            if (currentGroup.length === 0) {
                currentGroup.push(item);
                inStropheGroup = true;
            } 
            // Wenn bereits eine Strophengruppe aktiv ist, füge es hinzu
            else if (inStropheGroup) {
                currentGroup.push(item);
            } 
            // Sonst beginne eine neue Gruppe
            else {
                groups.push([...currentGroup]);
                currentGroup = [item];
                inStropheGroup = true;
                inTitleGroup = false;
            }
            continue;
        }
        
        // Für andere Elemente, die nicht zu speziellen Gruppen gehören
        if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
        }
        
        currentGroup = [item];
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
* Schätzt die Höhe einer Gruppe von Elementen
* @param {Array} group - Gruppe von Elementen
* @param {number} fontSize - Aktuelle Schriftgröße
* @param {Object} config - Globale Konfiguration
* @returns {number} - Geschätzte Höhe der Gruppe
*/
async function estimateGroupHeight(group, fontSize, config, availableWidth) {
    let totalHeight = 0;
    
    for (const item of group) {
        const elements = item.querySelectorAll('h1, h2, h3, p, img, em, u, strong, .copyright-info');
        
        for (const element of elements) {
            if (element.tagName === 'IMG') {
                // Bild-Höhe schätzen
                const img = element;
                const imgWidth = availableWidth;
                const imgHeight = img.naturalHeight && img.naturalWidth ? 
                (img.naturalHeight / img.naturalWidth) * imgWidth : 
                scaleValue(DEFAULT_OBJECT_SPACING * 2, fontSize); // Fallback, wenn keine Dimensionen verfügbar
                totalHeight += imgHeight + scaleValue(IMAGE_MARGIN_TOP, fontSize) + scaleValue(IMAGE_MARGIN_BOTTOM, fontSize);
            } else {
                // Text-Höhe schätzen
                let elementFontSize = fontSize;
                
                if (element.tagName === 'H1') {
                    elementFontSize = fontSize * HEADING_1_SCALE;
                } else if (element.tagName === 'H2') {
                    elementFontSize = fontSize * HEADING_2_SCALE;
                } else if (element.tagName === 'H3') {
                    elementFontSize = fontSize * HEADING_3_SCALE;
                }
                
                const lineHeight = config.lineHeight;
                const text = element.innerText;
                const lines = estimateNumberOfLines(text, elementFontSize, availableWidth);
                
                totalHeight += lines * elementFontSize * lineHeight;
                
                // Zusätzliche Abstände
                if (element.classList.contains('strophe') || element.classList.contains('refrain')) {
                    totalHeight += scaleValue(STROPHE_SPACING, fontSize);
                }
            }
        }
        
        // Standard-Abstand nach jedem Element
        totalHeight += scaleValue(DEFAULT_OBJECT_SPACING, fontSize);
    }
    
    return totalHeight;
}
/**
* Schätzt die Anzahl der Zeilen für einen Text
* @param {string} text - Der zu messende Text
* @param {number} fontSize - Aktuelle Schriftgröße
* @param {number} maxWidth - Maximale Breite
* @returns {number} - Geschätzte Anzahl von Zeilen
*/
function estimateNumberOfLines(text, fontSize, maxWidth) {
    // Dies ist eine vereinfachte Schätzung; in der Realität wird font.widthOfTextAtSize verwendet
    const averageCharWidth = fontSize * 0.6; // Grobe Schätzung der durchschnittlichen Zeichenbreite
    const charsPerLine = Math.floor(maxWidth / averageCharWidth);
    
    // Aufteilen nach Wörtern und Berechnung der Zeilen
    const words = text.split(' ');
    let lines = 1;
    let currentLineLength = 0;
    
    for (const word of words) {
        // Wortlänge plus ein Leerzeichen
        const wordLength = word.length + 1;
        
        if (currentLineLength + wordLength <= charsPerLine) {
            currentLineLength += wordLength;
        } else {
            lines++;
            currentLineLength = wordLength;
        }
    }
    
    return Math.max(1, lines);
}


function ensureEvenPageCount(doc) {
    const pageCount = doc.getPageCount();
    if (pageCount % 2 !== 0) {
        console.log("Ungerade Seitenzahl erkannt. Füge leere Seite hinzu.");
        const { width, height } = doc.getPage(0).getSize();
        const newPage = doc.addPage([width, height]);
        addMinimalContent(newPage);
    }
}

function addMinimalContent(page) {
    page.drawCircle({
        x: 1,
        y: 1,
        size: 0.1,
        color: PDFLib.rgb(0.95, 0.95, 0.95)
    });
}
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

function getCleanFontFamily(fontFamily) {
    return fontFamily.split('-')[0].trim();
}

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
    }
}
async function drawPageOnSheetForA5AndA4Schmal(inputPdf, outputPdf, newPage, pageIndex, position, targetWidth, targetHeight) {
    console.log(`Verarbeite Seite ${pageIndex + 1} für Position ${position + 1}`);
    try {
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
}

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

function getPagesPerSheet(format) {
    return {
        'a5': 2,
        'dl': 3,
        'a4-schmal': 2
    }[format] || 2;
}
