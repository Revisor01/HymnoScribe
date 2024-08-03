import {
    checkAuthToken,
    //logout,
    translateRole,
    authenticatedFetch,
    customAlert,
    customConfirm,
    getImagePath,
    updateUIBasedOnUserRole,
    customPrompt
} from './utils.js';

let quill;
let strophenEditors = [];
let refrainEditor;
let alleObjekte = [];
let currentUser = null;

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

// Fügen Sie einen Event-Listener für den Logout-Button hinzu
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('logout-btnHam').addEventListener('click', logout);
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Kein Token gefunden');
        return null;
    }
    
    try {
        const userResponse = await authenticatedFetch('/api/user/info');
        const user = userResponse;
        console.log('Benutzerinformationen geladen:', user);
        
        // Laden des Institutionsnamens
        const institutionsResponse = await authenticatedFetch('/api/admin/institutions');
        const institutions = institutionsResponse;
        const userInstitution = institutions.find(institution => institution.id === user.institution_id);
        
        if (!userInstitution) {
            throw new Error('Keine passende Institution gefunden');
        }
        
        // Aktualisieren der UI mit den Benutzer- und Institutionsinformationen
        const userInfoContainer = document.getElementById('userInfoContainer');
        if (userInfoContainer) {
            userInfoContainer.innerHTML = ''; // Container leeren
            
            userInfoContainer.innerHTML = `
                <span>Angemeldet als: <strong>${user.username}</strong></span>
                <span>Rolle: <strong>${translateRole(user.role)}</strong></span>
                <span>Institution: <strong>${userInstitution.name}</strong></span>
            `;
        } else {
            console.error('userInfoContainer nicht gefunden');
        }
        
        return { user, userInstitution };
    } catch (error) {
        console.error('Fehler beim Laden der Informationen:', error);
        return null;
    }
}

async function checkAuthorization() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || !role) {
        console.log('Kein Token oder keine Rolle gefunden');
        window.location.href = 'index.html';
        return false;
    }
    
    if (role !== 'admin' && role !== 'super-admin') {
        console.log('Unzureichende Berechtigungen');
        window.location.href = 'dashboard.html';
        return false;
    }
    
    try {
        const response = await authenticatedFetch('/api/verify-token');
        return true;
    } catch (error) {
        console.error('Autorisierungsfehler:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'index.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const isAuthorized = await checkAuthorization();
        if (!isAuthorized) {
            return;
        }
        
        currentUser = await loadUserInfo();
        if (!currentUser) {
            throw new Error('Benutzerinformationen konnten nicht geladen werden');
        }
        
        const typSelect = document.getElementById('typ');
        const addStropheButton = document.getElementById('addStrophe');
        const objektForm = document.getElementById('objektForm');
        const resetFormButton = document.getElementById('resetForm');
        
        if (typSelect) typSelect.addEventListener('change', toggleLiedFelder);
        if (addStropheButton) addStropheButton.addEventListener('click', addStrophe);
        if (objektForm) objektForm.addEventListener('submit', handleFormSubmit);
        if (resetFormButton) resetFormButton.addEventListener('click', resetForm);
        
        await loadObjekte();
        if (typSelect) toggleLiedFelder.call(typSelect);
        
        const typ = typSelect ? typSelect.value : null;
        if (typ !== 'Lied' && typ !== 'Liturgie') {
            initializeQuillEditor();
        }
    } catch (error) {
        console.error('Fehler beim Initialisieren der Seite:', error);
        await customAlert(`Fehler beim Initialisieren der Seite: ${error.message}`);
        window.location.href = 'index.html';
    }
});

