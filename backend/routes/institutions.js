'use strict';

const express = require('express');
const router = express.Router();

const { pool } = require('../db/pool');
const { authenticateToken, authenticateSuperAdmin, checkRole } = require('../middleware/auth');

// GET /admin/institution (Admin laedt seine eigene Institution)
router.get('/admin/institution', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const [institution] = await pool.query('SELECT id, name FROM institutions WHERE id = ?', [req.user.institution_id]);
        if (institution.length === 0) {
            return res.status(404).json({ error: 'Institution nicht gefunden' });
        }
        res.json(institution[0]);
    } catch (error) {
        console.error('Fehler beim Abrufen der Institution:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// POST /admin/institution (Super-Admin erstellt Institution)
router.post('/admin/institution', authenticateSuperAdmin, async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO institutions (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.insertId, name });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Erstellen der Institution' });
    }
});

// DELETE /admin/institution/:id (Super-Admin loescht Institution)
router.delete('/admin/institution/:id', authenticateSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [institutions] = await conn.query('SELECT * FROM institutions WHERE id = ?', [id]);
        if (institutions.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Institution nicht gefunden' });
        }

        await conn.query('DELETE FROM objekte WHERE institution_id = ?', [id]);
        await conn.query('DELETE FROM vorlagen WHERE institution_id = ?', [id]);
        await conn.query('DELETE FROM sessions WHERE institution_id = ?', [id]);
        await conn.query('DELETE FROM users WHERE institution_id = ?', [id]);
        await conn.query('DELETE FROM institutions WHERE id = ?', [id]);

        await conn.commit();
        res.json({ message: 'Institution und alle zugehörigen Daten erfolgreich gelöscht' });
    } catch (error) {
        await conn.rollback();
        console.error('Fehler beim Löschen der Institution:', error);
        res.status(500).json({ error: 'Fehler beim Löschen der Institution: ' + error.message });
    } finally {
        conn.release();
    }
});

// GET /admin/institutions
router.get('/admin/institutions', authenticateToken, checkRole(['admin', 'user', 'super-admin']), async (req, res) => {
    try {
        const [institutions] = await pool.query('SELECT * FROM institutions');
        res.json(institutions);
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Institutionen' });
    }
});

module.exports = router;
