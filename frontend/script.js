let alleObjekte = [];
let quillInstances = {};
let globalConfig = {
    fontFamily: 'Jost',
    fontSize: 12,
    textAlign: 'left',
    lineHeight: 1.5,
    format: 'a5',
    churchLogo: null // Wird als Base64-String gespeichert
};

function updateGlobalConfig(newConfig) {
    console.log("Updating global config with:", newConfig);
    
    // Aktualisiere globalConfig mit newConfig
    Object.assign(globalConfig, newConfig);
    
    // Finde die Datei im Dateieingabefeld
    const logoFile = document.getElementById('churchLogo').files[0];
    if (logoFile) {
        console.log("Logo file selected:", logoFile.name);
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        // Lade das Bild auf den Server hoch
        fetch('http://localhost:3000/upload-logo', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                globalConfig.churchLogo = data.logoPath;
                console.log("Logo uploaded and path saved:", globalConfig.churchLogo);
                saveConfigToLocalStorage();
                applyConfigChanges();
            } else {
                console.error("Error uploading logo:", data.message);
            }
        })
        .catch(error => {
            console.error("Error uploading logo:", error);
        });
    } else {
        saveConfigToLocalStorage();
        applyConfigChanges();
    }
    
    console.log("Updated global config:", globalConfig);
}


function updateAndSaveConfig(newConfig) {
    console.log("Updating global config with:", newConfig);
    
    // Aktualisiere globalConfig mit newConfig
    Object.assign(globalConfig, newConfig);
    
    // Speichere die aktualisierte Konfiguration
    saveConfigToLocalStorage();
    
    // Wende die Änderungen an
    applyConfigChanges();
    
    console.log("Updated global config:", globalConfig);
}

function applyConfigChanges() {
    updateLiedblattStyle();
    // Schließe das Konfigurationsmodal
    document.getElementById('config-modal').style.display = 'none';
}
function getImagePath(objekt, imageType) {
    const basePath = 'http://localhost:3000/';
    let imagePath;
    
    if (imageType === 'notenbild') {
        imagePath = objekt.notenbild;
    } else if (imageType === 'notenbildMitText') {
        imagePath = objekt.notenbildMitText;
    } else if (imageType === 'logo') {
        imagePath = objekt.churchLogo;
    } else if (imageType === 'customImage') {
        imagePath = objekt.imagePath;
    }
    
    
    if (!imagePath) return null;
    
    // Entfernen Sie führende Schrägstriche
    imagePath = imagePath.replace(/^\/+/, '');
    
    // Wenn der Pfad bereits vollständig ist, geben wir ihn direkt zurück
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Ansonsten fügen wir den Basispfad hinzu
    return basePath + imagePath;
}
function updateLiedblattStyle() {
    const liedblatt = document.getElementById('liedblatt-content');
    liedblatt.style.fontFamily = globalConfig.fontFamily;
    liedblatt.style.fontSize = `${globalConfig.fontSize}px`;
    liedblatt.style.textAlign = globalConfig.textAlign;
    liedblatt.style.lineHeight = globalConfig.lineHeight;
}

function saveConfigToLocalStorage() {
    localStorage.setItem('liedblattConfig', JSON.stringify(globalConfig));
    console.log("Config saved to localStorage:", globalConfig);
}


function loadConfigFromLocalStorage() {
    const savedConfig = localStorage.getItem('liedblattConfig');
    if (savedConfig) {
        try {
            const parsedConfig = JSON.parse(savedConfig);
            globalConfig = { ...globalConfig, ...parsedConfig };
            console.log("Loaded config from localStorage:", globalConfig);
            updateLiedblattStyle();
        } catch (error) {
            console.error("Error parsing saved config:", error);
        }
    } else {
        console.log("No saved config found in localStorage");
    }
}

// Stellen Sie sicher, dass diese Funktion beim Laden der Seite aufgerufen wird
document.addEventListener('DOMContentLoaded', loadConfigFromLocalStorage);

document.addEventListener('DOMContentLoaded', function() {
    const poolSearch = document.getElementById('poolSearch');
    const deleteLogoBtn = document.getElementById('deleteLogo');
    if (deleteLogoBtn) {
        deleteLogoBtn.addEventListener('click', deleteLogo);
    }
    const filterTyp = document.getElementById('filterTyp');
    const generatePdf = document.getElementById('generate-pdf');
    const resetSession = document.getElementById('reset-session');
    const saveSession = document.getElementById('save-session');
    const saveAsTemplate = document.getElementById('save-as-template');
    
    if (poolSearch) poolSearch.addEventListener('input', filterPoolItems);
    if (filterTyp) filterTyp.addEventListener('change', filterPoolItems);
    if (generatePdf) generatePdf.addEventListener('click', generatePDF);
    if (resetSession) resetSession.addEventListener('click', resetSession);
    if (saveSession) saveSession.addEventListener('click', () => saveSession());
    if (saveAsTemplate) saveAsTemplate.addEventListener('click', saveCurrentSessionAsVorlage);
    
    initializeApp();
});