function checkUserRole() {
    const role = localStorage.getItem('role');
    if (role !== 'admin' && role !== 'super-admin') {
        window.location.href = 'dashboard.html';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const hamburgerIcon = document.querySelector('.hamburger-icon');
    const menuItems = document.querySelector('.menu-items');
    
    hamburgerIcon.addEventListener('click', function() {
        menuItems.classList.toggle('active');
    });
    
    // Schließe das Menü, wenn außerhalb geklickt wird
    document.addEventListener('click', function(event) {
        if (!hamburgerIcon.contains(event.target) && !menuItems.contains(event.target)) {
            menuItems.classList.remove('active');
        }
    });
});

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const isAuthorized = await checkAuthorization();
        if (!isAuthorized) {
            return;
        }
        
        currentUser = await loadUserInfo();
        if (!currentUser) {
            throw new Error('Benutzerinformationen konnten nicht geladen werden');
        }
        
        const typSelect = safeGetElement('typ');
        const addStropheButton = safeGetElement('addStrophe');
        const objektForm = safeGetElement('objektForm');
        const resetFormButton = safeGetElement('resetForm');
        
        if (typSelect) typSelect.addEventListener('change', toggleLiedFelder);
        if (addStropheButton) addStropheButton.addEventListener('click', addStrophe);
        if (objektForm) objektForm.addEventListener('submit', handleFormSubmit);
        if (resetFormButton) resetFormButton.addEventListener('click', resetForm);
        
        await loadObjekte();
        if (typSelect) toggleLiedFelder.call(typSelect);
        
        const typ = typSelect ? typSelect.value : null;
        if (typ !== 'Lied' && typ !== 'Liturgie') {
            initializeQuillEditor();
        }
    } catch (error) {
        console.error('Fehler beim Initialisieren der Seite:', error);
        await customAlert(`Fehler beim Initialisieren der Seite: ${error.message}`);
        window.location.href = 'index.html';
    }
});

function applyGlobalConfigToPreview() {
    const preview = document.getElementById('preview');
    const config = JSON.parse(localStorage.getItem('liedblattConfig')) || {
        fontFamily: 'Jost',
        fontSize: '14',
        textAlign: 'left',
        lineHeight: '1.1'
    };
    
    preview.style.fontFamily = config.fontFamily;
    preview.style.fontSize = `${config.fontSize}px`;
    preview.style.textAlign = config.textAlign;
    preview.style.lineHeight = config.lineHeight;
}

// Update the filterObjekte function to style buttons
function filterObjekte() {
    console.log('filterObjekte aufgerufen');
    const filterTyp = document.getElementById('filterTyp').value;
    const searchTerm = document.getElementById('objektSearch').value.toLowerCase();
    const filteredObjekte = alleObjekte.filter(objekt => 
        (filterTyp === 'all' || objekt.typ === filterTyp) &&
        objekt.titel.toLowerCase().includes(searchTerm)
    );
    
    const objektListe = document.getElementById('objektListe');
    objektListe.innerHTML = '';
    filteredObjekte.forEach(objekt => {
        const objektDiv = document.createElement('div');
        objektDiv.className = 'objekt-item';
        objektDiv.innerHTML = `
            <div class="objekt-content">
                <h3>${objekt.titel} (${objekt.typ})</h3>
                <div class="objekt-buttons">
                    <button onclick="editObjekt(${objekt.id})" class="btn btn-small">Bearbeiten</button>
                    <button onclick="deleteObjekt(${objekt.id})" class="btn btn-small delete-strophe">Löschen</button>
                </div>
            </div>
        `;
        objektListe.appendChild(objektDiv);
    });
}

function initializeFilters() {
    const filterTypSelect = document.getElementById('filterTyp');
    const searchInput = document.getElementById('objektSearch');
    
    if (filterTypSelect) {
        filterTypSelect.addEventListener('change', filterObjekte);
    } else {
        console.error('Filter-Typ-Select nicht gefunden');
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filterObjekte);
    } else {
        console.error('Such-Input nicht gefunden');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // ... andere Initialisierungen ...
    initializeFilters();
    // ... 
});

document.addEventListener('DOMContentLoaded', function() {
    applyGlobalConfigToPreview();
});

function toggleLiedFelder() {
    const liedFelder = document.getElementById('liedFelder');
    const copyrightField = document.getElementById('copyrightField');
    const melodieField = document.getElementById('melodieField');
    const editorContainer = document.getElementById('editor-container');
    const strophenContainer = document.getElementById('strophenContainer');
    const typ = this.value || document.getElementById('typ').value;
    
    if (typ === 'Lied' || typ === 'Liturgie') {
        if (liedFelder) liedFelder.style.display = 'block';
        if (copyrightField) copyrightField.style.display = 'block';
        if (melodieField) melodieField.style.display = 'block';
        if (editorContainer) editorContainer.style.display = 'none';
        if (strophenContainer) {
            strophenContainer.innerHTML = `
                <button type="button" id="addStropheBtn">Strophe hinzufügen</button>
                <button type="button" id="addRefrainBtn">Refrain hinzufügen</button>
                <div id="strophenList"></div>
                <div id="refrainContainer" style="display: none;"></div>
            `;
            document.getElementById('addStropheBtn').addEventListener('click', addStrophe);
            document.getElementById('addRefrainBtn').addEventListener('click', addRefrain);
        }
    } else {
        if (liedFelder) liedFelder.style.display = 'none';
        if (copyrightField) copyrightField.style.display = 'none';
        if (melodieField) melodieField.style.display = 'none';
        if (strophenContainer) strophenContainer.innerHTML = '';
        if (editorContainer) {
            editorContainer.style.display = 'block';
            if (!quill) {
                initializeQuillEditor();
            }
        }
    }
    
    const titelInput = document.getElementById('titel');
    const melodieInput = document.getElementById('melodie');
    const copyrightInput = document.getElementById('copyright');
    
    [titelInput, melodieInput, copyrightInput].forEach(input => {
        if (input) {
            input.addEventListener('input', updatePreview);
        }
    });
    updatePreview();
}

