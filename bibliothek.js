import {
    checkAuthToken,
    logout,
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
let alleObjekte = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        await checkAuthToken();
        currentUser = await loadUserInfo();
        if (!currentUser) {
            throw new Error('Benutzerinformationen konnten nicht geladen werden');
        }
        
        setupEventListeners();
        await loadObjekte();
        toggleLiedFelder();
        initializeQuillEditor();
        updateUIBasedOnUserRole();
    } catch (error) {
        console.error('Fehler beim Initialisieren der Seite:', error);
        await customAlert(`Fehler beim Initialisieren der Seite: ${error.message}`);
        window.location.href = 'index.html';
    }
}
function setupEventListeners() {
    document.getElementById('typ').addEventListener('change', toggleLiedFelder);
    document.getElementById('addStrophe').addEventListener('click', addStrophe);
    document.getElementById('objektForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('resetForm').addEventListener('click', resetForm);
    document.getElementById('filterTyp').addEventListener('change', filterObjekte);
    document.getElementById('objektSearch').addEventListener('input', filterObjekte);
    document.getElementById('logout-btn').addEventListener('click', logout);
}
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('token');
        const user = await authenticatedFetch('/api/user/info');
        const institutions = await authenticatedFetch('/api/admin/institutions');
        const userInstitution = institutions.find(inst => inst.id === user.institution_id);
        
        if (!userInstitution) {
            throw new Error('Keine passende Institution gefunden');
        }
        
        updateUserInfoDisplay(user, userInstitution);
        return { user, userInstitution };
    } catch (error) {
        console.error('Fehler beim Laden der Benutzerinformationen:', error);
        await customAlert('Fehler beim Laden der Benutzerinformationen. Bitte laden Sie die Seite neu.');
        return null;
    }
}

function updateUserInfoDisplay(user, userInstitution) {
    const userInfoContainer = document.getElementById('userInfoContainer');
    if (userInfoContainer) {
        userInfoContainer.innerHTML = `
            <span>Angemeldet als: <strong>${user.username}</strong></span>
            <span>Rolle: <strong>${translateRole(user.role)}</strong></span>
            <span>Institution: <strong>${userInstitution.name}</strong></span>
        `;
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
        const response = await fetch('/api/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Token ungültig');
        }
        return true;
    } catch (error) {
        console.error('Autorisierungsfehler:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'index.html';
        return false;
    }
}

