// sessionManagement.js

import { authenticatedFetch, customAlert, customConfirm, customPrompt } from './utils.js';
import { updateLiedblatt, addToSelected, quillInstances, resetQuillInstances } from './liedblattManagement.js';
import { globalConfig, getImagePath } from './script.js';

export async function saveSession(name) {
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
                objekt.refrainOptions = Array.from(liedOptions.querySelectorAll('.strophe-option'))
                .map(stropheOption => {
                    const refrainSelect = stropheOption.querySelector('select');
                    return refrainSelect ? refrainSelect.value : 'none';
                });
            }
        }
        
        const showTitleCheckbox = item.querySelector('input[id^="showTitle"]');
        objekt.showTitle = showTitleCheckbox ? showTitleCheckbox.checked : true;
        
        const altTitleInput = item.querySelector('.alternative-title-input');
        objekt.alternativePrefix = altTitleInput ? altTitleInput.value : '';
        
        return { uniqueId, objekt };
    });
    
    try {
        const result = await authenticatedFetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, data: sessionData }),
        });
        await customAlert('Session erfolgreich gespeichert mit ID: ' + result.id);
        await updateSessionSelect();
        await updateSessionsList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Speichern der Session: ' + error.message);
    }
}

export async function loadSession(id) {
    try {
        const session = await authenticatedFetch(`/api/sessions/${id}`);
        if (session && session.data) {
            applySessionData(session.data);
            await customAlert('Session erfolgreich geladen');
        } else {
            throw new Error('Unerwartetes Datenformat in der Session');
        }
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Session: ' + error.message);
    }
}


export async function deleteSession(id) {
    const confirmed = await customConfirm('Sind Sie sicher, dass Sie diese Session löschen möchten?');
    if (!confirmed) return;
    
    try {
        await authenticatedFetch(`/api/sessions/${id}`, { method: 'DELETE' });
        await customAlert('Session erfolgreich gelöscht');
        await updateSessionSelect();
        await updateSessionsList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Löschen der Session: ' + error.message);
    }
}

export function saveSessionToLocalStorage() {
    const selectedItems = document.querySelectorAll('.selected-item');
    const sessionData = Array.from(selectedItems).map(item => {
        const objekt = JSON.parse(item.getAttribute('data-object'));
        const uniqueId = item.getAttribute('data-unique-id');
        
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
                objekt.refrainOptions = Array.from(liedOptions.querySelectorAll('.strophe-option'))
                .map(stropheOption => {
                    const refrainSelect = stropheOption.querySelector('select');
                    return refrainSelect ? refrainSelect.value : 'none';
                });
            }
        }
        
        const altTitleInput = item.querySelector('.alternative-title-input');
        objekt.alternativePrefix = altTitleInput ? altTitleInput.value : '';
        
        return { uniqueId, objekt };
    });
    localStorage.setItem('lastSession', JSON.stringify(sessionData));
    console.log('Session saved:', sessionData);
}

export function loadLastSession() {
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

export function applySessionData(sessionData) {
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
                    if (objekt.refrainOptions && Array.isArray(objekt.refrainOptions)) {
                        const refrainSelects = liedOptions.querySelectorAll('.strophe-option select');
                        refrainSelects.forEach((select, index) => {
                            if (objekt.refrainOptions[index]) {
                                select.value = objekt.refrainOptions[index];
                            }
                        });
                    }
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

export async function resetSession() {
    if (await customConfirm('Sind Sie sicher, dass Sie die aktuelle Session zurücksetzen möchten?')) {
        localStorage.removeItem('lastSession');
        document.getElementById('selected-items').innerHTML = '';
        resetQuillInstances(); // Anstatt direkt zuzuweisen
        updateLiedblatt();
        document.getElementById('session-select').value = '';
        document.getElementById('vorlage-select').value = '';
        await customAlert('Session wurde zurückgesetzt');
    }
}

export async function saveVorlage(name) {
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
                objekt.refrainOptions = Array.from(liedOptions.querySelectorAll('.strophe-option'))
                .map(stropheOption => {
                    const refrainSelect = stropheOption.querySelector('select');
                    return refrainSelect ? refrainSelect.value : 'none';
                });
            }
        }
        
        const showTitleCheckbox = item.querySelector('input[id^="showTitle"]');
        objekt.showTitle = showTitleCheckbox ? showTitleCheckbox.checked : true;
        
        const altTitleInput = item.querySelector('.alternative-title-input');
        objekt.alternativePrefix = altTitleInput ? altTitleInput.value : '';
        
        return { uniqueId, objekt };
    });
    
    try {
        const result = await authenticatedFetch('/api/vorlagen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, data: vorlageData }),
        });
        await customAlert('Vorlage erfolgreich gespeichert mit ID: ' + result.id);
        await updateVorlageSelect();
        await updateVorlagenList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Speichern der Vorlage: ' + error.message);
    }
}

export async function loadVorlage(id) {
    try {
        const vorlage = await authenticatedFetch(`/api/vorlagen/${id}`);
        if (vorlage && vorlage.data) {
            applySessionData(vorlage.data);
            await customAlert('Vorlage erfolgreich geladen');
        } else {
            throw new Error('Unerwartetes Datenformat in der Vorlage');
        }
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Laden der Vorlage: ' + error.message);
    }
}

