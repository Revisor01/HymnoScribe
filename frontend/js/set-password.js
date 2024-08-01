document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const action = urlParams.get('action');

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        if (action === 'reset') {
            pageTitle.textContent = 'Passwort zurücksetzen';
        } else {
            pageTitle.textContent = 'Passwort festlegen';
        }
    }

    const form = document.getElementById('set-password-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirm-password');

            if (!password || !confirmPassword) {
                await customAlert('Formularfelder nicht gefunden.');
                return;
            }

            if (password.value !== confirmPassword.value) {
                await customAlert('Die Passwörter stimmen nicht überein.');
                return;
            }

            try {
                const response = await fetch('/api/set-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, newPassword: password.value }),
                });

                if (response.ok) {
                    await customAlert('Ihr Passwort wurde erfolgreich festgelegt. Sie können sich jetzt anmelden.');
                    window.location.href = 'index.html';
                } else {
                    const { error } = await response.json();
                    await customAlert(error);
                }
            } catch (error) {
                console.error('Error setting password:', error);
                await customAlert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
            }
        });
    }
});

function customAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('alert-modal');
        const messageElement = document.getElementById('alert-message');
        if (modal && messageElement) {
            messageElement.textContent = message;
            modal.style.display = 'block';
            
            const okButton = document.getElementById('alert-ok');
            if (okButton) {
                okButton.onclick = () => {
                    modal.style.display = 'none';
                    resolve();
                };
            }
        } else {
            console.error('Alert modal elements not found');
            alert(message);
            resolve();
        }
    });
}