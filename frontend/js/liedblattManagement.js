// liedblattManagement.js
import { saveSessionToLocalStorage } from './sessionManagement.js';
import { globalConfig, getImagePath } from './script.js';
import { authenticatedFetch, customAlert, customConfirm, customPrompt } from './utils.js';

export function getTrennerIconClass(type) {
    switch (type) {
        case 'star':
            return 'fas fa-star';
        case 'cross':
            return 'fas fa-cross';
        case 'dove':
            return 'fas fa-dove';
        case 'herz':
            return 'fas fa-heart';
        default:
            return 'trenner-default-img';
    }
}

export function getDefaultShowTitleValue(typ) {
    return !['Trenner', 'Freitext'].includes(typ);
}

export function addCustomImage() {
    const customImageObject = {
        id: Date.now(),
        typ: 'CustomImage',
        titel: 'Benutzerdefiniertes Bild',
        imagePath: ''
    };
    addToSelected(customImageObject);
}

export function scrollToTitle(objektId, uniqueId) {
    console.log("scrollToTitle called with objektId:", objektId, "uniqueId:", uniqueId);
    const rightPanel = document.querySelector('.right-panel');
    const liedblattContent = document.getElementById('liedblatt-content');
    
    // Find the element with the matching unique ID
    const targetElement = liedblattContent.querySelector(`[data-liedblatt-id="${uniqueId}"]`);
    
    if (targetElement) {
        // Calculate the scroll position with an offset
        const offset = 70; // Adjust this value to increase or decrease the space above the target
        const targetRect = targetElement.getBoundingClientRect();
        const containerRect = rightPanel.getBoundingClientRect();
        let topPos = targetRect.top - containerRect.top + rightPanel.scrollTop - offset;
        
        // Ensure we don't scroll past the top of the content
        topPos = Math.max(0, topPos);
        console.log("Scrolling to position:", topPos);
        rightPanel.scrollTo({
            top: topPos,
            behavior: 'smooth'
        });
    } else {
        console.log("Target element not found in liedblatt content");
    }
}

export function moveItem(item, direction) {
    const parent = document.getElementById('selected-items');
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(item);
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < siblings.length) {
        if (direction === -1) {
            parent.insertBefore(item, siblings[newIndex]);
        } else {
            parent.insertBefore(item, siblings[newIndex].nextSibling);
        }
        updateLiedblatt();
        saveSessionToLocalStorage();
    }
}

export function addFreierText(typ) {
    const freiTextObject = {
        id: Date.now(),
        typ: typ,
        titel: typ,
        inhalt: ''
    };
    addToSelected(freiTextObject);
}

export function addTrenner(type) {
    const trennerObject = {
        id: Date.now(),
        typ: 'Trenner',
        titel: 'Trenner',
        inhalt: type
    };
    addToSelected(trennerObject);
}

export function addPageBreak() {
    const pageBreakObject = {
        id: Date.now(),
        typ: 'Seitenumbruch',
        titel: 'Seitenumbruch',
        inhalt: 'pagebreak'
    };
    addToSelected(pageBreakObject);
}