function initializeApp() {
    loadObjekte().then(() => {
        filterPoolItems();
        updateSessionSelect();
        updateVorlageSelect();
        initializeDragAndDrop();
        loadVorlagenList();
        loadLastSession();
    }).catch(error => {
        console.error('Fehler beim Initialisieren der App:', error);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    initializeApp();
});


async function loadObjekte() {
    try {
        const response = await fetch('http://localhost:3000/objekte');
        if (!response.ok) {
            throw new Error('Fehler beim Abrufen der Objekte: ' + response.statusText);
        }
        alleObjekte = await response.json();
        console.log('Geladene Objekte:', alleObjekte); // Debugging
        
        // Wir müssen die Bildpfade hier nicht mehr anpassen, da getImagePath das jetzt übernimmt
        
        filterPoolItems();
    } catch (error) {
        console.error('Fehler beim Laden der Objekte:', error);
        await customAlert('Fehler beim Laden der Objekte: ' + error.message);
    }
}

function filterPoolItems() {
    const searchTerm = document.getElementById('poolSearch').value.toLowerCase();
    const selectedTyp = document.getElementById('filterTyp').value;
    const poolItems = document.getElementById('pool-items');
    poolItems.innerHTML = '';

    const filteredObjekte = alleObjekte.filter(objekt => 
        (selectedTyp === 'all' || objekt.typ === selectedTyp) &&
        objekt.titel.toLowerCase().includes(searchTerm)
    );

    filteredObjekte.forEach(objekt => {
        const div = document.createElement('div');
        div.classList.add('item');
        div.draggable = true;
        div.textContent = `${objekt.typ}: ${objekt.titel}`;
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('click', () => addToSelected(objekt));
        poolItems.appendChild(div);
    });
}

function addCustomImage() {
    const customImageObject = {
        id: Date.now(),
        typ: 'CustomImage',
        titel: 'Benutzerdefiniertes Bild',
        imagePath: ''
    };
    addToSelected(customImageObject);
}

function addFreierText(typ) {
    const freiTextObject = {
        id: Date.now(),
        typ: typ,
        titel: typ,
        inhalt: ''
    };
    addToSelected(freiTextObject);
}

function addTrenner(type) {
    const trennerObject = {
        id: Date.now(),
        typ: 'Trenner',
        titel: 'Trenner',
        inhalt: type
    };
    addToSelected(trennerObject);
}

// Fügen Sie Event-Listener für die Trenner-Optionen hinzu
document.querySelectorAll('.trenner-option').forEach(option => {
    option.addEventListener('click', () => addTrenner(option.dataset.type));
});
function getDefaultShowTitleValue(typ) {
    return !['Trenner', 'Titel', 'Freitext'].includes(typ);
}

function addToSelected(objekt) {
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
//  
//  const altTitleBtn = document.createElement('button');
//  altTitleBtn.textContent = 'alt';
//  altTitleBtn.title = 'Alternativer Titel';
//  altTitleBtn.className = 'small-button'; // Neue Klasse für kleinere Buttons
//  altTitleBtn.addEventListener('click', () => {
//      titleOptions.style.display = titleOptions.style.display === 'none' ? 'block' : 'none';
//  });

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
                    const response = await fetch('http://localhost:3000/upload-custom-image', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        objekt.imagePath = result.imagePath;
                        newItem.setAttribute('data-object', JSON.stringify(objekt));
                        updateLiedblatt();
                    } else {
                        console.error('Fehler beim Hochladen des Bildes');
                    }
                } catch (error) {
                    console.error('Fehler:', error);
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

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function getTrennerIconClass(type) {
    switch (type) {
        case 'star':
            return 'fas fa-star';
        case 'cross':
            return 'fas fa-cross';
        case 'dove':
            return 'fas fa-dove';
        default:
            return 'trenner-default-img';
    }
}

function createLiedOptions(lied) {
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

function scrollToTitle(objektId, uniqueId) {
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
// dragAndDrop.js

function initializeDragAndDrop() {
    const poolItems = document.getElementById('pool-items');
    const selectedItems = document.getElementById('selected-items');
    
    poolItems.addEventListener('dragstart', handleDragStart);
    
    selectedItems.addEventListener('dragover', handleDragOver);
    selectedItems.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    if (e.target.classList.contains('item')) {
        e.dataTransfer.setData('text/plain', e.target.textContent);
        e.dataTransfer.effectAllowed = 'copy';
    } else if (e.target.closest('.selected-item')) {
        const selectedItem = e.target.closest('.selected-item');
        e.dataTransfer.setData('text/plain', selectedItem.dataset.id);
        selectedItem.classList.add('dragging');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (draggable && afterElement) {
        e.currentTarget.insertBefore(draggable, afterElement);
    } else if (draggable) {
        e.currentTarget.appendChild(draggable);
    }
}

function handleDrop(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text');
    const draggedElement = document.querySelector('.dragging');
    const selectedItems = document.getElementById('selected-items');
    const dropPosition = getDragAfterElement(selectedItems, e.clientY);
    
    if (draggedElement) {
        // Element wurde innerhalb der Selected-Items verschoben
        draggedElement.classList.remove('dragging');
        if (dropPosition) {
            selectedItems.insertBefore(draggedElement, dropPosition);
        } else {
            selectedItems.appendChild(draggedElement);
        }
    } else {
        // Neues Element aus dem Pool
        const [typ, titel] = data.split(': ');
        const objekt = alleObjekte.find(obj => obj.typ === typ && obj.titel === titel);
        if (objekt) {
            addToSelected(objekt);
            // Das neue Element wird am Ende hinzugefügt, also holen wir es uns
            const newItem = selectedItems.lastElementChild;
            if (dropPosition) {
                selectedItems.insertBefore(newItem, dropPosition);
            }
            // Wenn dropPosition null ist, bleibt das Element am Ende, wo es bereits ist
        }
    }
    
    updateLiedblatt();
    saveSessionToLocalStorage();
}

function handleMouseDown(e) {
    const item = e.target.closest('.selected-item');
    if (!item) return;
    
    const isEditableArea = e.target.closest('.ql-editor') || 
    e.target.closest('input') || 
    e.target.closest('textarea') ||
    e.target.closest('.editor-container');
    
    if (isEditableArea) {
        item.draggable = false;
    } else {
        item.draggable = true;
    }
}

function handleDragEnd(e) {
    const item = e.target.closest('.selected-item');
    if (item) {
        item.classList.remove('dragging');
        item.draggable = true;  // Reset draggable state
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.selected-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function moveItem(item, direction) {
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

function updateLiedblatt() {
    const liedblattContent = document.getElementById('liedblatt-content');
    liedblattContent.innerHTML = "";
    const selectedItems = document.querySelectorAll('.selected-item');
    
    selectedItems.forEach((selected, index) => {  // Fügen Sie 'index' als Parameter hinzu
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
            content.style.textAlign = 'left';
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
                    
                    // Entferne alle <p> Tags aus dem Strophentext und füge die Nummer am Anfang hinzu
                    const strophenText = strophen[index].replace(/<\/?p>/g, '').trim();
                    
                    // Füge einen Zeilenumbruch nach jeder Strophe hinzu, außer nach der letzten
                    const lineBreak = arrayIndex < selectedStrophen.length - 1 ? '<p><br></p>' : '';
                    
                    stropheDiv.innerHTML = `<p><strong>${index + 1}.</strong> ${strophenText}${lineBreak}</p>`;
                    content.appendChild(stropheDiv);
                });
            }
            else {
                content.innerHTML += '';
            }
        } else if (objekt.typ === 'Titel' || objekt.typ === 'Freitext') {
            if (quillInstances[objekt.id]) {
                const editorContent = document.createElement('div');
                editorContent.innerHTML = quillInstances[objekt.id].root.innerHTML;
                content.appendChild(editorContent);
            }
        } else {
            let objektContent = objekt.inhalt;
            if (objektContent) {
                objektContent = objektContent.replace(/<p class="ql-indent-1">/g, '<p style="padding-left: 2em;">')
                .replace(/<p class="ql-indent-2">/g, '<p style="padding-left: 4em;">')
                .replace(/<p class="ql-indent-3">/g, '<p style="padding-left: 6em;">');
                content.innerHTML += objektContent;
            }
        }
        
        liedblattContent.appendChild(content);
    });
    saveSessionToLocalStorage();
}
async function saveSession(name) {
    if (!name) {
        name = await customPrompt('Geben Sie einen Namen für die Session ein:');
        if (!name) return;
    }
    const selectedItems = document.querySelectorAll('.selected-item');
    const sessionData = Array.from(selectedItems).map(item => {
        const objekt = JSON.parse(item.getAttribute('data-object'));
        const uniqueId = item.getAttribute('data-unique-id');
        
        if (objekt.typ === 'Titel' || objekt.typ === 'Freitext') {
            objekt.inhalt = quillInstances[objekt.id].root.innerHTML;
        } else if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
            const liedOptions = item.querySelector('.lied-options');
            if (liedOptions) {
                const showNotesCheckbox = liedOptions.querySelector('input[type="checkbox"]');
                objekt.showNotes = showNotesCheckbox ? showNotesCheckbox.checked : false;
                const noteTypeRadio = liedOptions.querySelector('input[name^="noteType"]:checked');
                objekt.noteType = noteTypeRadio ? noteTypeRadio.value : null;
                objekt.selectedStrophen = Array.from(liedOptions.querySelectorAll('.strophen-container input:checked'))
                .map(cb => parseInt(cb.value));
            }
        }
        
        const showTitleCheckbox = item.querySelector('input[id^="showTitle"]');
        objekt.showTitle = showTitleCheckbox ? showTitleCheckbox.checked : true;
        
        const altTitleInput = item.querySelector('.alternative-title-input');
        objekt.alternativePrefix = altTitleInput ? altTitleInput.value : '';
        
        return { uniqueId, objekt };
    });
    
    try {
        const response = await fetch('http://localhost:3000/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, data: sessionData }),
        });
        if (!response.ok) throw new Error('Fehler beim Speichern der Session');
        const result = await response.json();
        await customAlert('Session erfolgreich gespeichert mit ID: ' + result.id);
        updateSessionSelect();
        updateSessionsList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Speichern der Session: ' + error.message);
    }
}

async function loadSession(id) {
    try {
        const response = await fetch(`http://localhost:3000/sessions/${id}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Session');
        const session = await response.json();
        if (typeof session.data === 'string') {
            applySessionData(JSON.parse(session.data));
        } else if (Array.isArray(session.data)) {
            applySessionData(session.data);
        } else {
            throw new Error('Unerwartetes Datenformat in der Session');
        }
        await customAlert('Session erfolgreich geladen');
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Session: ' + error.message);
    }
}


async function deleteSession(id) {
    const confirmed = await customConfirm('Sind Sie sicher, dass Sie diese Session löschen möchten?');
    if (!confirmed) return;
    
    try {
        const response = await fetch(`http://localhost:3000/sessions/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Fehler beim Löschen der Session');
        await customAlert('Session erfolgreich gelöscht');
        updateSessionSelect();
        updateSessionsList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Löschen der Session: ' + error.message);
    }
}

async function loadSessionList() {
    console.log("loadSessionList aufgerufen");
    const sessionList = document.getElementById('session-list');
    if (!sessionList) {
        console.warn("Element 'session-list' nicht gefunden. Versuche erneut in 100ms.");
        setTimeout(loadSessionList, 100);
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/sessions');
        if (!response.ok) throw new Error('Fehler beim Laden der Sessions');
        const sessions = await response.json();
        sessionList.innerHTML = '';
        sessions.forEach(session => {
            
            const li = document.createElement('li');
            li.textContent = `${session.name} (${new Date(session.created_at).toLocaleString()})`;
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Laden';
            loadBtn.onclick = () => loadSession(session.id);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Löschen';
            deleteBtn.onclick = () => deleteSession(session.id);
            li.appendChild(loadBtn);
            li.appendChild(deleteBtn);
            sessionList.appendChild(li);
        });
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Sessions: ' + error.message);
    }
}

// Funktionen für Zwischenspeichern und Zurücksetzen
function saveSessionToLocalStorage() {
    const selectedItems = document.querySelectorAll('.selected-item');
    const sessionData = Array.from(selectedItems).map(item => {
        const objekt = JSON.parse(item.getAttribute('data-object'));
        const uniqueId = item.getAttribute('data-unique-id');
        
        // Speichern des Ausblendstatus für alle Objekttypen
        const showTitleCheckbox = item.querySelector('input[id^="showTitle"]');
        objekt.showTitle = showTitleCheckbox ? showTitleCheckbox.checked : true;
        
        if (objekt.typ === 'Titel' || objekt.typ === 'Freitext') {
            const quillInstance = quillInstances[objekt.id];
            if (quillInstance) {
                objekt.inhalt = quillInstance.root.innerHTML;
            }
        } else if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
            const liedOptions = item.querySelector('.lied-options');
            if (liedOptions) {
                const showNotesCheckbox = liedOptions.querySelector('input[type="checkbox"]');
                objekt.showNotes = showNotesCheckbox ? showNotesCheckbox.checked : false;
                const noteTypeRadio = liedOptions.querySelector('input[name^="noteType"]:checked');
                objekt.noteType = noteTypeRadio ? noteTypeRadio.value : null;
                objekt.selectedStrophen = Array.from(liedOptions.querySelectorAll('.strophen-container input:checked'))
                .map(cb => parseInt(cb.value));
            }
        }
        
        const altTitleInput = item.querySelector('.alternative-title-input');
        objekt.alternativePrefix = altTitleInput ? altTitleInput.value : '';
        
        return { uniqueId, objekt };
    });
    localStorage.setItem('lastSession', JSON.stringify(sessionData));
    console.log('Session saved:', sessionData);
}

function loadLastSession() {
    const lastSession = localStorage.getItem('lastSession');
    if (lastSession) {
        try {
            const sessionData = JSON.parse(lastSession);
            applySessionData(sessionData);
        } catch (error) {
            console.error('Fehler beim Laden der letzten Session:', error);
        }
    }
}

function applySessionData(sessionData) {
    document.getElementById('selected-items').innerHTML = '';
    sessionData.forEach(({ uniqueId, objekt }) => {
        addToSelected(objekt);
        const itemElement = document.querySelector(`.selected-item[data-unique-id="${uniqueId}"]`);
        if (itemElement) {
            const showTitleCheckbox = itemElement.querySelector('input[id^="showTitle"]');
            if (showTitleCheckbox) {
                showTitleCheckbox.checked = objekt.showTitle !== false;
            }
            
            if (objekt.typ === 'Titel' || objekt.typ === 'Freitext') {
                const quillInstance = quillInstances[objekt.id];
                if (quillInstance) {
                    quillInstance.root.innerHTML = objekt.inhalt || '';
                }
            } else if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
                const liedOptions = itemElement.querySelector('.lied-options');
                if (liedOptions) {
                    const showNotesCheckbox = liedOptions.querySelector('input[type="checkbox"]');
                    if (showNotesCheckbox) showNotesCheckbox.checked = objekt.showNotes;
                    const noteTypeRadios = liedOptions.querySelectorAll('input[name^="noteType"]');
                    noteTypeRadios.forEach(radio => {
                        if (radio.value === objekt.noteType) radio.checked = true;
                    });
                    const strophenCheckboxes = liedOptions.querySelectorAll('.strophen-container input[type="checkbox"]');
                    strophenCheckboxes.forEach((checkbox, index) => {
                        checkbox.checked = objekt.selectedStrophen && objekt.selectedStrophen.includes(index);
                    });
                }
            }
            
            const alternativePrefixInput = itemElement.querySelector('.alternative-title-input');
            if (alternativePrefixInput) {
                alternativePrefixInput.value = objekt.alternativePrefix || '';
            }
        }
    });
    updateLiedblatt();
}

function customAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-ok').textContent = 'OK';
        document.getElementById('modal-cancel').style.display = 'none';
        modal.style.display = 'block';
        
        document.getElementById('modal-ok').onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
}
function customPrompt(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-message').textContent = message;
        const input = document.createElement('input');
        input.type = 'text';
        document.getElementById('modal-message').appendChild(input);
        document.getElementById('modal-ok').textContent = 'OK';
        document.getElementById('modal-cancel').style.display = 'inline-block';
        document.getElementById('modal-cancel').textContent = 'Abbrechen';
        modal.style.display = 'block';
        
        document.getElementById('modal-ok').onclick = () => {
            modal.style.display = 'none';
            resolve(input.value);
        };
        document.getElementById('modal-cancel').onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };
    });
}

