// utils.js

export async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Authentifizierung und Benutzerverwaltung
export async function checkAuthToken() {
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

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

export async function loadUserInfo() {
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

export function translateRole(role) {
    switch (role) {
        case 'admin':
            return 'Admin';
        case 'user':
            return 'Nutzer:in';
        default:
            return role;
    }
}

export function updateUIBasedOnUserRole() {
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

// Hilfsfunktionen
export function getImagePath(objekt, imageType) {
    const basePath = ''; // Set this to your base path if needed, e.g., '/images/'
    let imagePath;
    
    // Bestimmen Sie den Bildpfad basierend auf dem Bildtyp
    if (imageType === 'notenbild') {
        imagePath = objekt.notenbild;
    } else if (imageType === 'notenbildMitText') {
        imagePath = objekt.notenbildMitText;
    } else if (imageType === 'logo') {
        imagePath = objekt.churchLogo;
    } else if (imageType === 'customImage') {
        imagePath = objekt.imagePath;
    }
    
    // Wenn kein Bildpfad gefunden wurde, geben Sie null zurück
    if (!imagePath) return null;
    
    // Entfernen Sie führende Schrägstriche
    imagePath = imagePath.replace(/^\/+/, '');
    
    // Fügen Sie den Basispfad hinzu und geben Sie den vollständigen Pfad zurück
    return basePath + imagePath;
}

export function customAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const messageEl = document.getElementById('modal-message');
        const okButton = document.getElementById('modal-ok');
        const cancelButton = document.getElementById('modal-cancel');
        
        if (!modal || !messageEl || !okButton || !cancelButton) {
            console.error('Modal elements not found');
            alert(message);  // Fallback to native alert
            resolve();
            return;
        }
        
        messageEl.textContent = message;
        okButton.textContent = 'OK';
        cancelButton.style.display = 'none';
        modal.style.display = 'block';
        
        okButton.onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
}

export function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const messageEl = document.getElementById('modal-message');
        const okButton = document.getElementById('modal-ok');
        const cancelButton = document.getElementById('modal-cancel');
        
        if (!modal || !messageEl || !okButton || !cancelButton) {
            console.error('Modal elements not found');
            const result = confirm(message);  // Fallback to native confirm
            resolve(result);
            return;
        }
        
        messageEl.textContent = message;
        okButton.textContent = 'Ja';
        cancelButton.style.display = 'inline-block';
        cancelButton.textContent = 'Nein';
        modal.style.display = 'block';
        
        okButton.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
        cancelButton.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}

export function customPrompt(message) {
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