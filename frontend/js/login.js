function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function customAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('alert-modal');
        document.getElementById('alert-message').textContent = message;
        showModal('alert-modal');
        
        document.getElementById('alert-ok').onclick = () => {
            hideModal('alert-modal');
            resolve();
        };
    });
}

function customPrompt(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('prompt-modal');
        document.getElementById('prompt-message').textContent = message;
        document.getElementById('prompt-input').value = '';
        showModal('prompt-modal');
        
        document.getElementById('prompt-ok').onclick = () => {
            const input = document.getElementById('prompt-input').value;
            hideModal('prompt-modal');
            resolve(input);
        };
        
        document.getElementById('prompt-cancel').onclick = () => {
            hideModal('prompt-modal');
            resolve(null);
        };
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const superLoginBtn = document.getElementById('super-login-btn');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const resendVerificationBtn = document.getElementById('resend-verification-btn');

    loginForm.addEventListener('submit', handleLogin);
    superLoginBtn.addEventListener('click', handleSuperLogin);
    forgotPasswordBtn.addEventListener('click', handleForgotPassword);
    resendVerificationBtn.addEventListener('click', handleResendVerification);

    // Password Reset Form
    document.getElementById('password-reset-form').addEventListener('submit', handlePasswordReset);
});

async function handleLogin(e) {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernameOrEmail, password }),
        });

        if (response.ok) {
            const { token, role } = await response.json();
            localStorage.setItem('token', token);
            localStorage.setItem('role', role);
            window.location.href = 'dashboard.html';
        } else {
            const { error } = await response.json();
            await customAlert(error);
        }
    } catch (error) {
        console.error('Login error:', error);
        await customAlert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
}

async function handleSuperLogin() {
    const superPassword = await customPrompt('Bitte geben Sie das Super-Passwort ein:');
    if (superPassword) {
        try {
            const response = await fetch('/api/super-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superPassword }),
            });
            
            if (response.ok) {
                const { token, role } = await response.json();
                localStorage.setItem('token', token);
                localStorage.setItem('role', role);
                window.location.href = 'admin.html';
            } else {
                await customAlert('Falsches Super-Passwort');
            }
        } catch (error) {
            console.error('Super-Login error:', error);
            await customAlert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }
    }
}

async function handleForgotPassword() {
    const email = await customPrompt('Bitte geben Sie Ihre E-Mail-Adresse ein:');
    if (email) {
        try {
            const response = await fetch('/api/request-password-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                await customAlert(data.message);
            } else {
                await customAlert(data.error || 'Ein Fehler ist aufgetreten.');
            }
        } catch (error) {
            console.error('Password reset request error:', error);
            await customAlert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }
    }
}

async function handleResendVerification() {
    const email = await customPrompt('Bitte geben Sie Ihre E-Mail-Adresse ein:');
    if (email) {
        try {
            const response = await fetch('/api/request-email-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                await customAlert('Eine neue Verifizierungs-E-Mail wurde gesendet.');
            } else {
                const { error } = await response.json();
                await customAlert(error);
            }
        } catch (error) {
            console.error('Email verification request error:', error);
            await customAlert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }
    }
}

async function handlePasswordReset(e) {
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
            await customAlert('Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt anmelden.');
            hideModal('password-reset-modal');
        } else {
            const { error } = await response.json();
            await customAlert(error);
        }
    } catch (error) {
        console.error('Password reset error:', error);
        await customAlert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
}

// Überprüfen Sie beim Laden der Seite, ob ein Passwort-Reset-Token vorhanden ist
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        showModal('password-reset-modal');
    }
});