function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-ok').textContent = 'Ja';
        document.getElementById('modal-cancel').style.display = 'inline-block';
        document.getElementById('modal-cancel').textContent = 'Nein';
        modal.style.display = 'block';
        
        document.getElementById('modal-ok').onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
        document.getElementById('modal-cancel').onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}

//// Verwenden Sie diese Funktion anstelle von confirm()
//function resetSession() {
//  console.log("resetSession aufgerufen");
//  if (confirm('Sind Sie sicher, dass Sie die aktuelle Session zurücksetzen möchten?')) {
//      console.log("Bestätigung erhalten, setze Session zurück");
//      localStorage.removeItem('lastSession');
//      document.getElementById('selected-items').innerHTML = '';
//      quillInstances = {}; // Zurücksetzen der Quill-Instanzen
//      updateLiedblatt();
//      document.getElementById('session-select').value = ''; // Zurücksetzen der Dropdown-Auswahl
//      document.getElementById('vorlage-select').value = '';
//      console.log("Session zurückgesetzt");
//  } else {
//      console.log("Zurücksetzen abgebrochen");
//  }
//}

async function resetSession() {
    if (await customConfirm('Sind Sie sicher, dass Sie die aktuelle Session zurücksetzen möchten?')) {
        localStorage.removeItem('lastSession');
        document.getElementById('selected-items').innerHTML = '';
        quillInstances = {}; // Zurücksetzen der Quill-Instanzen
        updateLiedblatt();
        document.getElementById('session-select').value = ''; // Zurücksetzen der Dropdown-Auswahl
        document.getElementById('vorlage-select').value = '';
        await customAlert('Session wurde zurückgesetzt');
    }
}

