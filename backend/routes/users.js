'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { pool } = require('../db/pool');
const { authenticateToken, authenticateAdmin, checkRole } = require('../middleware/auth');
const { passwordValidation, userCreateValidation, userUpdateValidation, changeEmailValidation, handleValidationErrors } = require('../middleware/validation');
const { sendNewUserWelcomeEmail, sendChangeEmailVerification } = require('../services/emailService');

// DELETE /admin/user/:id
router.delete('/admin/user/:id', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [users] = await conn.query('SELECT id, username, role, institution_id FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        const user = users[0];

        if (req.user.role !== 'super-admin' && req.user.institution_id !== user.institution_id) {
            await conn.rollback();
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Benutzers' });
        }

        if (user.role === 'admin') {
            const [otherAdmins] = await conn.query(
                'SELECT COUNT(*) as count FROM users WHERE institution_id = ? AND role = "admin" AND id != ?',
                [user.institution_id, id]
            );
            if (otherAdmins[0].count === 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Der letzte Admin einer Institution kann nicht gelöscht werden.' });
            }
        }

        await conn.query('DELETE FROM sessions WHERE id = ?', [id]);
        await conn.query('DELETE FROM users WHERE id = ?', [id]);

        await conn.commit();
        res.json({ message: 'Benutzer erfolgreich gelöscht', username: user.username, institution_id: user.institution_id });
    } catch (error) {
        await conn.rollback();
        console.error('Fehler beim Löschen des Benutzers:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Benutzers: ' + error.message });
    } finally {
        conn.release();
    }
});

// POST /admin/user
router.post('/admin/user', authenticateAdmin, userCreateValidation, handleValidationErrors, async (req, res) => {
    const { institution_id, username, email, role } = req.body;
    try {
        if (req.user.role === 'admin' && req.user.institution_id !== parseInt(institution_id)) {
            return res.status(403).json({ error: 'Keine Berechtigung für diese Institution' });
        }
        if (!institution_id || !username || !email || !role) {
            return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt sein' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const [result] = await pool.query(
            'INSERT INTO users (institution_id, username, email, role, reset_token, reset_token_expires, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [institution_id, username, email, role, resetToken, Date.now() + 3600000, '']
        );

        try {
            await sendNewUserWelcomeEmail(email, username, resetToken);
        } catch (emailError) {
            console.error('Fehler beim Senden der Willkommens-E-Mail:', emailError);
            await pool.query('DELETE FROM users WHERE id = ?', [result.insertId]);
            return res.status(500).json({ error: 'Fehler beim Senden der Willkommens-E-Mail. Benutzer wurde nicht erstellt.' });
        }

        res.status(201).json({ message: 'Benutzer erfolgreich erstellt', id: result.insertId });
    } catch (error) {
        console.error('Fehler beim Erstellen des Benutzers:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers', details: error.message });
    }
});

// GET /admin/users
router.get('/admin/users', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, institution_id, username, role FROM users');
        res.json(users);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer', details: error.message });
    }
});

// PUT /admin/users/:id
router.put('/admin/users/:id', authenticateToken, checkRole(['admin', 'super-admin']), userUpdateValidation, handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password } = req.body;

    try {
        let query = 'UPDATE users SET username = ?, email = ?, role = ?';
        let params = [username, email, role];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);

        res.json({ message: 'Benutzer erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Benutzers:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /admin/users/:id/password
router.put('/admin/users/:id/password', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
        res.json({ message: 'Passwort aktualisiert' });
    } catch (error) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /admin/users/:institutionId
router.get('/admin/users/:institutionId', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { institutionId } = req.params;
    try {
        if (req.user.role === 'admin' && req.user.institution_id !== parseInt(institutionId)) {
            return res.status(403).json({ error: 'Keine Berechtigung für diese Institution' });
        }
        const [users] = await pool.query('SELECT id, username, role, email FROM users WHERE institution_id = ?', [institutionId]);
        res.json(users);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /admin/user/:id
router.put('/admin/user/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        res.json({ message: 'Passwort erfolgreich aktualisiert' });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Passworts' });
    }
});

