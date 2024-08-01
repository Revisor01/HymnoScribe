
// generatePDF.js

import { globalConfig } from './script.js';

window.generatePDF = generatePDF;

const mmToPt = (mm) => mm * 2.83465;

const pageSizes = {
    'a5': { width: mmToPt(148), height: mmToPt(210) },
    'dl': { width: mmToPt(99), height: mmToPt(210) },
    'a4-schmal': { width: mmToPt(105), height: mmToPt(297) },
    'a3-schmal': { width: mmToPt(148), height: mmToPt(420) }
};

const PX_TO_PT_RATIO = 0.75;
const pxToPt = (px) => px * PX_TO_PT_RATIO;

const baseFontSize = 12; // Basis-Schriftgröße, von der wir ausgehen
const scaleFactor = globalConfig.fontSize / baseFontSize;

const headingStyles = {
    title: { fontSize: globalConfig.fontSize * 2, bold: true, lineHeight: 1.1, spacingBefore: 10, spacingAfter: 3 },
    subtitle: { fontSize: globalConfig.fontSize * 1.7, lineHeight: 1.1, spacingBefore: 10, spacingAfter: 10},
    heading: { fontSize: globalConfig.fontSize * 1.5, bold: true, lineHeight: 1.1, spacingBefore: 10, spacingAfter: 10 },
    bodyText: { fontSize: globalConfig.fontSize, lineHeight: 1.2, spacingBefore: 10, spacingAfter: 10 }
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
    console.log("Global config for PDF generation:", globalConfig);
    
    console.log("Loading selected font...");
    showProgress(10, "Lade ausgewählte Schriftart");
    const fonts = await fetchAndEmbedFont(doc, config.fontFamily);
    console.log("Font loaded:", config.fontFamily);
    
    const pageSizes = {
        'a5': { width: mmToPt(148), height: mmToPt(210) },
        'dl': { width: mmToPt(99), height: mmToPt(210) },
        'a4-schmal': { width: mmToPt(105), height: mmToPt(297) },
        'a3-schmal': { width: mmToPt(148), height: mmToPt(420) }
    };
    
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
            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();
            const logoHeight = 30; // Fixed height of 30px
            const aspectRatio = logoImage.width / logoImage.height;
            const logoWidth = logoHeight * aspectRatio;
            
            page.drawImage(logoImage, {
                x: pageWidth - logoWidth - 20, // 20px from right edge
                y: pageHeight - logoHeight - 20, // 20px from top edge
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
        const { bold, italic, underline, alignment, indent, isCopyright } = options;
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
            font = fonts.regular || Object.values(fonts)[0];  // Fallback zur ersten verfügbaren Schrift
        }
        
        console.log("Drawing text:", { text: text.substring(0, 20) + "...", x, y, fontSize, bold, italic, underline, alignment, indent, isCopyright });
        
        if (options.isCopyright) {
            fontSize = 8; // Feste Größe von 8pt für Copyright
        }
        // Hier können Sie die Schriftgröße für fette Schrift anpassen
        const actualFontSize = bold ? fontSize * 0.9 : fontSize;
        
        const lines = await splitTextToLines(text, font, fontSize, maxWidth - indent);
        let currentY = y;
        
        for (const line of lines) {
            if (currentY - fontSize < margin.bottom) {
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
                currentY -= fontSize * globalConfig.lineHeight;
                continue;
            }
            
            page.drawText(line, {
                x: xPos,
                y: currentY,
                size: fontSize,
                font: font,
                lineHeight: globalConfig.lineHeight,
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
            
            currentY -= fontSize * globalConfig.lineHeight;
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
            
            page.drawImage(img, {
                x,
                y: y - scaledDims.height,
                width: scaledDims.width,
                height: scaledDims.height
            });
            
            return scaledDims.height;
        } catch (error) {
            console.error("Error embedding image:", error);
            return 0;
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
    const items = liedblattContent.children;
    
    console.log("Processing liedblatt content...");
    
    let lastItemType = null;
    
    async function ensureSpace(requiredHeight) {
        if (y - requiredHeight < margin.bottom) {
            ({ page, y } = addPage());
            return true;
        }
        return false;
    }
    
    showProgress(40, "Verarbeite Inhalte");
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        //const fonts = await fetchAndEmbedFont(doc, config.fontFamily);
        console.log("Processing item:", item.tagName, item.className);
        
        if (item.classList.contains('page-break')) {
            console.log("Page break detected");
            ({ page, y } = addPage());
            continue;
        }
        if (item.querySelector('.fas, .trenner-default-img')) {
            // Icon-Logik (bleibt unverändert)
            let iconType = 'default';
            const iconElement = item.querySelector('.fas, .trenner-default-img');
            if (iconElement.classList.contains('fa-heart')) iconType = 'herz';
            if (iconElement.classList.contains('fa-star')) iconType = 'star';
            if (iconElement.classList.contains('fa-cross')) iconType = 'cross';
            if (iconElement.classList.contains('fa-dove')) iconType = 'dove';
            
            const iconHeight = await drawIcon(iconType, margin.left, y, 24);
            y -= iconHeight + 20; // Abstand nach Icons
            lastItemType = 'icon'; // Setze den Typ des letzten Elements auf 'icon'
        } else {
            // Andere Elemente (Text, Überschriften, etc.)
            const elements = item.querySelectorAll('h1, h2, h3, p, img, em, u, strong, .copyright-info');
            let lastElementWasStrophe = false;
            let strophenCounter = 0;
            let lastElementType = null;
            
            for (const element of elements) {
                // Überspringe alleinstehende Strophennummern
                if (element.tagName === 'STRONG' && /^\d+\.$/.test(element.textContent.trim())) {
                    continue;
                }
                
                if (element.tagName === 'IMG') {
                    // Wenn das vorherige Element eine Überschrift oder Copyright war, verringern wir den Abstand
                    if (lastElementType === 'heading' || lastElementType === 'copyright') {
                        y += globalConfig.fontSize * 0.3; // Verringere den vorherigen Abstand
                    }
                    const imgHeight = await drawImage(element.src, margin.left, y, contentWidth);
                    y -= imgHeight + 15; // Zusätzlicher Abstand nach Bildern
                    lastElementWasStrophe = false;
                    lastElementType = 'image';
                } else {
                    let fontSize = globalConfig.fontSize;
                    let isHeading = false;
                    let isCopyright = element.classList.contains('copyright-info');
                    
                    if (element.tagName === 'H1') { fontSize = globalConfig.fontSize * 1.6; isHeading = true; }
                    if (element.tagName === 'H2') { fontSize = globalConfig.fontSize * 1.4; isHeading = true; }
                    if (element.tagName === 'H3') { fontSize = globalConfig.fontSize * 1.2; isHeading = true; }
                    if (isCopyright) { fontSize = 8; }
                    
                    let options = {
                        bold: element.tagName === 'STRONG' || window.getComputedStyle(element).fontWeight === 'bold' || parseInt(window.getComputedStyle(element).fontWeight) >= 700,
                        italic: element.tagName === 'EM' || window.getComputedStyle(element).fontStyle === 'italic',
                        underline: element.tagName === 'U' || window.getComputedStyle(element).textDecoration.includes('underline'),
                        alignment: window.getComputedStyle(element).textAlign || globalConfig.textAlign,
                        indent: parseFloat(window.getComputedStyle(element).paddingLeft) || 0,
                        isCopyright: isCopyright
                    };
                    
                    let textContent = element.innerText;
                    
                    // Wenn das vorherige Element eine Überschrift oder Copyright war, verringern wir den Abstand
                    if (lastElementType === 'heading' && isCopyright) {
                        y += globalConfig.fontSize * 0.8; // Verringere den vorherigen Abstand stark
                    } else if ((lastElementType === 'heading' || lastElementType === 'copyright') && !isHeading && !isCopyright) {
                        y += globalConfig.fontSize * 0.1; // Verringere den vorherigen Abstand leicht für andere Elemente
                    }
                    if (isHeading) {
                        y -= fontSize * 0.1; // Verringerter Abstand vor Überschriften
                    }
                    const textHeight = await drawText(textContent, margin.left, y, fontSize, contentWidth, options);
                    y -= textHeight;
                    
                    if (isHeading) {
                        y -= fontSize * 0.4; // Sehr geringer Abstand nach Überschriften
                        lastElementType = 'heading';
                    } else if (isCopyright) {
                        y -= fontSize * 0.1; // Geringer Abstand nach Copyright
                        lastElementType = 'copyright';
                    } else if (lastElementWasStrophe) {
                        y -= fontSize * 0.3; // Etwas größerer Abstand nach Strophen
                        lastElementType = 'strophe';
                    } else {
                        y -= fontSize * 0.4; // Standardabstand zwischen Absätzen
                        lastElementType = 'normal';
                    }
                }
                
                // Überprüfe, ob genug Platz für das nächste Element vorhanden ist
                if (y < margin.bottom) {
                    ({ page, y } = addPage());
                }
            }
        }
        showProgress(40 + (i / items.length) * 50, "Generiere PDF-Inhalt");
    }
    
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
            
            // Entfernen Sie das Hinzufügen von leeren Seiten hier
            // Stattdessen lassen Sie die createBrochure Funktion die Seitenanzahl handhaben
            
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

function addMinimalContent(page) {
    // Füge minimalen Inhalt hinzu (ein kleiner, fast unsichtbarer Punkt)
    page.drawCircle({
        x: 1,
        y: 1,
        size: 1
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