// Funktionen für Vorlagen
async function saveVorlage(name) {
    const selectedItems = document.querySelectorAll('.selected-item');
    const vorlageData = Array.from(selectedItems).map(item => {
        const objekt = JSON.parse(item.getAttribute('data-object'));
        const uniqueId = item.getAttribute('data-unique-id');
        
        if (objekt.typ === 'Titel' || objekt.typ === 'Freitext') {
            objekt.inhalt = quillInstances[objekt.id].root.innerHTML;
        } else if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
            const liedOptions = item.querySelector('.lied-options');
            if (liedOptions) {
                const showNotesCheckbox = liedOptions.querySelector('input[type="checkbox"]');
                objekt.showNotes = showNotesCheckbox ? showNotesCheckbox.checked : false;
                const noteTypeRadio = liedOptions.querySelector('input[name^="noteType"]:checked');
                objekt.noteType = noteTypeRadio ? noteTypeRadio.value : null;
                objekt.selectedStrophen = Array.from(liedOptions.querySelectorAll('.strophen-container input:checked'))
                .map(cb => parseInt(cb.value));
            }
        }
        
        const showTitleCheckbox = item.querySelector('input[id^="showTitle"]');
        objekt.showTitle = showTitleCheckbox ? showTitleCheckbox.checked : true;
        
        const altTitleInput = item.querySelector('.alternative-title-input');
        objekt.alternativePrefix = altTitleInput ? altTitleInput.value : '';
        
        return { uniqueId, objekt };
    });
    
    try {
        const response = await fetch('http://localhost:3000/vorlagen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, data: vorlageData }),
        });
        if (!response.ok) throw new Error('Fehler beim Speichern der Vorlage');
        const result = await response.json();
        await customAlert('Vorlage erfolgreich gespeichert mit ID: ' + result.id);
        updateVorlageSelect();
        updateVorlagenList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Speichern der Vorlage: ' + error.message);
    }
}
async function loadVorlage(id) {
    console.log("loadVorlage aufgerufen mit ID:", id);
    try {
        const response = await fetch(`http://localhost:3000/vorlagen/${id}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Vorlage');
        const vorlage = await response.json();
        console.log("Geladene Vorlage:", vorlage);
        if (Array.isArray(vorlage.data)) {
            applySessionData(vorlage.data);
        } else {
            throw new Error('Unerwartetes Datenformat in der Vorlage');
        }
        await customAlert('Vorlage erfolgreich geladen');
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Vorlage: ' + error.message);
    }
}

async function deleteVorlage(id) {
    const confirmed = await customConfirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?');
    if (!confirmed) return;
    
    try {
        const response = await fetch(`http://localhost:3000/vorlagen/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Fehler beim Löschen der Vorlage');
        await customAlert('Vorlage erfolgreich gelöscht');
        updateVorlageSelect();
        updateVorlagenList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Löschen der Vorlage: ' + error.message);
    }
}

async function loadVorlagenList() {
    try {
        const response = await fetch('http://localhost:3000/vorlagen');
        if (!response.ok) throw new Error('Fehler beim Laden der Vorlagen');
        const vorlagen = await response.json();
        const vorlagenList = document.getElementById('vorlagen-list');
        if (!vorlagenList) {
            throw new Error("Element 'vorlagen-list' nicht gefunden");
        }
        vorlagenList.innerHTML = '';
        vorlagen.forEach(vorlage => {
            const li = document.createElement('li');
            li.textContent = vorlage.name;
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Laden';
            loadBtn.onclick = () => loadVorlage(vorlage.id);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Löschen';
            deleteBtn.onclick = () => deleteVorlage(vorlage.id);
            li.appendChild(loadBtn);
            li.appendChild(deleteBtn);
            vorlagenList.appendChild(li);
        });
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Vorlagen: ' + error.message);
    }
}

function updateSessionSelect() {
    const select = document.getElementById('session-select');
    select.innerHTML = '<option value="">Gespeicherte Sitzung laden...</option>';
    fetch('http://localhost:3000/sessions')
    .then(response => response.json())
    .then(sessions => {
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `${session.name} (${new Date(session.created_at).toLocaleString()})`;
            select.appendChild(option);
        });
    });
}