function checkUserRole() {
    const role = localStorage.getItem('role');
    if (role !== 'admin' && role !== 'super-admin') {
        window.location.href = 'dashboard.html';
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
document.addEventListener('DOMContentLoaded', function() {
    applyGlobalConfigToPreview();
});
function toggleLiedFelder() {
    const liedFelder = document.getElementById('liedFelder');
    const copyrightField = document.getElementById('copyrightField');
    const editorContainer = document.getElementById('editor-container');
    const strophenContainer = document.getElementById('strophenContainer');
    const typ = this.value || document.getElementById('typ').value;
    
    if (typ === 'Lied' || typ === 'Liturgie') {
        if (liedFelder) liedFelder.style.display = 'block';
        if (copyrightField) copyrightField.style.display = 'block';
        if (editorContainer) editorContainer.style.display = 'none';
        if (strophenContainer) {
            strophenContainer.innerHTML = '';
            if (strophenEditors.length === 0) {
                addStrophe();
            }
        }
    } else {
        if (liedFelder) liedFelder.style.display = 'none';
        if (copyrightField) copyrightField.style.display = 'none';
        if (strophenContainer) strophenContainer.innerHTML = '';
        strophenEditors = [];
        initializeQuillEditor();
    }
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
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
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
    const container = document.getElementById('strophenContainer');
    const strophenAnzahl = container.children.length + 1;
    const newStropheDiv = document.createElement('div');
    newStropheDiv.className = 'form-group strophe-container';
    newStropheDiv.innerHTML = `
        <div class="strophe-header">
            <label for="strophe${strophenAnzahl}">Strophe ${strophenAnzahl}:</label>
            <div class="strophe-buttons">
                <button type="button" class="move-up btn-small">↑</button>
                <button type="button" class="move-down btn-small">↓</button>
                <button type="button" class="delete-strophe btn-small">×</button>
            </div>
        </div>
        <div id="strophe${strophenAnzahl}" class="strophe-editor"></div>
    `;
    container.appendChild(newStropheDiv);
    
    const editor = new Quill(`#strophe${strophenAnzahl}`, {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });
    strophenEditors.push(editor);
    editor.on('text-change', updatePreview);
    
    newStropheDiv.querySelector('.move-up').addEventListener('click', () => moveStrophe(newStropheDiv, -1));
    newStropheDiv.querySelector('.move-down').addEventListener('click', () => moveStrophe(newStropheDiv, 1));
    newStropheDiv.querySelector('.delete-strophe').addEventListener('click', () => deleteStrophe(newStropheDiv));
    
    updateStrophenNumbers();
    updatePreview();
}

function moveStrophe(stropheDiv, direction) {
    const container = document.getElementById('strophenContainer');
    const strophen = Array.from(container.children);
    const index = strophen.indexOf(stropheDiv);
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < strophen.length) {
        if (direction === -1) {
            container.insertBefore(stropheDiv, strophen[newIndex]);
        } else {
            container.insertBefore(stropheDiv, strophen[newIndex].nextSibling);
        }
        
        const tempEditor = strophenEditors[index];
        strophenEditors[index] = strophenEditors[newIndex];
        strophenEditors[newIndex] = tempEditor;
        
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

function deleteStrophe(stropheDiv) {
    const container = document.getElementById('strophenContainer');
    const index = Array.from(container.children).indexOf(stropheDiv);
    
    container.removeChild(stropheDiv);
    strophenEditors.splice(index, 1);
    
    updateStrophenNumbers();
    updatePreview();
}

function updateStrophenNumbers() {
    const container = document.getElementById('strophenContainer');
    Array.from(container.children).forEach((stropheDiv, index) => {
        const label = stropheDiv.querySelector('label');
        label.textContent = `Strophe ${index + 1}:`;
        label.setAttribute('for', `strophe${index + 1}`);
        stropheDiv.querySelector('.strophe-editor').id = `strophe${index + 1}`;
    });
}

async function handleFormSubmit(e) {
    console.log('Form submit initiated'); // Debugging log
    e.preventDefault();
    
    if (!currentUser || !currentUser.institution_id) {
        await customAlert('Fehler: Benutzerinformationen nicht verfügbar oder unvollständig. Bitte laden Sie die Seite neu.');
        return;
    }
    
    console.log('Prevented default submit'); // Debugging log
    
    const objektId = document.getElementById('objektId').value;
    
    const objektData = {
        typ: document.getElementById('typ').value,
        titel: document.getElementById('titel').value,
        inhalt: null,
        strophen: null,
        notenbild: null,
        notenbildMitText: null,
        copyright: document.getElementById('copyright').value || null,
        institution_id: currentUser.user.institution_id
    };
    
    console.log('Initial objektData:', JSON.stringify(objektData));
    
    if (objektData.typ === 'Lied' || objektData.typ === 'Liturgie') {
        const strophen = strophenEditors.map(editor => editor.root.innerHTML);
        objektData.strophen = JSON.stringify(strophen);
        objektData.inhalt = JSON.stringify({typ: objektData.typ});
    } else {
        objektData.inhalt = quill ? quill.root.innerHTML : '';
    }
    
    console.log('Prepared objektData:', JSON.stringify(objektData));
    
    try {
        const url = objektId ? `/api/objekte/${objektId}` : '/api/objekte';
        const method = objektId ? 'PUT' : 'POST';
        const token = localStorage.getItem('token');
        
        const formData = new FormData();
        Object.keys(objektData).forEach(key => {
            if (objektData[key] !== null && objektData[key] !== undefined) {
                formData.append(key, objektData[key]);
                console.log(`Appending to formData: ${key} = ${objektData[key]}`);
            }
        });
        
        // Fügen Sie die institution_id hinzu
        formData.append('institution_id', currentUser.institution_id);
        
        const notenbildFile = document.getElementById('notenbild').files[0];
        if (notenbildFile) {
            formData.append('notenbild', notenbildFile);
            console.log('Appending notenbild file');
        }
        
        const notenbildMitTextFile = document.getElementById('notenbildMitText').files[0];
        if (notenbildMitTextFile) {
            formData.append('notenbildMitText', notenbildMitTextFile);
            console.log('Appending notenbildMitText file');
        }
        
        console.log('Sending request to:', url, 'with method:', method);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Erfolgreich gespeichert:', result);
        
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
    if (!previewDiv) {
        console.error("Preview div not found");
        return;
    }
    const typ = document.getElementById('typ').value;
    const titel = document.getElementById('titel').value;
    
    let previewContent = `<h3>${titel}</h3>`;
    
    if (typ === 'Lied' || typ === 'Liturgie') {
        const showNotes = document.getElementById('showNotes')?.checked;
        const noteType = document.querySelector('input[name="noteType"]:checked')?.value;
        
        if (showNotes && noteType) {
            const currentNotenbild = noteType === 'without' ? document.getElementById('currentNotenbild') : document.getElementById('currentNotenbildMitText');
            if (currentNotenbild && currentNotenbild.src) {
                previewContent += `<img src="${currentNotenbild.src}" alt="Noten" style="max-width: 100%;">`;
            }
        }
        
        strophenEditors.forEach((editor, index) => {
            previewContent += `<p><strong>Strophe ${index + 1}:</strong><br>${editor.root.innerHTML}</p>`;
        });
    } else {
        if (quill) {
            const content = quill.root.innerHTML;
            previewContent += content.replace(/<p class="ql-indent-(\d+)">/g, (match, p1) => {
                const indent = parseInt(p1) * 2;
                return `<p style="padding-left: ${indent}em;">`;
            });
        }
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
    
    const strophenContainer = safeGetElement('strophenContainer');
    if (strophenContainer) strophenContainer.innerHTML = '';
    
    strophenEditors = [];
    
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
        const token = localStorage.getItem('token');
        const response = await fetch('/api/objekte', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Fehler beim Abrufen der Objekte');
        }
        alleObjekte = await response.json();
        console.log('Geladene Objekte:', alleObjekte); // Debugging
        filterObjekte();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Objekte');
    }
}


function editObjekt(id) {
    const objekt = alleObjekte.find(obj => obj.id === id);
    if (!objekt) return;
    
    document.getElementById('objektId').value = objekt.id;
    document.getElementById('typ').value = objekt.typ;
    document.getElementById('titel').value = objekt.titel;
    document.getElementById('copyright').value = objekt.copyright || '';
    
    toggleLiedFelder.call(document.getElementById('typ'));
    
    if (objekt.typ === 'Lied' || objekt.typ === 'Liturgie') {
        document.getElementById('strophenContainer').innerHTML = '';
        strophenEditors = [];
        const strophen = typeof objekt.strophen === 'string' ? JSON.parse(objekt.strophen) : objekt.strophen;
        strophen.forEach((strophe, index) => {
            const stropheDiv = document.createElement('div');
            stropheDiv.className = 'form-group strophe-container';
            stropheDiv.innerHTML = `
                <div class="strophe-header">
                    <label for="strophe${index + 1}">Strophe ${index + 1}:</label>
                    <div class="strophe-buttons">
                        <button type="button" class="move-up btn-small">↑</button>
                        <button type="button" class="move-down btn-small">↓</button>
                        <button type="button" class="delete-strophe btn-small">×</button>
                    </div>
                </div>
                <div id="strophe${index + 1}" class="strophe-editor"></div>
            `;
            document.getElementById('strophenContainer').appendChild(stropheDiv);
            
            const editor = new Quill(`#strophe${index + 1}`, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                    ]
                }
            });
            editor.root.innerHTML = strophe;
            strophenEditors.push(editor);
            editor.on('text-change', updatePreview);
            
            stropheDiv.querySelector('.move-up').addEventListener('click', () => moveStrophe(stropheDiv, -1));
            stropheDiv.querySelector('.move-down').addEventListener('click', () => moveStrophe(stropheDiv, 1));
            stropheDiv.querySelector('.delete-strophe').addEventListener('click', () => deleteStrophe(stropheDiv));
        });
        
        document.getElementById('showNotes').checked = objekt.notenbild || objekt.notenbildMitText;
        if (objekt.notenbild) {
            document.getElementById('notesWithoutText').checked = true;
        } else if (objekt.notenbildMitText) {
            document.getElementById('notesWithText').checked = true;
        }
        if (objekt.notenbild) {
            document.getElementById('currentNotenbild').src = getImagePath(objekt, 'notenbild');
            document.getElementById('currentNotenbild').style.display = 'block';
        } else {
            document.getElementById('currentNotenbild').style.display = 'none';
        }
        if (objekt.notenbildMitText) {
            document.getElementById('currentNotenbildMitText').src = getImagePath(objekt, 'notenbildMitText');
            document.getElementById('currentNotenbildMitText').style.display = 'block';
        } else {
            document.getElementById('currentNotenbildMitText').style.display = 'none';
        }
    } else {
        initializeQuillEditor();
        if (quill) {
            quill.root.innerHTML = objekt.inhalt || '';
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
});

window.editObjekt = editObjekt;
window.deleteObjekt = deleteObjekt;

window.addEventListener('error', function(event) {
    console.error('Unerwarteter Fehler:', event.error);
    customAlert('Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.');
});