function initializeQuillEditor() {
    const editorContainer = document.getElementById('editor-container');
    if (!editorContainer) return;
    
    // Entfernen Sie alle bestehenden Quill-Editoren und Toolbars
    const existingToolbars = document.querySelectorAll('.ql-toolbar');
    existingToolbars.forEach(toolbar => toolbar.remove());
    const existingEditors = document.querySelectorAll('.ql-container');
    existingEditors.forEach(editor => editor.remove());
    
    editorContainer.style.display = 'block';
    editorContainer.innerHTML = '<div id="quill-editor"></div>';
    
    quill = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                //[{ 'size': ['small', false, 'large', 'huge'] }],
                ['clean']
            ]
        }
    });
    
    quill.on('text-change', updatePreview);
}

// Die restlichen Funktionen (addStrophe, handleFormSubmit, updatePreview, etc.) bleiben unverändert

function indentText(direction) {
    const range = quill.getSelection();
    if (range) {
        const lines = quill.getText(0, range.index).split('\n');
        const currentLineIndex = lines.length - 1;
        const format = quill.getFormat(range);
        const currentIndent = format.indent || 0;
        
        const newIndent = Math.max(0, currentIndent + direction);
        quill.formatLine(range.index, range.length, 'indent', newIndent);
    }
    updatePreview();
}

function addStrophe() {
    const strophenList = document.getElementById('strophenList');
    const strophenAnzahl = strophenList.children.length + 1;
    const stropheContainer = document.createElement('div');
    stropheContainer.className = 'strophe-container';
    stropheContainer.innerHTML = `
        <div class="strophe-header">
            <h4>Strophe ${strophenAnzahl}</h4>
            <div class="strophe-buttons">
                <button type="button" class="move-up btn-small">↑</button>
                <button type="button" class="move-down btn-small">↓</button>
                <button type="button" class="delete-strophe btn-small">×</button>
            </div>
        </div>
        <div id="strophe${strophenAnzahl}" class="strophe-editor"></div>
    `;
    strophenList.appendChild(stropheContainer);
    
    const editor = new Quill(`#strophe${strophenAnzahl}`, {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['clean']
            ]
        }
    });
    editor.on('text-change', updatePreview);
    
    stropheContainer.querySelector('.move-up').addEventListener('click', () => moveStrophe(stropheContainer, -1));
    stropheContainer.querySelector('.move-down').addEventListener('click', () => moveStrophe(stropheContainer, 1));
    stropheContainer.querySelector('.delete-strophe').addEventListener('click', () => deleteStrophe(stropheContainer));
    
    updateStrophenNumbers();
    return editor;
}


function addRefrain() {
    const refrainContainer = document.getElementById('refrainContainer');
    refrainContainer.style.display = 'block';
    if (!refrainContainer.querySelector('.ql-editor')) {
        refrainContainer.innerHTML = `
<div class="strophe-header">
            <h4>Refrain</h4>
            <div class="strophe-buttons">
                <button type="button" class="delete-strophe btn-small">×</button>
            </div>
        </div>
            <div id="refrainEditor"></div>
        `;
        const editor = new Quill('#refrainEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['clean']
                ]
            }
        });
        editor.on('text-change', updatePreview);
        
        refrainContainer.querySelector('.delete-strophe').addEventListener('click', () => deleteRefrain(refrainContainer));
        return editor;
    }
    return Quill.find(document.querySelector('#refrainEditor'));
}

