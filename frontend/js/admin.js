import {
  authenticatedFetch,
  customAlert,
  customConfirm,
  customPrompt,
  getImagePath
} from './utils.js';

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadInstitutions();
});

function initializeApp() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    checkUserRole();
    setupEventListeners();
}

function setupEventListeners() {
    // Formular und Button Listener
    document.getElementById('add-user-form').addEventListener('submit', addUser);
    document.getElementById('add-institution-form').addEventListener('submit', addInstitution);
    document.getElementById('change-password-btn').addEventListener('click', changePassword);
    document.getElementById('change-email-btn').addEventListener('click', changeEmail);
    document.getElementById('change-email-btn').addEventListener('click', changeEmail);
    document.getElementById('change-email-btn').addEventListener('click', changeEmail);
    document.getElementById('resend-verification-btn').addEventListener('click', handleResendVerification);
    
    // Modal Listener
    document.querySelectorAll('.close').forEach(elem => {
        elem.addEventListener('click', () => closeAllModals());
    });
    document.getElementById('modal-confirm').addEventListener('click', closeAllModals);
    document.getElementById('modal-cancel').addEventListener('click', closeAllModals);
    document.getElementById('add-user-btn').addEventListener('click', () => openModal('add-user-modal'));
    document.getElementById('add-institution-btn').addEventListener('click', () => openModal('add-institution-modal'));
    
    // Institution Select Listener
    document.getElementById('institution-select').addEventListener('change', function() {
        const selectedInstitutionId = this.value;
        if (selectedInstitutionId) {
            loadUsersForInstitution(selectedInstitutionId);
        }
    });
    
    // Users List Listener
    document.getElementById('users-list').addEventListener('click', handleUserActions);
    
    // Logout Listener
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('logout-btnHam').addEventListener('click', logout);
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


function handleUserActions(event) {
  const target = event.target;
  if (target.classList.contains('change-password')) {
    const userId = target.getAttribute('data-userid');
    changeUserPassword(userId);
  } else if (target.classList.contains('change-email')) {
    const userId = target.getAttribute('data-userid');
    changeUserEmail(userId);
  } else if (target.classList.contains('delete-user')) {
    const userId = target.getAttribute('data-userid');
    const username = target.getAttribute('data-username');
    const institutionId = target.getAttribute('data-institutionid');
    deleteUser(userId, username, institutionId);
  }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

async function checkUserRole() {
    try {
        const response = await fetch('/api/user/role', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data || !data.role) {
            throw new Error('Unerwartetes Antwortformat');
        }
        
        showRoleBasedView(data.role);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzerrolle:', error);
        // Hier können Sie eine Benutzerbenachrichtigung hinzufügen oder zur Login-Seite umleiten
        window.location.href = 'index.html';
    }
}

function showRoleBasedView(role) {
    document.getElementById('user-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'none';
    document.getElementById('super-admin-section').style.display = 'none';
    
    switch(role) {
        case 'user':
            document.getElementById('user-section').style.display = 'block';
            loadUserInfo();
            break;
        case 'admin':
            document.getElementById('user-section').style.display = 'block';
            document.getElementById('admin-section').style.display = 'block';
            loadUserInfo();
            loadInstitutionForAdmin();
            break;
        case 'super-admin':
            document.getElementById('user-section').style.display = 'none';
            document.getElementById('admin-section').style.display = 'block';
            document.getElementById('super-admin-section').style.display = 'block';
            loadUserInfo();
            loadInstitutions();
            break;
    }
}

async function loadInstitutionForAdmin() {
    try {
        const response = await fetchWithLogging('/api/admin/institution', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.id) {
            document.getElementById('institution-select').innerHTML = `<option value="${response.id}">${response.name}</option>`;
            loadUsersForInstitution(response.id);
        } else {
            console.error('Unerwartetes Antwortformat:', response);
            showModal('Fehler beim Laden der Institution: Unerwartetes Datenformat');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showModal('Fehler beim Laden der Institution: ' + error.message);
    }
}

async function fetchWithLogging(url, options = {}) {
    try {
        const response = await fetch(url, options);
        console.log('Response status for', url, ':', response.status);
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                const json = await response.json();
                console.log('Response JSON for', url, ':', json);
                return json;
            } catch (parseError) {
                console.error('Error parsing JSON for', url, ':', parseError);
                const text = await response.text();
                console.log('Raw response text:', text);
                throw parseError;
            }
        } else {
            const text = await response.text();
            console.log('Response text for', url, ':', text);
            return text;
        }
    } catch (error) {
        console.error('Error fetching', url, ':', error);
        throw error;
    }
}

async function loadUserInfo() {
    try {
        const response = await fetchWithLogging('/api/user/info', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        displayUserInfo(response);
    } catch (error) {
        console.error('Fehler beim Laden der Benutzerinformationen:', error);
    }
}

function displayUserInfo(userInfo) {
    const userInfoDiv = document.getElementById('user-info');
    userInfoDiv.innerHTML = `
        <p><strong>Benutzername:</strong> ${userInfo.username}</p>
        <p><strong>E-Mail:</strong> ${userInfo.email || 'Nicht angegeben'} <em>(${translateMail(userInfo.email_verified)})</em></p>
        <p><strong>Rolle:</strong> ${translateRole(userInfo.role)}</p>
    `;
    
  const resendVerificationBtn = document.getElementById('resend-verification-btn');
  if (resendVerificationBtn) {
      resendVerificationBtn.style.display = userInfo.email_verified ? 'none' : 'inline-block';
}
}

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

function translateMail(mail) {
    switch (String(mail)) { // Convert mail to string for comparison
        case '0':
            return 'nicht verifiziert';
        case '1':
            return 'verifiziert';
        default:
            return mail;
    }
}

async function loadInstitutions() {
  try {
    const response = await fetchWithLogging('/api/admin/institutions', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (Array.isArray(response) && response.length > 0) {
      displayInstitutions(response);
      updateInstitutionSelect(response);
    } else {
      console.warn('Keine Institutionen gefunden oder leere Antwort erhalten');
      displayInstitutions([]);
      updateInstitutionSelect([]);
    }
  } catch (error) {
    console.error('Fehler beim Laden der Institutionen:', error);
    await customAlert('Fehler beim Laden der Institutionen: ' + error.message);
  }
}

function displayInstitutions(institutions) {
  const list = document.getElementById('institutions-list');
  list.innerHTML = '<h3>Institutionen</h3>';
  institutions.forEach(institution => {
    const li = document.createElement('div');
    li.className = 'institution-item';
    li.innerHTML = `
      <span class="institution-name" onclick="loadUsersForInstitution(${institution.id})">${institution.name}</span>
      <div class="buttons">
        <button onclick="deleteInstitution(${institution.id}, '${institution.name}')" class="btn btn-danger btn-small">Löschen</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function updateInstitutionSelect(institutions) {
  const selects = document.querySelectorAll('#institution-select');
  if (selects.length === 0) {
    console.warn('Kein Element mit der ID "institution-select" gefunden');
    return;
  }
  selects.forEach(select => {
    select.innerHTML = '<option value="">Institution auswählen</option>';
    institutions.forEach(institution => {
      const option = document.createElement('option');
      option.value = institution.id;
      option.textContent = institution.name;
      select.appendChild(option);
    });
  });
}

async function addInstitution(event) {
    event.preventDefault();
    const name = document.getElementById('new-institution-name').value;
    try {
        const response = await fetchWithLogging('/api/admin/institution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name })
        });
        if (response.error) {
            throw new Error(response.error);
        }
        closeAllModals();
        loadInstitutions();
        showModal('Institution erfolgreich angelegt.', null, 'Erfolg');
    } catch (error) {
        console.error('Fehler:', error);
        showModal('Fehler beim Anlegen der Institution: ' + error.message, null, 'Fehler');
    }
}

async function deleteInstitution(id, name) {
    showModal(
        `Sind Sie sicher, dass Sie die Institution <b>${name}</b> löschen möchten? Alle zugehörigen Objekte und Nutzer:innen werden ebenfalls gelöscht.`,
        async () => {
            try {
                const response = await fetchWithLogging(`/api/admin/institution/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.error) {
                    throw new Error(response.error);
                }
                loadInstitutions();
                showModal(`Institution ${name} erfolgreich gelöscht`, null, 'Erfolg');
            } catch (error) {
                console.error('Fehler:', error);
                showModal(error.message, null, 'Fehler');
            }
        },
        'Institution löschen'
    );
}

async function loadUsersForInstitution(institutionId) {
  try {
    const response = await fetchWithLogging(`/api/admin/users/${institutionId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (Array.isArray(response)) {
      displayUsers(response);
    } else {
      throw new Error('Unerwartetes Antwortformat');
    }
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer:', error);
    await customAlert('Fehler beim Laden der Benutzer: ' + error.message);
  }
}

function displayUsers(users) {
  const usersList = document.getElementById('users-list');
  usersList.innerHTML = '<h3>Benutzer:innen</h3>';
  if (Array.isArray(users)) {
    users.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.className = 'user-item';
      userDiv.innerHTML = `
        <span>${user.username} - ${user.email} (${user.role})</span>
        <div class="buttons">
          <button class="btn btn-small change-password" data-userid="${user.id}">Passwort ändern</button>
          <button class="btn btn-small change-email" data-userid="${user.id}">E-Mail ändern</button>
          <button class="btn btn-danger btn-small delete-user" data-userid="${user.id}" data-username="${user.username}" data-institutionid="${user.institution_id}">Löschen</button>
        </div>
      `;
      usersList.appendChild(userDiv);
    });
  } else {
    usersList.innerHTML += '<p>Keine Benutzer gefunden oder Fehler beim Laden der Benutzer.</p>';
  }
}

async function addUser(event) {
  event.preventDefault();
  const username = document.getElementById('new-username').value;
  const email = document.getElementById('new-email').value;
  const role = document.getElementById('new-role').value;
  let institution_id;
  
  const userRole = localStorage.getItem('role');
  if (userRole === 'admin') {
    // Für normale Admins verwenden wir ihre eigene Institution
    const userInfo = await fetchWithLogging('/api/user/info', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    institution_id = userInfo.institution_id;
  } else {
    // Für Superadmins verwenden wir die ausgewählte Institution
    institution_id = document.getElementById('institution-select').value;
  }
  
  if (!institution_id) {
    await customAlert('Bitte wählen Sie eine Institution aus oder stellen Sie sicher, dass Sie einer Institution zugeordnet sind.');
    return;
  }
  
  try {
    const response = await fetchWithLogging('/api/admin/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ institution_id, username, email, role })
    });
    if (response.error) {
      throw new Error(response.error);
    }
    closeAllModals();
    if (userRole === 'admin') {
      loadUsersForInstitution(institution_id);
    } else {
      loadUsersForInstitution(institution_id);
    }
    showModal('Nutzer/in erfolgreich angelegt.', null, 'Erfolg');
  } catch (error) {
    console.error('Fehler:', error);
    showModal('Fehler beim Anlegen des/der Nutzers/in: ' + error.message, null, 'Fehler');
  }
}

async function deleteUser(id, username) {
  console.log(`Attempting to delete user: ID=${id}, Username=${username}`);
  showModal(
    `Sind Sie sicher, dass Sie den/die Nutzer/in <b>${username}</b> löschen möchten? Alle Sessions des/der Nutzer/in werden gelöscht. Erstellte Vorlagen bleiben erhalten.`,
    async () => {
      try {
        const response = await fetchWithLogging(`/api/admin/user/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('Delete user response:', response);
        
        if (response.error) {
          throw new Error(response.error);
        }
        showModal(`Nutzer/in ${username} erfolgreich gelöscht`, null, 'Erfolg');
        console.log(`Reloading users for institution: ${response.institution_id}`);
        await loadUsersForInstitution(response.institution_id);
      } catch (error) {
        console.error('Fehler:', error);
        showModal(error.message, null, 'Fehler beim Löschen');
      }
    },
    'Nutzer/in löschen',
    'delete'
  );
}

async function handleResendVerification() {
    try {
        // Hole aktuelle Benutzerinformationen vom Server
        const userInfo = await fetchWithLogging('/api/user/info', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!userInfo.email) {
            throw new Error('Keine E-Mail-Adresse für diesen Benutzer gefunden.');
        }
        
        if (userInfo.email_verified) {
            showModal('Ihre E-Mail-Adresse ist bereits verifiziert.', null, 'Information');
            return;
        }
        
        const response = await fetchWithLogging('/api/request-email-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ email: userInfo.email })
        });
        
        if (response.message) {
            showModal(response.message, null, 'Erfolg');
            // Aktualisiere die Benutzerinformationen nach erfolgreicher Anforderung
            loadUserInfo();
        } else {
            throw new Error(response.error || 'Ein unerwarteter Fehler ist aufgetreten.');
        }
    } catch (error) {
        console.error('Fehler beim Senden der Verifizierungs-E-Mail:', error);
        showModal(`Fehler: ${error.message}`, null, 'Fehler');
    }
}

