'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { pool } = require('../db/pool');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { cleanupUnusedImages } = require('../services/imageCleanupService');

// Multer-Konfiguration fuer Objekte (Noten und Liturgie-Bilder)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath;
        if (req.body.typ === 'Liturgie') {
            uploadPath = path.join(__dirname, '..', 'uploads', 'liturgie');
        } else {
            uploadPath = path.join(__dirname, '..', 'uploads', 'noten');
        }
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const titel = req.body.titel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const suffix = file.fieldname === 'notenbild' ? '_ohne' : '';
        cb(null, `${titel}${suffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// POST /objekte
router.post('/objekte', authenticateToken, checkRole(['admin']), upload.fields([
    { name: 'notenbild', maxCount: 1 },
    { name: 'notenbildMitText', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Received object data:', req.body);
        console.log('Received files:', req.files);
        const { typ, titel, inhalt, strophen, copyright, melodie, refrain, institution_id } = req.body;
        const notenbild = req.files && req.files['notenbild']
            ? `/api/uploads/${path.relative(path.join(__dirname, '..', 'uploads'), req.files['notenbild'][0].path)}`
            : null;
        const notenbildMitText = req.files && req.files['notenbildMitText']
            ? `/api/uploads/${path.relative(path.join(__dirname, '..', 'uploads'), req.files['notenbildMitText'][0].path)}`
            : null;

        console.log('Prepared data:', { typ, titel, inhalt, strophen, notenbild, notenbildMitText, copyright, melodie, institution_id });

        const safeInhalt = inhalt === undefined ? null : inhalt;
        const safeStrophen = strophen === undefined ? null : strophen;

        const [result] = await pool.query(
            'INSERT INTO objekte (typ, titel, inhalt, notenbild, notenbildMitText, strophen, copyright, melodie, refrain, institution_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [typ, titel, safeInhalt, notenbild, notenbildMitText, safeStrophen, copyright, melodie, refrain, institution_id]
        );

        console.log('Database insert result:', result);

        res.status(201).json({ id: result.insertId, message: 'Objekt erfolgreich gespeichert' });
    } catch (error) {
        console.error('Detailed server error:', error);
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message, stack: error.stack });
    }
});

// GET /objekte
router.get('/objekte', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        let query = 'SELECT * FROM objekte';
        const params = [];
        if (req.user.role !== 'super-admin') {
            query += ' WHERE institution_id = ?';
            params.push(req.user.institution_id);
        }
        const [results] = await pool.query(query, params);
        console.log('Query results:', results);
        res.json(results);
    } catch (error) {
        console.error('Fehler beim Abrufen der Objekte:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /objekte/:id
router.put('/objekte/:id', authenticateToken, checkRole(['admin']), upload.fields([
    { name: 'notenbild', maxCount: 1 },
    { name: 'notenbildMitText', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { typ, titel, inhalt, strophen, copyright, melodie, refrain } = req.body;

        console.log('Empfangene Daten:', { id, typ, titel, inhalt, strophen, copyright, melodie });

        const [existingObjekt] = await pool.query('SELECT * FROM objekte WHERE id = ?', [id]);

        if (existingObjekt.length === 0) {
            return res.status(404).json({ message: 'Objekt nicht gefunden' });
        }

        let notenbild = existingObjekt[0].notenbild;
        let notenbildMitText = existingObjekt[0].notenbildMitText;

        if (req.files && req.files['notenbild']) {
            notenbild = `/api/uploads/${path.relative(path.join(__dirname, '..', 'uploads'), req.files['notenbild'][0].path)}`;
        }
        if (req.files && req.files['notenbildMitText']) {
            notenbildMitText = `/api/uploads/${path.relative(path.join(__dirname, '..', 'uploads'), req.files['notenbildMitText'][0].path)}`;
        }

        const query = 'UPDATE objekte SET typ = ?, titel = ?, inhalt = ?, strophen = ?, notenbild = ?, notenbildMitText = ?, copyright = ?, melodie = ?, refrain = ? WHERE id = ?';
        const params = [typ, titel, inhalt || null, strophen || null, notenbild, notenbildMitText, copyright, melodie || null, refrain || null, id];

        console.log('SQL Query:', query);
        console.log('SQL Params:', params);

        const [result] = await pool.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Objekt nicht gefunden' });
        }
        res.json({ message: 'Objekt erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Detaillierter Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message, stack: error.stack });
    }
});

// DELETE /objekte/:id
router.delete('/objekte/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM objekte WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Objekt nicht gefunden' });
        }
        console.log('Führe Bildbereinigung nach Objektlöschung durch...');
        await cleanupUnusedImages();

        res.json({ message: 'Objekt erfolgreich gelöscht und unbenutzte Bilder bereinigt' });
    } catch (error) {
        console.error('Fehler beim Löschen des Objekts und der Bildbereinigung: ', error);
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

module.exports = router;