export function createLiedOptions(lied) {
    const liedOptions = document.createElement('div');
    liedOptions.classList.add('lied-options');
    
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Optionen anzeigen/ausblenden';
    toggleButton.classList.add('toggle-options');
    liedOptions.appendChild(toggleButton);
    
    const optionsContent = document.createElement('div');
    optionsContent.classList.add('options-content');
    optionsContent.style.display = 'none';
    liedOptions.appendChild(optionsContent);
    
    const showNotesDiv = document.createElement('div');
    const showNotesCheckbox = document.createElement('input');
    showNotesCheckbox.type = 'checkbox';
    showNotesCheckbox.id = `showNotes-${lied.id}`;
    const showNotesLabel = document.createElement('label');
    showNotesLabel.htmlFor = showNotesCheckbox.id;
    showNotesLabel.textContent = 'Noten anzeigen';
    showNotesDiv.appendChild(showNotesCheckbox);
    showNotesDiv.appendChild(showNotesLabel);
    optionsContent.appendChild(showNotesDiv);
    
    const noteTypeDiv = document.createElement('div');
    noteTypeDiv.style.display = 'none';
    const noteTypeRadio1 = document.createElement('input');
    noteTypeRadio1.type = 'radio';
    noteTypeRadio1.name = `noteType-${lied.id}`;
    noteTypeRadio1.value = 'without';
    noteTypeRadio1.id = `notesWithoutText-${lied.id}`;
    const noteTypeLabel1 = document.createElement('label');
    noteTypeLabel1.htmlFor = noteTypeRadio1.id;
    noteTypeLabel1.textContent = 'Noten ohne Text';
    noteTypeDiv.appendChild(noteTypeRadio1);
    noteTypeDiv.appendChild(noteTypeLabel1);
    
    const noteTypeRadio2 = document.createElement('input');
    noteTypeRadio2.type = 'radio';
    noteTypeRadio2.name = `noteType-${lied.id}`;
    noteTypeRadio2.value = 'with';
    noteTypeRadio2.id = `notesWithText-${lied.id}`;
    const noteTypeLabel2 = document.createElement('label');
    noteTypeLabel2.htmlFor = noteTypeRadio2.id;
    noteTypeLabel2.textContent = 'Noten mit Text';
    noteTypeDiv.appendChild(noteTypeRadio2);
    noteTypeDiv.appendChild(noteTypeLabel2);
    
    optionsContent.appendChild(noteTypeDiv);
    
    showNotesCheckbox.addEventListener('change', function() {
        noteTypeDiv.style.display = this.checked ? 'block' : 'none';
        if (!this.checked) {
            noteTypeRadio1.checked = false;
            noteTypeRadio2.checked = false;
        }
    });
    
    const strophenContainer = document.createElement('div');
    strophenContainer.classList.add('strophen-container');
    optionsContent.appendChild(strophenContainer);
    
    let strophen = lied.strophen;
    if (typeof strophen === 'string') {
        try {
            strophen = JSON.parse(strophen);
        } catch (e) {
            strophen = strophen.split('\n').filter(s => s.trim() !== '');
        }
    }
    if (!Array.isArray(strophen)) {
        strophen = [strophen];
    }
    
    strophen.forEach((strophe, index) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `strophe-${lied.id}-${index}`;
        checkbox.value = index;
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = `Strophe ${index + 1}`;
        
        strophenContainer.appendChild(checkbox);
        strophenContainer.appendChild(label);
        strophenContainer.appendChild(document.createElement('br'));
    });
    
    [showNotesCheckbox, noteTypeRadio1, noteTypeRadio2, ...strophenContainer.querySelectorAll('input')].forEach(el => {
        el.addEventListener('change', updateLiedblatt);
    });
    
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        optionsContent.style.display = optionsContent.style.display === 'none' ? 'block' : 'none';
    });
    
    return liedOptions;
}