function updateVorlageSelect() {
    const select = document.getElementById('vorlage-select');
    select.innerHTML = '<option value="">Vorlage laden...</option>';
    fetch('http://localhost:3000/vorlagen')
    .then(response => response.json())
    .then(vorlagen => {
        vorlagen.forEach(vorlage => {
            const option = document.createElement('option');
            option.value = vorlage.id;
            option.textContent = vorlage.name;
            select.appendChild(option);
        });
    });
}

document.getElementById('session-select').addEventListener('change', async function() {
    if (this.value) {
        if (await customConfirm('Möchten Sie diese Session laden?')) {
            await loadSession(this.value);
            this.value = '';
        } else {
            this.value = '';
        }
    }
});

document.getElementById('vorlage-select').addEventListener('change', async function() {
    if (this.value) {
        if (await customConfirm('Möchten Sie diese Vorlage laden?')) {
            await loadVorlage(this.value);
            this.value = '';
        } else {
            this.value = '';
        }
    }
});

async function saveCurrentSessionAsVorlage() {
    const name = await customPrompt('Geben Sie einen Namen für die Vorlage ein:');
    if (name) {
        await saveVorlage(name);
    }
}

window.addEventListener('beforeunload', saveSessionToLocalStorage);

function showSessionsAndVorlagen() {
    const modal = document.getElementById('manage-modal');
    modal.style.display = 'block';
    updateSessionsList();
    updateVorlagenList();
}

