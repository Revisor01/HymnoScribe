document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const verificationMessage = document.getElementById('verification-message');
    
    if (!token) {
        verificationMessage.textContent = 'Ungültiger oder fehlender Token.';
        return;
    }
    
    try {
        const response = await fetch(`/api/verify-email?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
            if (data.alreadyVerified) {
                verificationMessage.textContent = 'Ihre E-Mail-Adresse wurde bereits verifiziert. Sie können sich jetzt anmelden.';
            } else {
                verificationMessage.textContent = 'Ihre E-Mail-Adresse wurde erfolgreich verifiziert. Sie können sich jetzt anmelden.';
            }
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000); // Redirect after 3 seconds
        } else {
            verificationMessage.textContent = data.error || 'Ein Fehler ist bei der Verifizierung aufgetreten.';
        }
    } catch (error) {
        console.error('Email verification error:', error);
        verificationMessage.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    }
});

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