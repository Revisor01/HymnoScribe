document.addEventListener('DOMContentLoaded', function() {
    const resetForm = document.getElementById('reset-password-form');
    resetForm.addEventListener('submit', handleResetPassword);
});

async function handleResetPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        await customAlert('Die Passwörter stimmen nicht überein.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        await customAlert('Ungültiger oder fehlender Token.');
        return;
    }

    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        });

        if (response.ok) {
            await customAlert('Ihr Passwort wurde erfolgreich zurückgesetzt. Sie werden zur Login-Seite weitergeleitet.');
            window.location.href = 'index.html';
        } else {
            const data = await response.json();
            await customAlert(data.error || 'Ein Fehler ist aufgetreten.');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        await customAlert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
}

function customAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('alert-modal');
        document.getElementById('alert-message').textContent = message;
        modal.style.display = 'block';
        
        document.getElementById('alert-ok').onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
}