// PUT /admin/user/:id/change-password
router.put('/admin/user/:id/change-password', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /admin/user/:id/change-email
router.put('/admin/user/:id/change-email', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { id } = req.params;
    const { newEmail } = req.body;
    try {
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? AND id != ?', [newEmail, id]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' });
        }

        const verificationToken = crypto.randomBytes(20).toString('hex');
        await pool.query('UPDATE users SET pending_email = ?, verification_token = ? WHERE id = ?', [newEmail, verificationToken, id]);

        try {
            await sendChangeEmailVerification(newEmail, verificationToken);
            res.json({ message: 'E-Mail-Adresse erfolgreich geändert. Eine Verifizierungs-E-Mail wurde gesendet.' });
        } catch (emailError) {
            console.error('Fehler beim Senden der Verifizierungs-E-Mail:', emailError);
            res.json({
                message: 'E-Mail-Adresse erfolgreich geändert, aber die Verifizierungs-E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie den Administrator.',
                emailSendFailed: true
            });
        }
    } catch (error) {
        console.error('Fehler beim Ändern der E-Mail-Adresse:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /user/change-email
router.put('/user/change-email', authenticateToken, changeEmailValidation, handleValidationErrors, async (req, res) => {
    const { newEmail, password } = req.body;
    console.log('Changing email for user:', req.user.id, 'to:', newEmail);
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        const isValid = await bcrypt.compare(password, user[0].password);
        if (!isValid) {
            return res.status(400).json({ error: 'Falsches Passwort' });
        }
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? AND id != ?', [newEmail, req.user.id]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' });
        }

        const verificationToken = crypto.randomBytes(20).toString('hex');
        await pool.query('UPDATE users SET pending_email = ?, verification_token = ? WHERE id = ?', [newEmail, verificationToken, req.user.id]);

        try {
            await sendChangeEmailVerification(newEmail, verificationToken);
            res.json({ message: 'Bitte überprüfen Sie Ihr E-Mail-Postfach zur Verifizierung Ihrer neuen E-Mail-Adresse.' });
        } catch (emailError) {
            console.error('Fehler beim Senden der Verifizierungs-E-Mail:', emailError);
            res.json({
                message: 'E-Mail-Adresse erfolgreich geändert, aber die Verifizierungs-E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie den Administrator.',
                emailSendFailed: true
            });
        }
    } catch (error) {
        console.error('Fehler beim Ändern der E-Mail-Adresse:', error);
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

// POST /institution/users
router.post('/institution/users', authenticateAdmin, async (req, res) => {
    const { username, password, role, email } = req.body;
    if (role === 'super-admin') return res.status(403).json({ error: 'Keine Berechtigung' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (institution_id, username, password, role, email) VALUES (?, ?, ?, ?, ?)',
            [req.user.institution_id, username, hashedPassword, role, email]
        );
        res.status(201).json({ id: result.insertId, message: 'Benutzer erstellt' });
    } catch (error) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /institution/users
router.get('/institution/users', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role, email FROM users WHERE institution_id = ?', [req.user.institution_id]);
        res.json(users);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// DELETE /institution/users/:id
router.delete('/institution/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ? AND institution_id = ?',
            [req.params.id, req.user.institution_id]
        );
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Benutzer nicht gefunden' });
        } else {
            res.json({ message: 'Benutzer gelöscht' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /users/:id/password
router.put('/users/:id/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = parseInt(req.params.id);

    if (req.user.role !== 'admin' && req.user.role !== 'super-admin' && req.user.id !== userId) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    try {
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (user.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

        if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
            const isValid = await bcrypt.compare(currentPassword, user[0].password);
            if (!isValid) return res.status(400).json({ error: 'Aktuelles Passwort ist falsch' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        res.json({ message: 'Passwort aktualisiert' });
    } catch (error) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /users/change-password
router.put('/users/change-password', authenticateToken, passwordValidation, handleValidationErrors, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (user.length === 0) return res.status(404).json({ message: 'Benutzer nicht gefunden' });

        const isValid = await bcrypt.compare(currentPassword, user[0].password);
        if (!isValid) return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});

// PUT /user/change-password
router.put('/user/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (user.length === 0) return res.status(404).json({ message: 'Benutzer nicht gefunden' });

        const isValid = await bcrypt.compare(currentPassword, user[0].password);
        if (!isValid) return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});

// GET /user/info
router.get('/user/info', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role, institution_id, email, email_verified FROM users WHERE id = ?', [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }

        const user = users[0];
        delete user.password;

        res.json(user);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzerinformationen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /user/role
router.get('/user/role', authenticateToken, (req, res) => {
    try {
        res.json({ role: req.user.role });
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzerrolle:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /user/password
router.put('/user/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (user.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

        const isValid = await bcrypt.compare(currentPassword, user[0].password);
        if (!isValid) return res.status(400).json({ error: 'Aktuelles Passwort ist falsch' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /user/email
router.put('/user/email', authenticateToken, async (req, res) => {
    const { newEmail } = req.body;
    try {
        await pool.query('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.user.id]);
        res.json({ message: 'E-Mail erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern der E-Mail:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

module.exports = router;
