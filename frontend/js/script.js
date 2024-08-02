// script.js

// Importe
import {
    saveSession,
    loadSession,
    deleteSession,
//  loadSessionList,
    saveSessionToLocalStorage,
    loadLastSession,
    applySessionData,
    resetSession,
    saveVorlage,
    loadVorlage,
    deleteVorlage,
    loadVorlagenList,
    updateSessionSelect,
    updateVorlageSelect,
    updateSessionsList,
    updateVorlagenList,
    saveCurrentSessionAsVorlage,
    showSessionsAndVorlagen
} from './sessionManagement.js';

import {
    authenticatedFetch,
    customAlert,
    customConfirm,
    customPrompt,
    getImagePath
} from './utils.js';

import {
    scrollToTitle,
    moveItem,
    getDefaultShowTitleValue,
    addCustomImage,
    addFreierText,
    formatQuillHTML,
    addTrenner,
    addPageBreak,
    getTrennerIconClass,
    createLiedOptions,
    updateLiedblatt,
    addToSelected,
    quillInstances
} from './liedblattManagement.js';

import {
    initializeDragAndDrop,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleMouseDown,
    handleDragEnd,
    getDragAfterElement
} from './dragAndDrop.js';

// Globale Variablen und Konfigurationen
let alleObjekte = [];
let globalConfig = {
    fontFamily: 'Jost',
    fontSize: 12,
    textAlign: 'left',
    lineHeight: 1.5,
    format: 'a5',
    churchLogo: null // Wird als Base64-String gespeichert
};

