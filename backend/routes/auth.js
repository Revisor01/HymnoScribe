'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { pool } = require('../db/pool');
const { loginLimiter, resetLimiter, verificationLimiter, superLoginLimiter } = require('../middleware/rateLimits');
const { loginValidation, emailValidation, passwordValidation, handleValidationErrors } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail, sendEmailVerification } = require('../services/emailService');

// POST /login
router.post('/login', loginLimiter, loginValidation, handleValidationErrors, async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ?', [usernameOrEmail, usernameOrEmail]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Benutzer nicht gefunden' });
        }
        const user = users[0];
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, role: user.role, institution_id: user.institution_id }, process.env.JWT_SECRET, { expiresIn: '3h' });
            res.json({ token, role: user.role });
        } else {
            res.status(400).json({ error: 'Falsches Passwort' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /verify-token
router.get('/verify-token', authenticateToken, (req, res) => {
    res.sendStatus(200);
});

// POST /super-login
router.post('/super-login', superLoginLimiter, async (req, res) => {
    console.log('Super-login attempt received');
    const { superPassword } = req.body;
    if (superPassword === process.env.SUPER_PASSWORD) {
        console.log('Super-login successful');
        const token = jwt.sign({ role: 'super-admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: 'super-admin' });
    } else {
        res.status(401).json({ error: 'Ungültiges Super-Passwort' });
    }
});

// POST /request-password-reset
router.post('/request-password-reset', resetLimiter, emailValidation, handleValidationErrors, async (req, res) => {
    const { email } = req.body;
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (user.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

        const resetToken = crypto.randomBytes(20).toString('hex');
        await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, Date.now() + 3600000, user[0].id]);

        await sendPasswordResetEmail(email, resetToken);

        res.json({ message: 'E-Mail zum Zurücksetzen des Passworts wurde gesendet' });
    } catch (error) {
        console.error('Fehler beim Senden der Passwort-Reset-E-Mail:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// POST /reset-password
router.post('/reset-password', resetLimiter, passwordValidation, handleValidationErrors, async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, Date.now()]);
        if (user.length === 0) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, user[0].id]);

        res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
    } catch (error) {
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// POST /set-password
router.post('/set-password', resetLimiter, passwordValidation, handleValidationErrors, async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, Date.now()]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ?, email_verified = TRUE, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, users[0].id]);

        res.json({ message: 'Passwort erfolgreich festgelegt' });
    } catch (error) {
        console.error('Fehler beim Festlegen des Passworts:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// POST /request-email-verification
router.post('/request-email-verification', verificationLimiter, emailValidation, handleValidationErrors, async (req, res) => {
    const { email } = req.body;
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }

        if (user[0].email_verified) {
            return res.status(400).json({ error: 'E-Mail-Adresse ist bereits verifiziert' });
        }

        const verificationToken = crypto.randomBytes(20).toString('hex');
        await pool.query('UPDATE users SET verification_token = ? WHERE id = ?', [verificationToken, user[0].id]);

        await sendEmailVerification(email, verificationToken);

        res.json({ message: 'Verifizierungs-E-Mail wurde gesendet' });
    } catch (error) {
        console.error('Fehler beim Senden der Verifizierungs-E-Mail:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// POST /verify-email (Token im Body)
router.post('/verify-email', verificationLimiter, async (req, res) => {
    const { token } = req.body;
    try {
        const [result] = await pool.query('UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE verification_token = ?', [token]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: 'Ungültiger Verifizierungstoken' });
        }

        res.json({ message: 'E-Mail-Adresse erfolgreich verifiziert' });
    } catch (error) {
        console.error('Fehler bei der E-Mail-Verifizierung:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /verify-email (Token als Query-Parameter)
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE verification_token = ?', [token]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Ungültiger Token' });
        }
        const user = users[0];

        if (user.email_verified && !user.pending_email) {
            return res.json({ message: 'E-Mail-Adresse wurde bereits verifiziert', alreadyVerified: true });
        }

        if (user.pending_email) {
            // Es gibt eine neue E-Mail-Adresse zu verifizieren
            await pool.query(`
                UPDATE users
                SET old_email = email,
                    email = pending_email,
                    pending_email = NULL,
                    email_verified = TRUE,
                    old_email_verified = email_verified,
                    verification_token = NULL
                WHERE id = ?
            `, [user.id]);
        } else {
            // Die bestehende E-Mail-Adresse wird verifiziert
            await pool.query(`
                UPDATE users
                SET email_verified = TRUE,
                    verification_token = NULL
                WHERE id = ?
            `, [user.id]);
        }

        res.json({ message: 'E-Mail-Adresse erfolgreich verifiziert', alreadyVerified: false });
    } catch (error) {
        console.error('Fehler bei der E-Mail-Verifizierung:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

module.exports = router;
