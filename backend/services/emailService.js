const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Template-Dateien liegen in backend/ — ein Verzeichnis über diesem Modul
function getEmailTemplate() {
    return fs.readFileSync(path.join(__dirname, '..', 'email-template.html'), 'utf8');
}

function getContactEmailTemplate() {
    return fs.readFileSync(path.join(__dirname, '..', 'contact-email-template.html'), 'utf8');
}

function renderEmailTemplate(template, data) {
    let renderedTemplate = template;
    for (const key in data) {
        const regex = new RegExp(`\\[${key}\\]`, 'g');
        renderedTemplate = renderedTemplate.replace(regex, data[key]);
    }

    return renderedTemplate.replace('[LOGO_URL]', process.env.LOGO_URL);
}

// Transporter mit aktiver TLS-Validierung (kein rejectUnauthorized-Override)
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });
}

async function sendPasswordResetEmail(email, resetToken) {
    const transporter = createTransporter();
    const template = getEmailTemplate();

    const renderedTemplate = renderEmailTemplate(template, {
        Name: email,
        Hauptinhalt: `
            <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für Ihren HymnoScribe-Account gestellt.</p>
            <p>Bitte klicken Sie auf den folgenden Button, um Ihr Passwort zurückzusetzen:</p>
        `,
        ButtonText: 'Passwort zurücksetzen',
        ButtonUrl: `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Passwort zurücksetzen für HymnoScribe',
            html: renderedTemplate
        });
        console.log('Password reset email sent successfully');
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
}

// Neue Funktion zum Senden der E-Mail-Änderungsverifizierung
async function sendChangeEmailVerification(email, verificationToken) {
    const transporter = createTransporter();
    const template = getEmailTemplate();

    const renderedTemplate = renderEmailTemplate(template, {
        Name: email,
        Hauptinhalt: `
            <p>Sie haben eine Anfrage zur Änderung Ihrer E-Mail-Adresse für Ihren HymnoScribe-Account gestellt.</p>
            <p>Bitte klicken Sie auf den folgenden Button, um Ihre neue E-Mail-Adresse zu verifizieren:</p>
        `,
        ButtonText: 'E-Mail-Adresse verifizieren',
        ButtonUrl: `${process.env.FRONTEND_URL}/verify-email.html?token=${verificationToken}`
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'E-Mail-Verifizierung für HymnoScribe',
            html: renderedTemplate
        });
        console.log('Change email verification sent successfully');
    } catch (error) {
        console.error('Error sending change email verification:', error);
        throw error;
    }
}

async function sendEmailVerification(email, verificationToken) {
    const transporter = createTransporter();
    const template = getEmailTemplate();

    const renderedTemplate = renderEmailTemplate(template, {
        Name: email,
        Hauptinhalt: `
            <p>Vielen Dank für Ihre Registrierung bei HymnoScribe.</p>
            <p>Bitte klicken Sie auf den folgenden Button, um Ihre E-Mail-Adresse zu verifizieren:</p>
        `,
        ButtonText: 'E-Mail verifizieren',
        ButtonUrl: `${process.env.FRONTEND_URL}/verify-email.html?token=${verificationToken}`
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'E-Mail-Verifizierung für HymnoScribe',
            html: renderedTemplate
        });
        console.log('Verification email sent successfully');
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
}

async function sendNewUserWelcomeEmail(email, username, resetToken) {
    const transporter = createTransporter();
    const template = getEmailTemplate();

    const renderedTemplate = renderEmailTemplate(template, {
        Name: username,
        Hauptinhalt: `
            <p>Willkommen bei HymnoScribe! Für Sie wurde ein Account angelegt.</p>
            <p><strong>Benutzername:</strong> ${username}</p>
            <p><strong>E-Mail:</strong> ${email}</p>
            <p>Bitte klicken Sie auf den folgenden Button, um Ihr Passwort festzulegen:</p>
        `,
        ButtonText: 'Passwort festlegen',
        ButtonUrl: `${process.env.FRONTEND_URL}/set-password.html?token=${resetToken}`
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Willkommen bei HymnoScribe',
            html: renderedTemplate
        });
        console.log('Welcome email sent successfully');
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw error;
    }
}

async function sendContactEmail(senderEmail, content) {
    const transporter = createTransporter();
    const template = getContactEmailTemplate();

    const renderedTemplate = renderEmailTemplate(template, {
        Hauptinhalt: content,
        ButtonText: 'Antworten',
        ButtonUrl: `mailto:${senderEmail}`
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.CONTACT_EMAIL || process.env.EMAIL_FROM,
            subject: `Neue Kontaktanfrage: ${senderEmail}`,
            html: renderedTemplate,
            replyTo: senderEmail
        });
        console.log('Contact email sent successfully');
    } catch (error) {
        console.error('Error sending contact email:', error);
        throw error;
    }
}

module.exports = {
    sendPasswordResetEmail,
    sendEmailVerification,
    sendNewUserWelcomeEmail,
    sendContactEmail,
    sendChangeEmailVerification
};