function moveStrophe(stropheContainer, direction) {
    const strophenList = document.getElementById('strophenList');
    const strophen = Array.from(strophenList.children);
    const index = strophen.indexOf(stropheContainer);
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < strophen.length) {
        if (direction === -1) {
            strophenList.insertBefore(stropheContainer, strophen[newIndex]);
        } else {
            strophenList.insertBefore(stropheContainer, strophen[newIndex].nextSibling);
        }
        updateStrophenNumbers();
        updatePreview();
    }
}

function deleteNotes(type) {
    if (type === 'without') {
        document.getElementById('currentNotenbild').src = '';
        document.getElementById('currentNotenbild').style.display = 'none';
        document.getElementById('notenbild').value = '';
    } else if (type === 'with') {
        document.getElementById('currentNotenbildMitText').src = '';
        document.getElementById('currentNotenbildMitText').style.display = 'none';
        document.getElementById('notenbildMitText').value = '';
    }
    updatePreview();
}

function deleteStrophe(stropheContainer) {
    stropheContainer.remove();
    updateStrophenNumbers();
    updatePreview();
}

function deleteRefrain(refrainContainer) {
    refrainContainer.remove();
    updatePreview();
}

function updateStrophenNumbers() {
    const strophenList = document.getElementById('strophenList');
    const strophen = strophenList.children;
    Array.from(strophen).forEach((strophe, index) => {
        const header = strophe.querySelector('h4');
        if (header) {
            header.textContent = `Strophe ${index + 1}`;
        }
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!currentUser || !currentUser.user || !currentUser.user.institution_id) {
        await customAlert('Fehler: Benutzerinformationen nicht verfügbar oder unvollständig. Bitte laden Sie die Seite neu.');
        return;
    }
    
    const objektId = document.getElementById('objektId').value;
    
    const objektData = {
        typ: document.getElementById('typ').value,
        titel: document.getElementById('titel').value,
        inhalt: null,
        strophen: null,
        refrain: null,
        notenbild: null,
        notenbildMitText: null,
        copyright: document.getElementById('copyright').value || null,
        melodie: document.getElementById('melodie').value || null
    };
    
    console.log('Initial objektData:', JSON.stringify(objektData));
    
    if (objektData.typ === 'Lied' || objektData.typ === 'Liturgie') {
        const strophenList = document.getElementById('strophenList');
        if (strophenList) {
            objektData.strophen = JSON.stringify(Array.from(strophenList.children).map(strophe => {
                const editorElement = strophe.querySelector('.ql-editor');
                return editorElement ? editorElement.innerHTML : '';
            }));
        }
        
        const refrainEditorElement = document.querySelector('#refrainEditor .ql-editor');
        if (refrainEditorElement) {
            objektData.refrain = refrainEditorElement.innerHTML;
        }
    } else if (quill) {
        objektData.inhalt = quill.root.innerHTML;
    }
    
    console.log('Prepared objektData:', JSON.stringify(objektData));
    
    try {
        const formData = new FormData();
        Object.keys(objektData).forEach(key => {
            if (objektData[key] !== null && objektData[key] !== undefined) {
                formData.append(key, objektData[key]);
                console.log(`Appending to formData: ${key} = ${objektData[key]}`);
            }
        });
        
        // Fügen Sie die institution_id hinzu
        formData.append('institution_id', currentUser.user.institution_id);
        
        const notenbildFile = document.getElementById('notenbild').files[0];
        if (notenbildFile) {
            formData.append('notenbild', notenbildFile);
        }
        
        const notenbildMitTextFile = document.getElementById('notenbildMitText').files[0];
        if (notenbildMitTextFile) {
            formData.append('notenbildMitText', notenbildMitTextFile);
        }
        const url = objektId ? `/api/objekte/${objektId}` : '/api/objekte';
        const method = objektId ? 'PUT' : 'POST';
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Unbekannter Fehler beim Speichern');
        }
        
        const result = await response.json();
        console.log('Gespeichertes Objekt:', result);
        
        await customAlert('Objekt erfolgreich gespeichert');
        resetForm();
        loadObjekte();
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        await customAlert(`Fehler beim Speichern des Objekts: ${error.message}`);
    }
}