async function changeUserPassword(userId) {
    showModal(
        `
        <form id="change-user-password-form">
            <input type="password" id="new-user-password" placeholder="Neues Passwort" required>
            <input type="password" id="confirm-user-password" placeholder="Passwort bestätigen" required>
        </form>
        `,
        async () => {
            const newPassword = document.getElementById('new-user-password').value;
            const confirmPassword = document.getElementById('confirm-user-password').value;
            
            if (newPassword !== confirmPassword) {
                showModal('Die Passwörter stimmen nicht überein.', null, 'Fehler');
                return;
            }
            
            try {
                const response = await fetchWithLogging(`/api/admin/user/${userId}/change-password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ newPassword })
                });
                if (response.error) {
                    throw new Error(response.error);
                }
                showModal('Passwort erfolgreich geändert.', null, 'Erfolg');
            } catch (error) {
                console.error('Fehler:', error);
                showModal('Fehler beim Ändern des Passworts: ' + error.message, null, 'Fehler');
            }
        },
        'Benutzer-Passwort ändern'
    );
}

async function changeUserEmail(userId) {
    showModal(
        `
        <form id="change-user-email-form">
            <input type="email" id="new-user-email" placeholder="Neue E-Mail-Adresse" required>
        </form>
        `,
        async () => {
            const newEmail = document.getElementById('new-user-email').value;
            
          try {
            const response = await fetchWithLogging(`/api/admin/user/${userId}/change-email`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ newEmail })
            });
            if (response.error) {
              throw new Error(response.error);
            }
            if (response.emailSendFailed) {
              showModal(response.message, null, 'Warnung');
            } else {
              showModal(response.message, null, 'Erfolg');
            }
            loadUsersForInstitution(document.getElementById('institution-select').value);
          } catch (error) {
            console.error('Fehler:', error);
            showModal('Fehler beim Ändern der E-Mail-Adresse: ' + error.message, null, 'Fehler');
          }
        },
        'Benutzer-E-Mail ändern'
    );
}

function changePassword() {
    showModal(
        `
        <form id="change-password-form">
            <input type="password" id="current-password" placeholder="Aktuelles Passwort" required>
            <input type="password" id="new-password" placeholder="Neues Passwort" required>
            <input type="password" id="confirm-password" placeholder="Passwort bestätigen" required>
        </form>
        `,
        async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (newPassword !== confirmPassword) {
                showModal('Die neuen Passwörter stimmen nicht überein.', null, 'Fehler');
                return;
            }
            
            try {
                const response = await fetchWithLogging('/api/user/change-password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                if (response.error) {
                    throw new Error(response.error);
                }
                showModal('Passwort erfolgreich geändert.', null, 'Erfolg');
            } catch (error) {
                console.error('Fehler:', error);
                showModal('Fehler beim Ändern des Passworts: ' + error.message, null, 'Fehler');
            }
        },
        'Passwort ändern'
    );
}

function changeEmail() {
    showModal(
        `
        <form id="change-email-form">
            <input type="email" id="new-email" placeholder="Neue E-Mail-Adresse" required>
            <input type="password" id="password" placeholder="Passwort zur Bestätigung" required>
        </form>
        `,
        async () => {
            const newEmail = document.getElementById('new-email').value;
            const password = document.getElementById('password').value;
            
          try {
            const response = await fetchWithLogging('/api/user/change-email', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ newEmail, password })
            });
            if (response.error) {
              throw new Error(response.error);
            }
            if (response.emailSendFailed) {
              showModal(response.message, null, 'Warnung');
            } else {
              showModal(response.message, null, 'Erfolg');
            }
            loadUserInfo();
          } catch (error) {
            console.error('Fehler:', error);
            showModal('Fehler beim Ändern der E-Mail-Adresse: ' + error.message, null, 'Fehler');
          }
        },
        'E-Mail ändern'
    );
}

function showModal(message, confirmCallback = null, title = '', action = 'confirm') {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;
    modal.style.display = 'block';
    
    if (confirmCallback) {
        modalConfirm.style.display = 'inline-block';
        modalCancel.style.display = 'inline-block';
        
        if (action === 'delete') {
            modalConfirm.textContent = 'Löschen';
            modalConfirm.className = 'btn btn-danger';
        } else {
            modalConfirm.textContent = 'Bestätigen';
            modalConfirm.className = 'btn btn-primary';
        }
        modalCancel.textContent = 'Abbrechen';
        modalCancel.className = 'btn btn-secondary';
        
        modalConfirm.onclick = () => {
            confirmCallback();
            modal.style.display = 'none';
        };
        modalCancel.onclick = () => {
            modal.style.display = 'none';
        };
    } else {
        modalConfirm.style.display = 'inline-block';
        modalCancel.style.display = 'none';
        modalConfirm.textContent = 'OK';
        modalConfirm.className = 'btn btn-primary';
        modalConfirm.onclick = () => {
            modal.style.display = 'none';
        };
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
    if (modalId === 'add-user-modal') {
      const userRole = localStorage.getItem('role');
      const institutionSelect = document.getElementById('institution-select');
      if (userRole === 'admin') {
        institutionSelect.style.display = 'none';
      } else {
        institutionSelect.style.display = 'block';
        loadInstitutions(); // Dies wird das Dropdown füllen
      }
    }
  }
}

// Schließen des Modals, wenn außerhalb geklickt wird
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

window.deleteInstitution = deleteInstitution;
window.loadUsersForInstitution = loadUsersForInstitution;