export function updateLiedblatt() {
    const liedblattContent = document.getElementById('liedblatt-content');
    liedblattContent.innerHTML = "";
    const selectedItems = document.querySelectorAll('.selected-item');
    
    selectedItems.forEach((selected, index) => {
        const objekt = JSON.parse(selected.getAttribute('data-object'));
        if (!objekt) return;
        
        const content = document.createElement('div');
        const uniqueId = `liedblatt-item-${index}-${Date.now()}`; 
        content.setAttribute('data-liedblatt-id', uniqueId);
        content.setAttribute('data-original-id', objekt.id);
        selected.setAttribute('data-unique-id', uniqueId);
        
        const showTitleCheckbox = selected.querySelector('input[id^="showTitle"]');
        const showTitle = showTitleCheckbox ? showTitleCheckbox.checked : true;
        
        // Store the unique ID in the selected item for later reference
        
        if (showTitle) {
            const title = document.createElement('h3');
            title.textContent = objekt.alternativePrefix || objekt.titel;
            content.appendChild(title);
        }
        if (objekt.typ === 'Seitenumbruch') {
            const pageBreak = document.createElement('div');
            pageBreak.classList.add('page-break');
            pageBreak.innerHTML = '<hr style="border-top: 2px dashed #888; margin: 20px 0;">';
            liedblattContent.appendChild(pageBreak);
            return; // Fügen Sie nichts weiteres für den Seitenumbruch hinzu
        }
        if (objekt.typ === 'Psalm') {
            //content.style.textAlign = 'left';
        }
        if (objekt.typ === 'CustomImage') {
            const imgSrc = getImagePath(objekt, 'customImage');
            if (imgSrc) {
                const imgElement = document.createElement('img');
                imgElement.src = imgSrc;
                imgElement.alt = "Benutzerdefiniertes Bild";
                imgElement.style.maxWidth = '100%';
                content.appendChild(imgElement);
            }
        }
        if (objekt.typ === 'Trenner') {
            const trennerIcon = document.createElement('i');
            trennerIcon.className = getTrennerIconClass(objekt.inhalt);
            trennerIcon.style.fontSize = '24px';
            trennerIcon.style.color = '#888';
            trennerIcon.style.display = 'block';
            trennerIcon.style.textAlign = 'center';
            trennerIcon.style.margin = '10px 0';
            content.appendChild(trennerIcon);
        } else if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
            const selectedStrophen = Array.from(selected.querySelectorAll('.strophen-container input:checked')).map(cb => parseInt(cb.value));
            const showNotes = selected.querySelector('input[type="checkbox"]').checked;
            const noteType = selected.querySelector('input[name^="noteType"]:checked')?.value;
            if (objekt.copyright || objekt.melodie) {
                const copyrightElement = document.createElement('span');
                
                if (objekt.copyright) {
                    copyrightElement.innerHTML = `© ${objekt.copyright}`;
                }
                
                if (objekt.melodie) {
                    if (objekt.copyright) {
                        copyrightElement.innerHTML += ` | Melodie: ${objekt.melodie}`;
                    } else {
                        copyrightElement.innerHTML = `Melodie: ${objekt.melodie}`;
                    }
                }
                
                copyrightElement.style.fontSize = '8pt';
                copyrightElement.classList.add('copyright-info');
                copyrightElement.style.marginTop = '0';
                content.appendChild(copyrightElement);
            }
            
            if (showNotes && noteType) {
                const imgSrc = noteType === 'with' ? getImagePath(objekt, 'notenbildMitText') : getImagePath(objekt, 'notenbild');
                if (imgSrc) {
                    content.innerHTML += `<img src="${imgSrc}" alt="Noten">`;
                }
            }
            
            let strophen = objekt.strophen;
            if (typeof strophen === 'string') {
                try {
                    strophen = JSON.parse(strophen);
                } catch (e) {
                    strophen = strophen.split('\n').filter(s => s.trim() !== '');
                }
            }
            if (!Array.isArray(strophen)) {
                strophen = [strophen];
            }
            
            if (selectedStrophen.length > 0) {
                selectedStrophen.forEach((index, arrayIndex) => {
                    const stropheDiv = document.createElement('div');
                    stropheDiv.classList.add('strophe');
                    
                    // Ersetze <p> Tags durch <br> Tags und entferne die schließenden </p> Tags
                    let strophenText = strophen[index].replace(/<p>/g, '').replace(/<\/p>/g, '<br>');
                    
                    // Teile den Strophentext an den <br> Tags
                    let strophenTextArray = strophenText.split('<br>');
                    
                    // Erstelle den ersten <p> Tag mit der Nummerierung und dem ersten Teil der Strophe
                    const pElementWithNumber = document.createElement('p');
                    pElementWithNumber.innerHTML = `<span class="strophenum">${index + 1}.</span> ${strophenTextArray[0]}`;
                    stropheDiv.appendChild(pElementWithNumber);
                    
                    // Füge die restlichen Teile des Strophentexts in eigene <p> Tags ein
                    for (let i = 1; i < strophenTextArray.length; i++) {
                        if (strophenTextArray[i].trim() !== '') {
                            const pElement = document.createElement('p');
                            pElement.textContent = strophenTextArray[i];
                            stropheDiv.appendChild(pElement);
                        }
                    }
                    
                    // Füge das stropheDiv zum content hinzu
                    content.appendChild(stropheDiv);
                });
            }
            else {
                content.innerHTML += '';
            }
        } else if (objekt.typ === 'Titel' || objekt.typ === 'Freitext') {
            if (quillInstances[objekt.id]) {
                const editorContent = document.createElement('div');
                let editorHTML = quillInstances[objekt.id].root.innerHTML;
                editorHTML = formatQuillHTML(editorHTML); // Formatierung anwenden
                editorContent.innerHTML = editorHTML;
                content.appendChild(editorContent);
            }
        } else {
            //Layout für Psalm
            let objektContent = objekt.inhalt;
            if (objektContent) {
                if (globalConfig.textAlign === 'center') {
                    objektContent = objektContent.replace(/<p class="ql-indent-1">/g, '<p style="font-weight: bold;">')
                    .replace(/<p class="ql-indent-2">/g, '<p style="padding-left: 4em;">')
                    .replace(/<p class="ql-indent-3">/g, '<p style="padding-left: 6em;">');
                    content.innerHTML += objektContent;
                } else if (globalConfig.textAlign === 'left'){
                    objektContent = objektContent.replace(/<p class="ql-indent-1">/g, '<p style="padding-left: 2em;">')
                    .replace(/<p class="ql-indent-2">/g, '<p style="padding-left: 4em;">')
                    .replace(/<p class="ql-indent-3">/g, '<p style="padding-left: 6em;">');
                    content.innerHTML += objektContent;
                }
            }
        }
        
        liedblattContent.appendChild(content);
    });
    saveSessionToLocalStorage();
}