function updatePreview() {
    const previewDiv = document.getElementById('preview');
    if (!previewDiv) return;
    
    const typ = document.getElementById('typ').value;
    const titel = document.getElementById('titel').value;
    const melodie = document.getElementById('melodie').value;
    const copyright = document.getElementById('copyright').value;
    
    let previewContent = `<h3>${titel}</h3>`;
    
    if (typ === 'Lied' || typ === 'Liturgie') {
        if (melodie || copyright) {
            previewContent += '<p class="small-info">';
            if (melodie) previewContent += `Melodie: ${melodie}`;
            if (melodie && copyright) previewContent += ' | ';
            if (copyright) previewContent += `© ${copyright}`;
            previewContent += '</p>';
        }
        
        const showNotes = document.getElementById('showNotes')?.checked;
        const noteType = document.querySelector('input[name="noteType"]:checked')?.value;
        
        if (showNotes && noteType) {
            const currentNotenbild = noteType === 'without' ? document.getElementById('currentNotenbild') : document.getElementById('currentNotenbildMitText');
            if (currentNotenbild && currentNotenbild.src) {
                previewContent += `<img src="${currentNotenbild.src}" alt="Noten" style="max-width: 100%;">`;
            }
        }
        
        const strophenList = document.getElementById('strophenList');
        if (strophenList) {
            Array.from(strophenList.children).forEach((strophe, index) => {
                const editorElement = strophe.querySelector('.ql-editor');
                if (editorElement) {
                    previewContent += `<p><strong>Strophe ${index + 1}:</strong><br>${editorElement.innerHTML}</p>`;
                }
            });
        }
        
        const refrainEditorElement = document.querySelector('#refrainEditor .ql-editor');
        if (refrainEditorElement && refrainEditorElement.textContent.trim()) {
            previewContent += `<p><strong>Refrain:</strong><br>${refrainEditorElement.innerHTML}</p>`;
        }
    } else if (quill) {
        previewContent += quill.root.innerHTML;
    }
    
    previewDiv.innerHTML = previewContent;
}

function resetForm() {
    const objektForm = safeGetElement('objektForm');
    if (objektForm) objektForm.reset();
    
    const objektIdInput = safeGetElement('objektId');
    if (objektIdInput) objektIdInput.value = '';
    
    const copyrightInput = safeGetElement('copyright');
    if (copyrightInput) copyrightInput.value = '';
    
    const melodieInput = safeGetElement('melodie');
    if (melodieInput) melodieInput.value = '';
    
    const strophenContainer = safeGetElement('strophenContainer');
    if (strophenContainer) strophenContainer.innerHTML = '';
    
    strophenEditors.forEach(editor => editor.setText(''));
    strophenEditors = [];
    
    if (refrainEditor) {
        refrainEditor.setText('');
    }
    
    const currentNotenbild = safeGetElement('currentNotenbild');
    if (currentNotenbild) currentNotenbild.style.display = 'none';
    
    const currentNotenbildMitText = safeGetElement('currentNotenbildMitText');
    if (currentNotenbildMitText) currentNotenbildMitText.style.display = 'none';
    
    if (quill) {
        quill.setText('');
    }
    
    const typSelect = safeGetElement('typ');
    if (typSelect) toggleLiedFelder.call(typSelect);
    
    updatePreview();
}

