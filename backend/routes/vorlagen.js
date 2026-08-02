'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { pool } = require('../db/pool');
const { authenticateToken, checkRole } = require('../middleware/auth');

// POST /vorlagen
router.post('/vorlagen', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const { name, data } = req.body;
        const id = uuidv4();
        await pool.query('INSERT INTO vorlagen (id, name, data, institution_id) VALUES (?, ?, ?, ?)', [id, name, JSON.stringify(data), req.user.institution_id]);
        res.status(201).json({ id, message: 'Vorlage erfolgreich gespeichert' });
    } catch (error) {
        console.error('Fehler beim Speichern der Vorlage:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /vorlagen
router.get('/vorlagen', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM vorlagen WHERE institution_id = ?', [req.user.institution_id]);
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Vorlagen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// GET /vorlagen/:id
router.get('/vorlagen/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vorlagen WHERE id = ? AND institution_id = ?', [req.params.id, req.user.institution_id]);
        if (rows.length === 0) {
            res.status(404).json({ error: 'Vorlage nicht gefunden' });
        } else {
            res.json(rows[0]);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Vorlage:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// DELETE /vorlagen/:id
router.delete('/vorlagen/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM vorlagen WHERE id = ? AND institution_id = ?', [req.params.id, req.user.institution_id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Vorlage nicht gefunden' });
        } else {
            res.json({ message: 'Vorlage erfolgreich gelöscht' });
        }
    } catch (error) {
        console.error('Fehler beim Löschen der Vorlage:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

module.exports = router;
