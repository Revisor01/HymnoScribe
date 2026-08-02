'use strict';

const express = require('express');
const router = express.Router();

const { sendContactEmail } = require('../services/emailService');

// POST /contact
router.post('/contact', async (req, res) => {
    const { name, email, message, inquiryType, institution, purpose } = req.body;

    try {
        let emailContent = `
            <strong>Name:</strong> ${name}<br>
            <strong>E-Mail:</strong> ${email}<br>
            <strong>Anfragetyp:</strong> ${inquiryType}<br>
            <strong>Nachricht:</strong> ${message}<br>
        `;

        if (inquiryType === 'usage-request') {
            emailContent += `
            <strong>Institution/Organisation:</strong> ${institution}<br>
            <strong>Einsatzzweck:</strong> ${purpose}<br>
            `;
        }

        await sendContactEmail(email, emailContent);

        res.status(200).json({ message: 'Nachricht erfolgreich gesendet' });
    } catch (error) {
        console.error('Fehler beim Senden der Kontaktnachricht:', error);
        res.status(500).json({ error: 'Interner Serverfehler beim Senden der Nachricht' });
    }
});

module.exports = router;