function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element mit ID "${id}" nicht gefunden`);
    }
    return element;
}

async function loadObjekte() {
    try {
        alleObjekte = await authenticatedFetch('/api/objekte');
        console.log('Geladene Objekte:', alleObjekte);
        filterObjekte();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Objekte');
    }
}

document.getElementById('showNotes').addEventListener('change', function() {
    console.log('showNotes geändert:', this.checked);
    updatePreview();
});

document.querySelectorAll('input[name="noteType"]').forEach(radio => {
    radio.addEventListener('change', function() {
        console.log('noteType geändert:', this.value);
        updatePreview();
    });
});
function editObjekt(id) {
    console.log('editObjekt aufgerufen mit ID:', id);
    const objekt = alleObjekte.find(obj => obj.id === id);
    if (!objekt) {
        console.error('Objekt nicht gefunden für ID:', id);
        return;
    }
    console.log('Gefundenes Objekt:', objekt);
    
    const objektIdElement = document.getElementById('objektId');
    const typElement = document.getElementById('typ');
    const titelElement = document.getElementById('titel');
    const copyrightElement = document.getElementById('copyright');
    const melodieElement = document.getElementById('melodie');
    
    if (objektIdElement) objektIdElement.value = objekt.id;
    if (typElement) typElement.value = objekt.typ;
    if (titelElement) titelElement.value = objekt.titel;
    if (copyrightElement) copyrightElement.value = objekt.copyright || '';
    if (melodieElement) melodieElement.value = objekt.melodie || '';
    
    if (typElement) toggleLiedFelder.call(typElement);
    
    if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
        console.log('Lied oder Liturgie erkannt');
        const strophenContainer = document.getElementById('strophenContainer');
        if (strophenContainer) {
            strophenContainer.innerHTML = `
                <button type="button" id="addStropheBtn">Strophe hinzufügen</button>
                <button type="button" id="addRefrainBtn">Refrain hinzufügen</button>
                <div id="strophenList"></div>
                <div id="refrainContainer" style="display: none;"></div>
            `;
            document.getElementById('addStropheBtn').addEventListener('click', addStrophe);
            document.getElementById('addRefrainBtn').addEventListener('click', addRefrain);
            
            const strophen = typeof objekt.strophen === 'string' ? JSON.parse(objekt.strophen) : objekt.strophen;
            if (Array.isArray(strophen)) {
                strophen.forEach((strophe, index) => {
                    addStrophe();
                    const stropheEditor = document.querySelector(`#strophe${index + 1} .ql-editor`);
                    if (stropheEditor) {
                        stropheEditor.innerHTML = strophe;
                    }
                });
            }
            
            if (objekt.refrain) {
                addRefrain();
                const refrainEditor = document.querySelector('#refrainEditor .ql-editor');
                if (refrainEditor) {
                    refrainEditor.innerHTML = objekt.refrain;
                }
            }
        }
        
        const showNotesElement = document.getElementById('showNotes');
        if (showNotesElement) {
            showNotesElement.checked = objekt.notenbild || objekt.notenbildMitText;
            showNotesElement.dispatchEvent(new Event('change'));
        }
        
        const notesWithoutTextElement = document.getElementById('notesWithoutText');
        const notesWithTextElement = document.getElementById('notesWithText');
        const currentNotenbildElement = document.getElementById('currentNotenbild');
        const currentNotenbildMitTextElement = document.getElementById('currentNotenbildMitText');
        
        if (notesWithoutTextElement && objekt.notenbild) {
            notesWithoutTextElement.checked = true;
        } else if (notesWithTextElement && objekt.notenbildMitText) {
            notesWithTextElement.checked = true;
        }
        
        if (currentNotenbildElement) {
            if (objekt.notenbild) {
                currentNotenbildElement.src = getImagePath(objekt, 'notenbild');
                currentNotenbildElement.style.display = 'block';
            } else {
                currentNotenbildElement.style.display = 'none';
            }
        }
        
        if (currentNotenbildMitTextElement) {
            if (objekt.notenbildMitText) {
                currentNotenbildMitTextElement.src = getImagePath(objekt, 'notenbildMitText');
                currentNotenbildMitTextElement.style.display = 'block';
            } else {
                currentNotenbildMitTextElement.style.display = 'none';
            }
        }
        
        const noteTypeDiv = document.querySelector('.form-group:has(#notesWithoutText)');
        if (noteTypeDiv && showNotesElement) {
            noteTypeDiv.style.display = showNotesElement.checked ? 'block' : 'none';
        }
    } else {
        if (quill) {
            quill.root.innerHTML = objekt.inhalt || '';
        } else {
            initializeQuillEditor();
            if (quill) {
                quill.root.innerHTML = objekt.inhalt || '';
            }
        }
    }
    
    updatePreview();
}

async function deleteObjekt(id) {
        if (await customConfirm('Sind Sie sicher, dass Sie dieses Objekt löschen möchten?')) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/objekte/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error('Fehler beim Löschen des Objekts');
                }
                await customAlert('Objekt erfolgreich gelöscht');
                loadObjekte();
            } catch (error) {
                console.error('Fehler:', error);
                await customAlert('Fehler beim Löschen des Objekts');
            }
        }
    }
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM fully loaded');
        const typ = document.getElementById('typ').value;
        if (typ !== 'Lied' && typ !== 'Liturgie') {
            initializeQuillEditor();
        }
        toggleLiedFelder.call(document.getElementById('typ'));
        const showNotesCheckbox = document.getElementById('showNotes');
        if (showNotesCheckbox) {
            showNotesCheckbox.addEventListener('change', function() {
                const noteTypeDiv = document.querySelector('.form-group:has(#notesWithoutText)');
                if (noteTypeDiv) {
                    noteTypeDiv.style.display = this.checked ? 'block' : 'none';
                }
            });
        }
    });
    window.editObjekt = editObjekt;
    window.deleteObjekt = deleteObjekt;
    window.deleteNotes = deleteNotes;
    
    window.addEventListener('error', function(event) {
        console.error('Unerwarteter Fehler:', event.error);
        customAlert('Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.');
    });