function updateSessionsList() {
    const sessionsList = document.getElementById('sessions-list');
    sessionsList.innerHTML = '<h3>Gespeicherte Sessions</h3>';
    fetch('http://localhost:3000/sessions')
    .then(response => response.json())
    .then(sessions => {
        sessions.forEach(session => {
            const sessionItem = document.createElement('div');
            sessionItem.innerHTML = `
                    ${session.name} (${new Date(session.created_at).toLocaleString()})
                    <button onclick="loadSession('${session.id}')">Laden</button>
                    <button onclick="deleteSession('${session.id}')">Löschen</button>
                `;
            sessionsList.appendChild(sessionItem);
        });
    });
}

function updateVorlagenList() {
    const vorlagenList = document.getElementById('vorlagen-list');
    vorlagenList.innerHTML = '<h3>Gespeicherte Vorlagen</h3>';
    fetch('http://localhost:3000/vorlagen')
    .then(response => response.json())
    .then(vorlagen => {
        vorlagen.forEach(vorlage => {
            const vorlageItem = document.createElement('div');
            vorlageItem.innerHTML = `
                    ${vorlage.name}
                    <button onclick="loadVorlage('${vorlage.id}')">Laden</button>
                    <button onclick="deleteVorlage('${vorlage.id}')">Löschen</button>
                `;
            vorlagenList.appendChild(vorlageItem);
        });
    });
}

// Aktualisieren Sie die deleteSession und deleteVorlage Funktionen
async function deleteSession(id) {
    const confirmed = await customConfirm('Sind Sie sicher, dass Sie diese Session löschen möchten?');
    if (confirmed) {
        try {
            const response = await fetch(`http://localhost:3000/sessions/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Fehler beim Löschen der Session');
            await customAlert('Session erfolgreich gelöscht');
            updateSessionsList();
            updateSessionSelect();
        } catch (error) {
            console.error('Fehler:', error);
            await customAlert('Fehler beim Löschen der Session: ' + error.message);
        }
    }
}

async function deleteVorlage(id) {
    const confirmed = await customConfirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?');
    if (confirmed) {
        try {
            const response = await fetch(`http://localhost:3000/vorlagen/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Fehler beim Löschen der Vorlage');
            await customAlert('Vorlage erfolgreich gelöscht');
            updateVorlagenList();
            updateVorlageSelect();
        } catch (error) {
            console.error('Fehler:', error);
            await customAlert('Fehler beim Löschen der Vorlage: ' + error.message);
        }
    }
}

// Fügen Sie einen Event-Listener hinzu, um das Modal zu schließen
document.querySelector('.close').addEventListener('click', function() {
    const closeButton = document.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            const modal = document.getElementById('manage-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
});

document.getElementById('config-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const newConfig = {
        fontFamily: document.getElementById('fontFamily').value,
        fontSize: parseInt(document.getElementById('fontSize').value),
        textAlign: document.getElementById('textAlign').value,
        lineHeight: parseFloat(document.getElementById('lineHeight').value)
    };
    
    const logoFile = document.getElementById('churchLogo').files[0];
    if (logoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            newConfig.churchLogo = e.target.result;
            updateGlobalConfig(newConfig);
        };
        reader.readAsDataURL(logoFile);
    } else {
        updateGlobalConfig(newConfig);
    }
});

