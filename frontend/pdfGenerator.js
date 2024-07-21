// pdfGenerator.js

const mmToPt = (mm) => mm * 2.83465;

const pageSizes = {
    'a5': { width: mmToPt(148), height: mmToPt(210) },
    'dl': { width: mmToPt(105), height: mmToPt(210) }
};

const PX_TO_PT_RATIO = 0.75;
const pxToPt = (px) => px * PX_TO_PT_RATIO;

const headingStyles = {
    title: { fontSize: pxToPt(22), bold: true, lineHeight: 1.1, spacingBefore: pxToPt(0), spacingAfter: pxToPt(3) },
    subtitle: { fontSize: pxToPt(16), lineHeight: 1.1, spacingBefore: pxToPt(0), spacingAfter: pxToPt(3)},
    heading: { fontSize: pxToPt(14), bold: true, lineHeight: 1.1, spacingBefore: pxToPt(0), spacingAfter: pxToPt(3) },
    bodyText: { fontSize: pxToPt(12), lineHeight: 1.2, spacingBefore: pxToPt(0), spacingAfter: pxToPt(3) }
};

async function generatePDF(format) {
    const progressContainer = document.getElementById('pdf-progress-container');
    const progressBar = document.getElementById('pdf-progress-bar');
    const progressText = document.getElementById('pdf-progress-text');
    progressContainer.style.display = 'block';
    console.log("Starting PDF generation for format:", format);
    const { PDFDocument } = window.PDFLib;
    const fontkit = window.fontkit;
    
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    
    console.log("Loading fonts...");
    const fonts = {
        'Jost': {
            normal: await fetchAndEmbedFont(doc, 'Jost-Regular'),
            bold: await fetchAndEmbedFont(doc, 'Jost-Bold'),
            italic: await fetchAndEmbedFont(doc, 'Jost-Italic'),
            boldItalic: await fetchAndEmbedFont(doc, 'Jost-BoldItalic')
        },
        'Lato': {
            normal: await fetchAndEmbedFont(doc, 'Lato-Regular'),
            bold: await fetchAndEmbedFont(doc, 'Lato-Bold'),
            italic: await fetchAndEmbedFont(doc, 'Lato-Italic'),
            boldItalic: await fetchAndEmbedFont(doc, 'Lato-BoldItalic')
        },
        'Montserrat': {
            normal: await fetchAndEmbedFont(doc, 'Montserrat-Regular'),
            bold: await fetchAndEmbedFont(doc, 'Montserrat-Bold'),
            italic: await fetchAndEmbedFont(doc, 'Montserrat-Italic'),
            boldItalic: await fetchAndEmbedFont(doc, 'Montserrat-BoldItalic')
        },
        'Roboto': {
            normal: await fetchAndEmbedFont(doc, 'Roboto-Regular'),
            bold: await fetchAndEmbedFont(doc, 'Roboto-Bold'),
            italic: await fetchAndEmbedFont(doc, 'Roboto-Italic'),
            boldItalic: await fetchAndEmbedFont(doc, 'Roboto-BoldItalic')
        },
        'Open Sans': {
            normal: await fetchAndEmbedFont(doc, 'OpenSans-Regular'),
            bold: await fetchAndEmbedFont(doc, 'OpenSans-Bold'),
            italic: await fetchAndEmbedFont(doc, 'OpenSans-Italic'),
            boldItalic: await fetchAndEmbedFont(doc, 'OpenSans-BoldItalic')
        }
    };
    console.log("Fonts loaded:", Object.keys(fonts));
    
    const globalConfig = {
        fontFamily: config.fontFamily || 'Jost',
        fontSize: pxToPt(parseFloat(config.fontSize || 12)),
        lineHeight: parseFloat(config.lineHeight || 1.5),
        textAlign: config.textAlign || 'left',
        format: config.format || 'a5',
        churchLogo: config.churchLogo
    };
    console.log("Global config for PDF generation:", globalConfig);
    
    const pageSizes = {
        'a5': { width: 420, height: 595 },
        'dl': { width: 312, height: 624 }
    };
    
    const { width, height } = pageSizes[format];
    const margin = { top: 30, right: 20, bottom: 20, left: 20 };
    const contentWidth = width - margin.left - margin.right;
    
    let page = doc.addPage([width, height]);
    let y = height - margin.top;
    
    console.log("Page size:", { width, height, contentWidth });
    
    let logoImage = null;
    if (globalConfig.churchLogo) {
        console.log("Fetching church logo from:", globalConfig.churchLogo);
        try {
            const logoUrl = `http://localhost:3000${globalConfig.churchLogo}`;
            console.log("Full logo URL:", logoUrl);
            const logoResponse = await fetch(logoUrl);
            if (!logoResponse.ok) throw new Error(`HTTP error! Status: ${logoResponse.status}`);
            const logoArrayBuffer = await logoResponse.arrayBuffer();
            logoImage = await doc.embedPng(logoArrayBuffer);
            console.log("Church logo embedded successfully");
        } catch (error) {
            console.error("Error embedding church logo:", error);
        }
    } else {
        console.log("No church logo path found in global config");
    }
    
    function addLogoToPage(page) {
        if (logoImage) {
            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();
            const logoHeight = 30;
            const aspectRatio = logoImage.width / logoImage.height;
            const logoWidth = logoHeight * aspectRatio;
            
            page.drawImage(logoImage, {
                x: pageWidth - logoWidth - 20,
                y: pageHeight - logoHeight - 20,
                width: logoWidth,
                height: logoHeight,
                opacity: 0.3
            });
        }
    }
    
    addLogoToPage(page);
    
    function addPage() {
        console.log("Adding new page");
        page = doc.addPage([width, height]);
        addLogoToPage(page);
        y = height - margin.top;
        return { page, y };
    }
    
    async function drawText(text, x, y, fontSize, maxWidth, options = {}) {
        const { bold, italic, underline, alignment, indent } = options;
        let font;
        if (bold && italic) {
            font = fonts[globalConfig.fontFamily].boldItalic;
        } else if (bold) {
            font = fonts[globalConfig.fontFamily].bold;
        } else if (italic) {
            font = fonts[globalConfig.fontFamily].italic;
        } else {
            font = fonts[globalConfig.fontFamily].normal;
        }
        
        console.log("Drawing text:", { text: text.substring(0, 20) + "...", x, y, fontSize, bold, italic, underline, alignment, indent });
        
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
        const font = fonts[globalConfig.fontFamily].normal;
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
            let img = await doc.embedPng(imgArrayBuffer);
            
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
    
    async function drawIcon(iconName, x, y, size) {
        console.log("Drawing icon:", { iconName, x, y, size });
        const iconPaths = {
            'star': 'http://localhost:3000/icons/star.png',
            'cross': 'http://localhost:3000/icons/cross.png',
            'dove': 'http://localhost:3000/icons/dove.png',
            'default': 'http://localhost:3000/icons/default.png'
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
    
    function showProgress(percent) {
        const progressBar = document.getElementById('pdf-progress-bar');
        const progressText = document.getElementById('pdf-progress-text');
        if (progressBar && progressText) {
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${Math.round(percent)}%`;
        }
    }
    
    const liedblattContent = document.getElementById('liedblatt-content');
    const items = liedblattContent.children;
    
    console.log("Processing liedblatt content...");
    showProgress(0);
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log("Processing item:", item.tagName, item.className);
        
        if (item.classList.contains('page-break')) {
            console.log("Page break detected");
            ({ page, y } = addPage());
            continue;
        }
        
        if (item.classList.contains('lied') || item.classList.contains('liturgie')) {
            const title = item.querySelector('h3');
            const notes = item.querySelector('img');
            const strophen = item.querySelectorAll('p');
            
            y -= await drawText(title.textContent, margin.left, y, headingStyles.heading.fontSize, contentWidth, { bold: true, alignment: 'center' });
            
            if (notes) {
                const notesHeight = await drawImage(notes.src, margin.left, y, contentWidth);
                y -= notesHeight;
            }
            
            for (const strophe of strophen) {
                const stropheText = strophe.innerHTML;
                const textHeight = await drawText(stropheText, margin.left, y, globalConfig.fontSize, contentWidth, { alignment: 'center' });
                y -= textHeight;
            }
        } else if (item.querySelector('.fas, .trenner-default-img')) {
            let iconType = 'default';
            const iconElement = item.querySelector('.fas, .trenner-default-img');
            if (iconElement.classList.contains('fa-star')) iconType = 'star';
            if (iconElement.classList.contains('fa-cross')) iconType = 'cross';
            if (iconElement.classList.contains('fa-dove')) iconType = 'dove';
            
            const iconHeight = await drawIcon(iconType, margin.left, y, 24);
            y -= iconHeight + 20
        } else {
            const elements = item.querySelectorAll('h1, h2, h3, p, img');
            for (const element of elements) {
                if (element.tagName === 'IMG') {
                    const imgHeight = await drawImage(element.src, margin.left, y, contentWidth);
                    y -= imgHeight + 20;
                } else {
                    let fontSize = globalConfig.fontSize;
                    let isHeading = false;
                    if (element.tagName === 'H1') { fontSize = headingStyles.title.fontSize; isHeading = true; }
                    if (element.tagName === 'H2') { fontSize = headingStyles.subtitle.fontSize; isHeading = true; }
                    if (element.tagName === 'H3') { fontSize = headingStyles.heading.fontSize; isHeading = true; }
                    
                    const options = {
                        bold: isHeading || window.getComputedStyle(element).fontWeight === 'bold',
                        italic: window.getComputedStyle(element).fontStyle === 'italic',
                        alignment: window.getComputedStyle(element).textAlign || globalConfig.textAlign,
                        indent: parseFloat(window.getComputedStyle(element).paddingLeft) || 0
                    };
                    
                    const textHeight = await drawText(element.innerText, margin.left, y, fontSize, contentWidth, options);
                    y -= textHeight + (isHeading ? fontSize * 0.8 : fontSize * 0.2);
                }
                
                if (y < margin.bottom) {
                    ({ page, y } = addPage());
                }
            }
        }
        
        showProgress((i + 1) / items.length * 100);
    }
    
    console.log("PDF generation complete. Saving...");
    const pdfBytes = await doc.save();
    console.log("PDF saved. Downloading...");
    downloadPDF(pdfBytes, `liedblatt_${format}.pdf`);
    showProgress(100);
    progressContainer.style.display = 'none';
}

async function fetchAndEmbedFont(doc, fontName) {
    console.log("Fetching font:", fontName);
    const url = `http://localhost:3000/ttf/${fontName}.ttf`;
    try {
        const fontBytes = await fetch(url).then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.arrayBuffer();
        });
        const font = await doc.embedFont(fontBytes, { 
            subset: true,
            features: {
                liga: true,
                kern: true
            }
        });
        if (!font || typeof font.widthOfTextAtSize !== 'function') {
            throw new Error('Font not properly embedded');
        }
        console.log("Font embedded successfully:", fontName);
        return font;
    } catch (error) {
        console.error("Error fetching or embedding font:", fontName, error);
        throw error;
    }
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

// Export the generatePDF function
export { generatePDF };