// Initialisierungsfunktionen
async function initializeApp() {
    try {
        await checkAuthToken();
        loadLastSession();
        await loadObjekte();
        await updateSessionSelect();
        await updateVorlageSelect();
        initializeDragAndDrop();
        await loadVorlagenList();
        updateUIBasedOnUserRole();
        
        // Rufen Sie loadObjekte alle 5 Minuten auf
        setInterval(loadObjekte, 5 * 60 * 1000);
    } catch (error) {
        console.error('Fehler beim Initialisieren der App:', error);
        await customAlert('Fehler beim Initialisieren der App: ' + error.message);
        window.location.href = 'index.html';
    }
    document.getElementById('session-select').addEventListener('change', async (e) => {
        const sessionId = e.target.value;
        if (sessionId) {
            await loadSession(sessionId);
            e.target.value = ''; // Reset dropdown nach dem Laden
        }
    });
    
    document.getElementById('vorlage-select').addEventListener('change', async (e) => {
        const vorlageId = e.target.value;
        if (vorlageId) {
            await loadVorlage(vorlageId);
            e.target.value = ''; // Reset dropdown nach dem Laden
        }
    });
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

async function loadUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Kein Token gefunden');
        return null;
    }
    
    try {
        const userResponse = await fetch('/api/user/info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!userResponse.ok) {
            throw new Error('Fehler beim Laden der Benutzerinformationen');
        }
        
        const user = await userResponse.json();
        console.log('Benutzerinformationen geladen:', user);
        
        // Laden des Institutionsnamens
        const institutionResponse = await fetch(`/api/admin/institutions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!institutionResponse.ok) {
            throw new Error('Fehler beim Laden der Institutionsinformationen');
        }
        const institutions = await institutionResponse.json();
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

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

// Fügen Sie einen Event-Listener für den Logout-Button hinzu
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('logout-btnHam').addEventListener('click', logout);

function translateRole(role) {
    switch (role) {
        case 'admin':
            return 'Admin';
        case 'user':
            return 'Nutzer:in';
        default:
            return role;
    }
}

function updateUIBasedOnUserRole() {
    const role = localStorage.getItem('role');
    const bibliothekButton = document.querySelector('a[href="bibliothek.html"]');
    
    if (bibliothekButton) {
        if (role === 'admin' || role === 'super-admin') {
            bibliothekButton.style.display = 'inline-block';
        } else {
            bibliothekButton.style.display = 'none';
        }
    }
}

// Event Listener Laden der Konfig beim Seitenladen
document.addEventListener('DOMContentLoaded', loadConfigFromLocalStorage);

// Konfigurations- und Styling-Funktionen
async function updateGlobalConfig(newConfig) {
    console.log("Updating global config with:", newConfig);
    
    Object.assign(globalConfig, newConfig);
    
    const logoFile = document.getElementById('churchLogo').files[0];
    if (logoFile) {
        console.log("Logo file selected:", logoFile.name);
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/upload-logo', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                globalConfig.churchLogo = data.logoPath;
                console.log("Logo uploaded and path saved:", globalConfig.churchLogo);
                saveConfigToLocalStorage();
                applyConfigChanges();
            } else {
                console.error("Error uploading logo:", data.message);
            }
        } catch (error) {
            console.error("Error uploading logo:", error);
        }
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
    updateLiedblatt();
    // Schließe das Konfigurationsmodal
    document.getElementById('config-modal').style.display = 'none';
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

export function showConfigModal() {
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
        currentLogoDiv.innerHTML = `<img src="${globalConfig.churchLogo}" alt="Aktuelles Logo" style="max-width: 100px; max-height: 100px;">`;
    } else {
        currentLogoDiv.innerHTML = 'Kein Logo ausgewählt';
    }
}

// Objekt- und Pool-Management
async function loadObjekte() {
    try {
        const neueObjekte = await authenticatedFetch('/api/objekte');
        console.log('Neue Objekte geladen:', neueObjekte);
        
        // Aktualisieren Sie die globale alleObjekte Liste
        alleObjekte = neueObjekte;
        
        // Aktualisieren Sie die ausgewählten Objekte
        updateSelectedItems(neueObjekte);
        
        // Aktualisieren Sie die Pool-Items
        filterPoolItems();
    } catch (error) {
        console.error('Fehler beim Laden der Objekte:', error);
        await customAlert('Fehler beim Laden der Objekte: ' + error.message);
    }
}

function updateSelectedItems(neueObjekte) {
    const selectedItems = document.querySelectorAll('.selected-item');
    selectedItems.forEach(selected => {
        const objektData = JSON.parse(selected.getAttribute('data-object'));
        const neuesObjekt = neueObjekte.find(obj => obj.id === objektData.id);
        
        if (neuesObjekt) {
            // Behalten Sie die lokalen Einstellungen bei
            const aktualisiertesDaten = {
                ...neuesObjekt,
                showTitle: objektData.showTitle,
                alternativePrefix: objektData.alternativePrefix,
                selectedStrophen: objektData.selectedStrophen,
                showNotes: objektData.showNotes,
                noteType: objektData.noteType
            };
            
            selected.setAttribute('data-object', JSON.stringify(aktualisiertesDaten));
            
            // Aktualisieren Sie den angezeigten Titel
            const titleSpan = selected.querySelector('.title-row span');
            if (titleSpan) {
                titleSpan.textContent = aktualisiertesDaten.alternativePrefix || aktualisiertesDaten.titel;
            }
        }
    });
    
    // Aktualisieren Sie das Liedblatt
    updateLiedblatt();
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

// Authentifizierung und Benutzerverwaltung
async function checkAuthToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
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
    } catch (error) {
        console.error('Fehler bei der Token-Überprüfung:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'index.html';
    }
}

function isSuperAdmin() {
    return localStorage.getItem('role') === 'super-admin';
}

// Beispiel für eine Superadmin-spezifische Funktion
function showSuperAdminControls() {
    if (isSuperAdmin()) {
        document.getElementById('super-admin-panel').style.display = 'block';
    }
}

// Fügen Sie Event-Listener für die Trenner-Optionen hinzu
document.querySelectorAll('.trenner-option').forEach(option => {
    option.addEventListener('click', () => addTrenner(option.dataset.type));
});

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function handleApiError(error) {
    if (error.status === 401 || error.status === 403) {
        alert('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
        logout();
    } else {
        console.error('API-Fehler:', error);
        alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    }
}

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

// Event-Handler für das Konfigurations-Formular
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

function setupEventListeners() {
    document.querySelector('.close').addEventListener('click', function() {
        const modal = document.getElementById('manage-modal');
        if (modal) {
            modal.style.display = 'none';
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
    
    const poolSearch = document.getElementById('poolSearch');
    const deleteLogoBtn = document.getElementById('deleteLogo');
    const filterTyp = document.getElementById('filterTyp');
    const generatePdf = document.getElementById('generate-pdf');
    const resetSessionBtn = document.getElementById('reset-session');
    const saveSessionBtn = document.getElementById('save-session');
    const saveAsTemplateBtn = document.getElementById('save-as-template');
    
    if (poolSearch) poolSearch.addEventListener('input', filterPoolItems);
    if (deleteLogoBtn) deleteLogoBtn.addEventListener('click', deleteLogo);
    if (filterTyp) filterTyp.addEventListener('change', filterPoolItems);
    if (generatePdf) generatePdf.addEventListener('click', generatePDF);
    if (resetSessionBtn) resetSessionBtn.addEventListener('click', resetSession);
    if (saveSessionBtn) saveSessionBtn.addEventListener('click', () => saveSession());
    if (saveAsTemplateBtn) saveAsTemplateBtn.addEventListener('click', saveCurrentSessionAsVorlage);
}

document.addEventListener('DOMContentLoaded', function() {
    loadConfigFromLocalStorage();
    setupEventListeners();
    loadUserInfo();
    initializeApp().catch(error => {
        console.error('Fehler beim Initialisieren der App:', error);
        customAlert('Fehler beim Initialisieren der App: ' + error.message);
    });
});


window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

export { 
    globalConfig,
    alleObjekte,
    getImagePath
};

window.addPageBreak = addPageBreak;
window.addFreierText = addFreierText;
window.addTrenner = addTrenner;
window.addCustomImage = addCustomImage;
window.showConfigModal = showConfigModal;
window.saveSession = saveSession;
window.closeModal = closeModal;
window.resetSession = resetSession;
window.saveCurrentSessionAsVorlage = saveCurrentSessionAsVorlage;
window.showSessionsAndVorlagen = showSessionsAndVorlagen;