export function formatQuillHTML(htmlContent) {
    // Ersetze <strong> durch <span style="font-weight: bold;">
    htmlContent = htmlContent.replace(/<strong>/g, '<p style="font-weight: bold;">')
    .replace(/<\/strong>/g, '</p>');
    
    // Ersetze <em> durch <span style="font-style: italic;">
    htmlContent = htmlContent.replace(/<em>/g, '<p style="font-style: italic;">')
    .replace(/<\/em>/g, '</p>');
    
    // Ersetze <u> durch <span style="text-decoration: underline;">
    htmlContent = htmlContent.replace(/<u>/g, '<p style="text-decoration: underline;">')
    .replace(/<\/u>/g, '</p>');
    
    return htmlContent;
}

export function addToSelected(objekt) {
    // Erstellen des Hauptcontainers für das ausgewählte Objekt
    const newItem = document.createElement('div');
    newItem.classList.add('selected-item');
    newItem.setAttribute('data-id', objekt.id);
    // Generiere eine eindeutige ID für dieses Element
    const uniqueId = `selected-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    newItem.setAttribute('data-unique-id', uniqueId);
    
    newItem.draggable = true; // Ermöglicht Drag-and-Drop
    newItem.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', newItem.dataset.id);
        newItem.classList.add('dragging');
    });
    newItem.addEventListener('dragend', () => {
        newItem.classList.remove('dragging');
    });
    // Fügen Sie diese Funktion hinzu, um den draggable-Status zu aktualisieren
    function updateDraggableStatus(e) {
        const isEditableArea = e.target.closest('.ql-editor') || 
        e.target.closest('input') || 
        e.target.closest('textarea') ||
        e.target.closest('.editor-container');
        newItem.draggable = !isEditableArea;
    }
    
    // Ersetzen Sie die bestehenden mousedown und dragstart Event Listener
    newItem.addEventListener('mousedown', updateDraggableStatus);
    newItem.addEventListener('dragstart', (e) => {
        if (!newItem.draggable) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', newItem.dataset.id);
        newItem.classList.add('dragging');
    });
    
    newItem.addEventListener('dragstart', function(e) {
        if (!this.draggable) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', this.dataset.id);
        this.classList.add('dragging');
    });
    
    newItem.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        this.draggable = true;  // Reset draggable state
    });
    
    // Erstellen der Titelzeile
    const titleRow = document.createElement('div');
    titleRow.classList.add('title-row');
    titleRow.style.display = 'flex';
    titleRow.style.justifyContent = 'space-between';
    titleRow.style.alignItems = 'center';
    
    // Erstellen des Titel-Spans
    const titleSpan = document.createElement('span');
    titleSpan.textContent = objekt.titel;
    titleSpan.style.fontWeight = 'bold';
    titleSpan.style.cursor = 'pointer';
    titleSpan.addEventListener('click', () => {
        const uniqueId = newItem.getAttribute('data-unique-id');
        console.log("Title clicked, objekt.id:", objekt.id, "uniqueId:", uniqueId);
        scrollToTitle(objekt.id, uniqueId);
    });
    titleRow.appendChild(titleSpan);
    
    // Erstellen der Buttons für Bewegung und Löschen
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add('buttons');
    
    const altTitleBtn = document.createElement('button');
    altTitleBtn.textContent = 'Titel';
    altTitleBtn.title = 'Alternativer Titel';
    altTitleBtn.className = 'btn-small';
    altTitleBtn.addEventListener('click', () => {
        titleOptions.style.display = titleOptions.style.display === 'none' ? 'block' : 'none';
    });
    
    const upButton = document.createElement('button');
    upButton.textContent = '↑';
    upButton.title = 'Nach oben';
    upButton.className = 'btn-small';
    upButton.addEventListener('click', () => moveItem(newItem, -1));
    
    const downButton = document.createElement('button');
    downButton.textContent = '↓';
    downButton.title = 'Nach unten';
    downButton.className = 'btn-small';
    downButton.addEventListener('click', () => moveItem(newItem, 1));
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '×';
    deleteButton.title = 'Löschen';
    deleteButton.className = 'btn-small delete-strophe';
    deleteButton.addEventListener('click', () => {
        document.getElementById('selected-items').removeChild(newItem);
        updateLiedblatt();
    });
    
    buttonsDiv.appendChild(altTitleBtn);
    buttonsDiv.appendChild(upButton);
    buttonsDiv.appendChild(downButton);
    buttonsDiv.appendChild(deleteButton);
    
    titleRow.appendChild(buttonsDiv);
    newItem.appendChild(titleRow);
    
    // Neue Titeloptionen
    const titleOptions = document.createElement('div');
    titleOptions.classList.add('title-options');
    titleOptions.style.display = 'none'; // Standardmäßig versteckt
    
    // Initialisierung der Titeloptionen
    if (objekt.showTitle === undefined) {
        objekt.showTitle = getDefaultShowTitleValue(objekt.typ);
    }
    objekt.alternativePrefix = objekt.alternativePrefix || '';
    
    // Checkbox für "Titel anzeigen"
    const showTitleOption = document.createElement('div');
    showTitleOption.classList.add('title-option');
    const showTitleCheckbox = document.createElement('input');
    showTitleCheckbox.type = 'checkbox';
    showTitleCheckbox.id = `showTitle-${objekt.id}`;
    showTitleCheckbox.checked = objekt.showTitle;
    
    const showTitleLabel = document.createElement('label');
    showTitleLabel.htmlFor = `showTitle-${objekt.id}`;
    showTitleLabel.textContent = 'Titel anzeigen';
    showTitleOption.appendChild(showTitleCheckbox);
    showTitleOption.appendChild(showTitleLabel);
    
    // Checkbox für "Alternativer Titel"
    const altTitleOption = document.createElement('div');
    altTitleOption.classList.add('title-option');
    const altTitleCheckbox = document.createElement('input');
    altTitleCheckbox.type = 'checkbox';
    altTitleCheckbox.id = `altTitle-${objekt.id}`;
    altTitleCheckbox.checked = !!objekt.alternativePrefix;
    const altTitleLabel = document.createElement('label');
    altTitleLabel.htmlFor = `altTitle-${objekt.id}`;
    altTitleLabel.textContent = 'Alternativer Titel';
    altTitleOption.appendChild(altTitleCheckbox);
    altTitleOption.appendChild(altTitleLabel);
    
    // Input-Feld für alternativen Titel
    const altTitleInput = document.createElement('input');
    altTitleInput.type = 'text';
    altTitleInput.classList.add('alternative-title-input');
    altTitleInput.placeholder = 'Alternativer Titel eingeben';
    altTitleInput.value = objekt.alternativePrefix || '';
    altTitleInput.style.display = altTitleCheckbox.checked ? 'block' : 'none';
    
    // Speichern-Button für Titeländerungen
    const saveTitleBtn = document.createElement('button');
    saveTitleBtn.classList.add('save-title-btn');
    saveTitleBtn.textContent = 'Titel speichern';
    
    titleOptions.appendChild(showTitleOption);
    titleOptions.appendChild(altTitleOption);
    titleOptions.appendChild(altTitleInput);
    titleOptions.appendChild(saveTitleBtn);
    
    // Event Listener für Titeloptionen
    showTitleCheckbox.addEventListener('change', () => {
        objekt.showTitle = showTitleCheckbox.checked;
        updateTitleDisplay();
        updateLiedblatt(); // Aktualisiert das Liedblatt bei Änderungen
        saveSessionToLocalStorage(); // Speichert die Änderung sofort
    });
    
    altTitleCheckbox.addEventListener('change', () => {
        altTitleInput.style.display = altTitleCheckbox.checked ? 'block' : 'none';
        if (!altTitleCheckbox.checked) {
            altTitleInput.value = '';
            objekt.alternativePrefix = '';
        }
        updateTitleDisplay();
        updateLiedblatt(); // Aktualisiert das Liedblatt bei Änderungen
    });
    
    saveTitleBtn.addEventListener('click', () => {
        objekt.showTitle = showTitleCheckbox.checked;
        objekt.alternativePrefix = altTitleCheckbox.checked ? altTitleInput.value : '';
        updateTitleDisplay();
        updateLiedblatt();
        saveSessionToLocalStorage();
    });
    
    // Funktion zum Aktualisieren der Titelanzeige
    function updateTitleDisplay() {
        const displayTitle = objekt.alternativePrefix || objekt.titel;
        if (objekt.showTitle) {
            titleSpan.textContent = displayTitle;
            titleSpan.style.fontStyle = 'normal';
            titleSpan.style.fontWeight = 'bold';
        } else {
            titleSpan.textContent = `${displayTitle} (ausgeblendet)`;
            titleSpan.style.fontStyle = 'italic';
            titleSpan.style.fontWeight = 'normal';
        }
        // Aktualisieren des data-object Attributs
        newItem.setAttribute('data-object', JSON.stringify(objekt));
    }
    
    newItem.appendChild(titleOptions);
    
    // Spezifische Behandlung je nach Objekttyp
    if (objekt.typ === 'Seitenumbruch') {
        newItem.classList.add('seitenumbruch');
        const pageBreakIcon = document.createElement('i');
        pageBreakIcon.className = 'fas fa-file-alt';
        pageBreakIcon.style.fontSize = '24px';
        pageBreakIcon.style.color = '#888';
        newItem.appendChild(pageBreakIcon);
        
        // Entfernen Sie die Standard-Titelzeile und Buttons für Seitenumbrüche
        //titleRow.innerHTML = '<span>Seitenumbruch</span>';
        //buttonsDiv.innerHTML = '';
        buttonsDiv.appendChild(deleteButton);
    } else if (objekt.typ === 'Trenner') {
        // Fügt ein Icon für Trenner hinzu
        const trennerIcon = document.createElement('i');
        trennerIcon.className = getTrennerIconClass(objekt.inhalt);
        trennerIcon.style.fontSize = '24px';
        trennerIcon.style.color = '#888';
        newItem.appendChild(trennerIcon);
    } else if (objekt.typ === 'CustomImage') {
        const imageUploadInput = document.createElement('input');
        imageUploadInput.type = 'file';
        imageUploadInput.accept = 'image/*';
        imageUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('customImage', file);
                
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/upload-custom-image', {
                        method: 'POST',
                        body: formData,
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        objekt.imagePath = result.imagePath;
                        newItem.setAttribute('data-object', JSON.stringify(objekt));
                        updateLiedblatt();
                    } else {
                        console.error('Fehler beim Hochladen des Bildes:', result.message);
                    }
                } catch (error) {
                    console.error('Fehler beim Bildupload:', error);
                }
            }
        });
        
        const uploadButton = document.createElement('button');
        uploadButton.textContent = 'Bild hochladen';
        uploadButton.onclick = () => imageUploadInput.click();
        
        newItem.appendChild(uploadButton);

    } else if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
        // Erstellt und fügt Liedoptionen hinzu
        const liedOptions = createLiedOptions(objekt);
        newItem.appendChild(liedOptions);
        // Stellt den Zustand der Lied-Optionen wieder her, falls vorhanden
        if (objekt.showNotes !== undefined) {
            const showNotesCheckbox = liedOptions.querySelector('input[type="checkbox"]');
            if (showNotesCheckbox) showNotesCheckbox.checked = objekt.showNotes;
        }
        if (objekt.copyright || objekt.melodie) {
            const copyrightDiv = document.createElement('div');
            copyrightDiv.classList.add('copyright-info');
            
            if (objekt.copyright) {
                copyrightDiv.textContent = `© ${objekt.copyright}`;
            }
            
            if (objekt.melodie) {
                if (objekt.copyright) {
                    copyrightDiv.textContent += ` | Melodie: ${objekt.melodie}`;
                } else {
                    copyrightDiv.textContent = `Melodie: ${objekt.melodie}`;
                }
            }
            
            copyrightDiv.style.fontSize = '10px';
            copyrightDiv.style.color = '#666';
            newItem.appendChild(copyrightDiv);
        }
        if (objekt.noteType) {
            const noteTypeRadio = liedOptions.querySelector(`input[name^="noteType"][value="${objekt.noteType}"]`);
            if (noteTypeRadio) noteTypeRadio.checked = true;
        }
        if (objekt.selectedStrophen) {
            const strophenCheckboxes = liedOptions.querySelectorAll('.strophen-container input[type="checkbox"]');
            strophenCheckboxes.forEach((checkbox, index) => {
                checkbox.checked = objekt.selectedStrophen.includes(index);
            });
        }
    } else if (objekt.typ === 'Titel' || objekt.typ === 'Freitext') {
        const optionsContent = document.createElement('div');
        optionsContent.classList.add('options-content');
        optionsContent.style.display = 'none';
        
        const editorContainer = document.createElement('div');
        editorContainer.className = 'editor-container';
        optionsContent.appendChild(editorContainer);
        
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Editor anzeigen/ausblenden';
        toggleButton.classList.add('toggle-options');
        toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            optionsContent.style.display = optionsContent.style.display === 'none' ? 'block' : 'none';
        });
        
        newItem.appendChild(toggleButton);
        newItem.appendChild(optionsContent);
        
        // Initialisiert den Quill-Editor
        quillInstances[objekt.id] = new Quill(editorContainer, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });
        // Fügen Sie diese Zeilen hinzu, um sicherzustellen, dass der Editor verwendbar bleibt
        editorContainer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            newItem.draggable = false;
        });
        
        editorContainer.addEventListener('mouseup', () => {
            setTimeout(() => {
                newItem.draggable = true;
            }, 0);
        });
        
        if (objekt.inhalt) {
            quillInstances[objekt.id].root.innerHTML = objekt.inhalt;
        }
        
        quillInstances[objekt.id].on('text-change', updateLiedblatt);
    }
    
    // Verbesserte Drag-and-Drop-Verhinderung für alle editierbaren Bereiche
    newItem.addEventListener('mousedown', function(e) {
        const isEditableArea = e.target.closest('.ql-editor') || 
        e.target.closest('input') || 
        e.target.closest('textarea') ||
        e.target.closest('.editor-container');
        if (isEditableArea) {
            e.stopPropagation();
            newItem.draggable = false;
        } else {
            newItem.draggable = true;
        }
    });
    
    newItem.addEventListener('mouseup', function() {
        newItem.draggable = true;
    });
    
    newItem.addEventListener('dragstart', function(e) {
        const isEditableArea = e.target.closest('.ql-editor') || 
        e.target.closest('input') || 
        e.target.closest('textarea') ||
        e.target.closest('.editor-container');
        if (isEditableArea) {
            e.preventDefault();
        }
    });
    
    // Speichert das Objekt als JSON-String im data-Attribut
    newItem.setAttribute('data-object', JSON.stringify(objekt));
    document.getElementById('selected-items').appendChild(newItem);
    
    saveSessionToLocalStorage(); // Speichert die Session nach jeder Änderung
    updateTitleDisplay(); // Initialisiert die Titelanzeige
    updateLiedblatt(); // Aktualisiert das Liedblatt nach dem Hinzufügen
}

export let quillInstances = {};

export function resetQuillInstances() {
    for (let key in quillInstances) {
        if (quillInstances.hasOwnProperty(key)) {
            quillInstances[key].setText('');
        }
    }
    quillInstances = {};
}