function printLiedblattContent() {
    const liedblattContent = document.getElementById('liedblatt-content');
    console.log("Liedblatt-Inhalt:", liedblattContent.innerHTML);
}


function deleteLogo() {
    globalConfig.churchLogo = null;
    document.getElementById('currentLogo').innerHTML = 'Kein Logo ausgewählt';
    document.getElementById('deleteLogo').style.display = 'none';
    document.getElementById('churchLogo').value = ''; // Reset file input
    saveConfigToLocalStorage();
    updateLiedblattStyle();
}

function addPageBreak() {
    const pageBreakObject = {
        id: Date.now(),
        typ: 'Seitenumbruch',
        titel: 'Seitenumbruch',
        inhalt: 'pagebreak'
    };
    addToSelected(pageBreakObject);
}

function showConfigModal() {
    const modal = document.getElementById('config-modal');
    modal.style.display = 'block';
    
    // Aktuelle Konfiguration in die Formularfelder eintragen
    document.getElementById('fontFamily').value = globalConfig.fontFamily;
    document.getElementById('fontSize').value = globalConfig.fontSize;
    document.getElementById('textAlign').value = globalConfig.textAlign;
    document.getElementById('lineHeight').value = globalConfig.lineHeight;
    
    // Aktuelles Logo anzeigen
    const currentLogoDiv = document.getElementById('currentLogo');
    if (globalConfig.churchLogo) {
        currentLogoDiv.innerHTML = `<img src="http://localhost:3000${globalConfig.churchLogo}" alt="Aktuelles Logo" style="max-width: 100px; max-height: 100px;">`;
    } else {
        currentLogoDiv.innerHTML = 'Kein Logo ausgewählt';
    }
}

const mmToPt = (mm) => mm * 2.83465;

const pageSizes = {
    'a5': { width: mmToPt(148), height: mmToPt(210) },
    'dl': { width: mmToPt(99), height: mmToPt(210) },
    'a4-schmal': { width: mmToPt(105), height: mmToPt(297) }
};

const PX_TO_PT_RATIO = 0.75;
const pxToPt = (px) => px * PX_TO_PT_RATIO;

