'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { pool } = require('../db/pool');
const { authenticateToken, checkRole } = require('../middleware/auth');

// POST /sessions
router.post('/sessions', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const { name, data } = req.body;
        const id = uuidv4();
        await pool.query('INSERT INTO sessions (id, name, data, institution_id) VALUES (?, ?, ?, ?)', [id, name, JSON.stringify(data), req.user.institution_id]);
        res.status(201).json({ id, message: 'Session erfolgreich gespeichert' });
    } catch (error) {
        console.error('Fehler beim Speichern der Session:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /sessions
router.get('/sessions', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, created_at FROM sessions WHERE institution_id = ? ORDER BY created_at DESC', [req.user.institution_id]);
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Sessions:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /sessions/:id
router.get('/sessions/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ? AND institution_id = ?', [req.params.id, req.user.institution_id]);
        if (rows.length === 0) {
            res.status(404).json({ error: 'Session nicht gefunden' });
        } else {
            res.json(rows[0]);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Session:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// DELETE /sessions/:id
router.delete('/sessions/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM sessions WHERE id = ? AND institution_id = ?', [req.params.id, req.user.institution_id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Session nicht gefunden' });
        } else {
            res.json({ message: 'Session erfolgreich gelöscht' });
        }
    } catch (error) {
        console.error('Fehler beim Löschen der Session:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

module.exports = router;