export async function deleteVorlage(id) {
    const confirmed = await customConfirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?');
    if (!confirmed) return;
    
    try {
        await authenticatedFetch(`/api/vorlagen/${id}`, { method: 'DELETE' });
        await customAlert('Vorlage erfolgreich gelöscht');
        await updateVorlageSelect();
        await updateVorlagenList();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Fehler beim Löschen der Vorlage: ' + error.message);
    }
}

export async function loadVorlagenList() {
    try {
        console.log('Lade Vorlagen...');
        const vorlagen = await authenticatedFetch('/api/vorlagen');
        console.log('Geladene Vorlagen:', vorlagen);
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
        console.error('Fehler beim Laden der Vorlagen:', error);
        await customAlert('Fehler beim Laden der Vorlagen: ' + error.message);
    }
}

export async function updateSessionSelect() {
    try {
        const response = await authenticatedFetch('/api/sessions');
        console.log('Sessions response:', response);  // Debugging
        const sessions = Array.isArray(response) ? response : [];
        const select = document.getElementById('session-select');
        select.innerHTML = '<option value="">Session laden...</option>';
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `${session.name} (${new Date(session.created_at).toLocaleString()})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Session-Auswahl:', error);
        await customAlert('Fehler beim Laden der Sessions: ' + error.message);
    }
}

export async function updateVorlageSelect() {
    const select = document.getElementById('vorlage-select');
    select.innerHTML = '<option value="">Vorlage laden...</option>';
    try {
        const response = await authenticatedFetch('/api/vorlagen');
        console.log('Vorlagen response:', response);  // Debugging
        const vorlagen = Array.isArray(response) ? response : [];
        vorlagen.forEach(vorlage => {
            const option = document.createElement('option');
            option.value = vorlage.id;
            option.textContent = vorlage.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Vorlagen:', error);
        await customAlert('Fehler beim Laden der Vorlagen: ' + error.message);
    }
}

export async function updateSessionsList() {
    const sessionsList = document.getElementById('sessions-list');
    sessionsList.innerHTML = '<h3>Gespeicherte Sessions</h3>';
    try {
        const response = await authenticatedFetch('/api/sessions');
        console.log('Sessions list response:', response);  // Debugging
        const sessions = Array.isArray(response) ? response : [];
        if (sessions.length === 0) {
            sessionsList.innerHTML += '<p>Keine Sessions gefunden.</p>';
        } else {
            sessions.forEach(session => {
                const sessionItem = document.createElement('div');
                sessionItem.innerHTML = `
                    ${session.name} (${new Date(session.created_at).toLocaleString()})
                    <button class="load-session" data-id="${session.id}">Laden</button>
                    <button class="delete-session" data-id="${session.id}">Löschen</button>
                `;
                sessionsList.appendChild(sessionItem);
            });
        }
    } catch (error) {
        console.error('Fehler beim Laden der Sessions:', error);
        sessionsList.innerHTML += `<p>Fehler beim Laden der Sessions: ${error.message}</p>`;
    }
}


export async function updateVorlagenList() {
    const vorlagenList = document.getElementById('vorlagen-list');
    vorlagenList.innerHTML = '<h3>Gespeicherte Vorlagen</h3>';
    try {
        const response = await authenticatedFetch('/api/vorlagen');
        console.log('Vorlagen list response:', response);  // Debugging
        const vorlagen = Array.isArray(response) ? response : [];
        if (vorlagen.length === 0) {
            vorlagenList.innerHTML += '<p>Keine Vorlagen gefunden.</p>';
        } else {
            vorlagen.forEach(vorlage => {
                const vorlageItem = document.createElement('div');
                vorlageItem.innerHTML = `
                    ${vorlage.name}
                    <button class="load-vorlage" data-id="${vorlage.id}">Laden</button>
                    <button class="delete-vorlage" data-id="${vorlage.id}">Löschen</button>
                `;
                vorlagenList.appendChild(vorlageItem);
            });
        }
    } catch (error) {
        console.error('Fehler beim Laden der Vorlagen:', error);
        vorlagenList.innerHTML += `<p>Fehler beim Laden der Vorlagen: ${error.message}</p>`;
    }
}

export async function saveCurrentSessionAsVorlage() {
    const name = await customPrompt('Geben Sie einen Namen für die Vorlage ein:');
    if (name) {
        await saveVorlage(name);
    }
}

export async function showSessionsAndVorlagen() {
    const modal = document.getElementById('manage-modal');
    modal.style.display = 'block';
    await updateSessionsList();
    await updateVorlagenList();
    
    // Event-Listener für Session-Buttons
    document.getElementById('sessions-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('load-session')) {
            const sessionId = e.target.dataset.id;
            await loadSession(sessionId);
            modal.style.display = 'none';
        } else if (e.target.classList.contains('delete-session')) {
            const sessionId = e.target.dataset.id;
            await deleteSession(sessionId);
            await updateSessionsList();
        }
    });
    
    // Event-Listener für Vorlagen-Buttons
    document.getElementById('vorlagen-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('load-vorlage')) {
            const vorlageId = e.target.dataset.id;
            await loadVorlage(vorlageId);
            modal.style.display = 'none';
        } else if (e.target.classList.contains('delete-vorlage')) {
            const vorlageId = e.target.dataset.id;
            await deleteVorlage(vorlageId);
            await updateVorlagenList();
        }
    });
}