const headingStyles = {
    title: { fontSize: pxToPt(22), bold: true, lineHeight: 1.1, spacingBefore: pxToPt(10), spacingAfter: pxToPt(3) },
    subtitle: { fontSize: pxToPt(16), lineHeight: 1.1, spacingBefore: pxToPt(10), spacingAfter: pxToPt(10)},
    heading: { fontSize: pxToPt(14), bold: true, lineHeight: 1.1, spacingBefore: pxToPt(10), spacingAfter: pxToPt(10) },
    bodyText: { fontSize: pxToPt(12), lineHeight: 1.2, spacingBefore: pxToPt(10), spacingAfter: pxToPt(10) }
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
            lineHeight: 1.5,
            textAlign: 'left',
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
    
    const pageSizes = {
        'a5': { width: mmToPt(148), height: mmToPt(210) },
        'dl': { width: mmToPt(99), height: mmToPt(210) },
        'a4-schmal': { width: mmToPt(105), height: mmToPt(297) }
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
    async function drawStrophe(stropheNum, stropheText, x, y, maxWidth, fontSize, options) {
        const font = fonts[globalConfig.fontFamily].normal;
        const stropheNumWidth = await font.widthOfTextAtSize(stropheNum + ' ', fontSize);
        
        // Zeichnen Sie die Strophennummer
        page.drawText(stropheNum + ' ', {
            x,
            y,
            size: fontSize,
            font: font
        });
        
        // Zeichnen Sie den Strophentext
        const textHeight = await drawText(stropheText, x + stropheNumWidth, y, fontSize, maxWidth - stropheNumWidth, options);
        
        return textHeight;
    }
    function showProgress(percent) {
        const progressBar = document.getElementById('pdf-progress-bar');
        const progressText = document.getElementById('pdf-progress-text');
        if (progressBar && progressText) {
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${Math.round(percent)}%`;
        }
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
    showProgress(0);
    
    let lastItemType = null;
    
    async function ensureSpace(requiredHeight) {
        if (y - requiredHeight < margin.bottom) {
            ({ page, y } = addPage());
            return true;
        }
        return false;
    }
    
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
            const strophen = Array.from(item.children).filter(child => child.tagName === 'P');
            
            // Zeichne den Titel
            y -= await drawText(title.textContent, margin.left, y, headingStyles.heading.fontSize, contentWidth, { bold: true, alignment: 'center' });
            
            // Zeichne die Noten, falls vorhanden
            if (notes) {
                const notesHeight = await drawImage(notes.src, margin.left, y, contentWidth);
                y -= notesHeight;
            }
            
            // Zeichne die Strophen
            for (let j = 0; j < strophen.length; j++) {
                const strophe = strophen[j];
                const stropheText = strophe.textContent;
                
                if (stropheText.trim() !== '' && !stropheText.includes('Strophe NaN: undefined')) {
                    const textHeight = await drawText(stropheText, margin.left, y, globalConfig.fontSize, contentWidth, { alignment: 'center' });
                    y -= textHeight;
                }
                
                const nextElement = strophe.nextElementSibling;
                if (nextElement && nextElement.classList.contains('page-break')) {
                    // Zeichne eine gestrichelte Linie für den Seitenumbruch
                    page.drawLine({
                        start: { x: margin.left, y: y - 10 },
                        end: { x: width - margin.right, y: y - 10 },
                        thickness: 1,
                        color: rgb(0, 0, 0),
                        dashArray: [5, 5],
                    });
                    
                    ({ page, y } = addPage());
                }
            }
            
        //    y -= globalConfig.fontSize; // Zusätzlicher Abstand nach dem Lied/der Liturgie
        } else if (item.querySelector('.fas, .trenner-default-img')) {
            // Icon-Logik (bleibt unverändert)
            let iconType = 'default';
            const iconElement = item.querySelector('.fas, .trenner-default-img');
            if (iconElement.classList.contains('fa-star')) iconType = 'star';
            if (iconElement.classList.contains('fa-cross')) iconType = 'cross';
            if (iconElement.classList.contains('fa-dove')) iconType = 'dove';
            
            const iconHeight = await drawIcon(iconType, margin.left, y, 24);
            y -= iconHeight + 20; // Abstand nach Icons
        } else {
            // Andere Elemente (Text, Überschriften, etc.)
            const elements = item.querySelectorAll('h1, h2, h3, p, img');
            for (const element of elements) {
                if (element.tagName === 'IMG' && element.alt === 'Benutzerdefiniertes Bild') {
                    const imgHeight = await drawImage(element.src, margin.left, y, contentWidth);
                    y -= imgHeight + 10; // Zusätzlicher Abstand nach Bildern
                } else {
                    let fontSize = globalConfig.fontSize;
                    let isHeading = false;
                    if (element.tagName === 'H1') { fontSize = headingStyles.title.fontSize; isHeading = true; headingSpacing = 10; } // Abstand bei Überschriften
                    if (element.tagName === 'H2') { fontSize = headingStyles.subtitle.fontSize; isHeading = true; headingSpacing = 10; }
                    if (element.tagName === 'H3') { fontSize = headingStyles.heading.fontSize; isHeading = true; headingSpacing = 10; }
                    const options = {
                        bold: isHeading || window.getComputedStyle(element).fontWeight === 'bold',
                        italic: window.getComputedStyle(element).fontStyle === 'italic',
                        alignment: window.getComputedStyle(element).textAlign || globalConfig.textAlign,
                        indent: parseFloat(window.getComputedStyle(element).paddingLeft) || 0
                    };
                    if (isHeading) {
                        y -= headingSpacing; // Abstand vor Überschriften hinzufügen
                    }
                    const textHeight = await drawText(element.innerText, margin.left, y, fontSize, contentWidth, options);
                    y -= textHeight + (isHeading ? fontSize * 0.8 : fontSize * 0.2);
                }
                
                // Überprüfe, ob genug Platz für das nächste Element vorhanden ist
                if (y < margin.bottom) {
                    ({ page, y } = addPage());
                }
            }
        }
        
        showProgress((i + 1) / items.length * 100);
    }
    
    console.log("PDF generation complete. Saving...");
    const pdfBytes = await doc.save();
    console.log("PDF saved. Checking if brochure is needed...");
    
    try {
        console.log("PDF generation complete. Saving...");
        let pdfBytes = await doc.save();
        console.log(`Generated PDF size: ${pdfBytes.length} bytes`);
        
        const createBrochureChecked = document.getElementById('createBrochure').checked;
        if (createBrochureChecked) {
            console.log("Creating brochure...");
            showProgress(75);
            
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
        
        showProgress(100);
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
        throw error; // Re-throw the error instead of returning null
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
    
    if (format === 'a5' || format === 'a4-schmal') {
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
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 1, 0, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 0, 1, targetWidth, targetHeight);
        } else if (pageCount === 3) {
            const newPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 1, 0, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 2, 1, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, newPage, 0, 2, targetWidth, targetHeight);
        } else if (pageCount >= 4) {
            const firstPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, firstPage, 1, 0, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, firstPage, 2, 1, targetWidth, targetHeight);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, firstPage, 3, 2, targetWidth, targetHeight);
            
            const secondPage = outputPdf.addPage(outputPageSize);
            await drawPageOnSheetForDinLang(inputPdf, outputPdf, secondPage, 0, 0, targetWidth, targetHeight);
            if (pageCount >= 5) {
                await drawPageOnSheetForDinLang(inputPdf, outputPdf, secondPage, 4, 1, targetWidth, targetHeight);
            }
            if (pageCount === 6) {
                await drawPageOnSheetForDinLang(inputPdf, outputPdf, secondPage, 5, 2, targetWidth, targetHeight);
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
        'a4-schmal': { width: 297, height: 842 }
    }[format];
    
    if (!dimensions) {
        throw new Error(`Unbekanntes Format: ${format}`);
    }
    
    return dimensions;
}

function getOutputPageSize(format) {
    switch (format) {
        case 'a5':
        case 'dl':
            return [841.89, 595.28];  // A4 Querformat
        case 'a4-schmal':
            return [595.28, 841.89];  // A4 Hochformat
        default:
            throw new Error('Unbekanntes Format');
    }
}

function getPagesPerSheet(format) {
    return {
        'a5': 2,
        'dl': 3,
        'a4-schmal': 2
    }[format] || 2;
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}