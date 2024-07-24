const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
    origin: process.env.URL.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const customImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'uploads', 'custom');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadCustomImage = multer({ storage: customImageStorage });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath;
        if (file.fieldname === 'logo') {
            uploadPath = path.join(__dirname, 'uploads', 'logos');
        } else if (file.fieldname === 'customImage') {
            uploadPath = path.join(__dirname, 'uploads', 'custom');
        } else if (req.body.typ === 'Liturgie') {
            uploadPath = path.join(__dirname, 'uploads', 'liturgie');
        } else {
            uploadPath = path.join(__dirname, 'uploads', 'noten');
        }
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        if (file.fieldname === 'logo') {
            cb(null, file.originalname);
        } else if (file.fieldname === 'customImage') {
            cb(null, Date.now() + '-' + file.originalname);
        } else {
            const titel = req.body.titel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const suffix = file.fieldname === 'notenbild' ? '_ohne' : '';
            cb(null, `${titel}${suffix}${path.extname(file.originalname)}`);
        }
    }
});

const upload = multer({ storage: storage });

const apiRouter = express.Router();

apiRouter.post('/upload-custom-image', uploadCustomImage.single('customImage'), (req, res) => {
    if (req.file) {
        const imagePath = `/api/uploads/custom/${req.file.filename}`;
        res.json({ success: true, imagePath });
    } else {
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

apiRouter.post('/upload-logo', upload.single('logo'), (req, res) => {
    if (req.file) {
        const logoPath = `/api/uploads/logos/${req.file.filename}`;
        console.log("Logo uploaded successfully:", logoPath);
        res.json({ success: true, logoPath });
    } else {
        console.log("No logo file received");
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

apiRouter.post('/objekte', upload.fields([
    { name: 'notenbild', maxCount: 1 },
    { name: 'notenbildMitText', maxCount: 1 }
]), async (req, res) => {
    try {
        const { typ, titel, inhalt, strophen, copyright } = req.body;
        const notenbild = req.files && req.files['notenbild'] 
            ? `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbild'][0].path)}`
            : null;
        const notenbildMitText = req.files && req.files['notenbildMitText']
            ? `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbildMitText'][0].path)}`
            : null;
        
        console.log('Prepared data:', { typ, titel, inhalt, strophen, notenbild, notenbildMitText, copyright });
        
        const safeInhalt = inhalt === undefined ? null : inhalt;
        const safeStrophen = strophen === undefined ? null : strophen;
        console.log('Received request body:', req.body);

        const [result] = await pool.query(
            'INSERT INTO objekte (typ, titel, inhalt, notenbild, notenbildMitText, strophen, copyright) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [typ, titel, safeInhalt, notenbild, notenbildMitText, safeStrophen, copyright]
        );

        console.log('Database insert result:', result);
        
        res.status(201).json({ id: result.insertId, message: 'Objekt erfolgreich gespeichert' });
    } catch (error) {
        console.error('Server-Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

apiRouter.get('/objekte', async (req, res) => {
    try {
        console.log('GET /objekte aufgerufen');
        const [results] = await pool.query('SELECT * FROM objekte');
        console.log('Abgerufene Objekte:', results);
        res.json(results);
    } catch (error) {
        console.error('Fehler beim Abrufen der Objekte: ', error);
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

apiRouter.put('/objekte/:id', upload.fields([
    { name: 'notenbild', maxCount: 1 },
    { name: 'notenbildMitText', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { typ, titel, inhalt, strophen, copyright } = req.body;
        
        console.log('Empfangene Daten:', { id, typ, titel, inhalt, strophen, copyright });
        
        const [existingObjekt] = await pool.query('SELECT * FROM objekte WHERE id = ?', [id]);
        
        if (existingObjekt.length === 0) {
            return res.status(404).json({ message: 'Objekt nicht gefunden' });
        }
        
        let notenbild = existingObjekt[0].notenbild;
        let notenbildMitText = existingObjekt[0].notenbildMitText;
        
        if (req.files && req.files['notenbild']) {
            notenbild = `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbild'][0].path)}`;
        }
        if (req.files && req.files['notenbildMitText']) {
            notenbildMitText = `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbildMitText'][0].path)}`;
        }
        
        const query = 'UPDATE objekte SET typ = ?, titel = ?, inhalt = ?, strophen = ?, notenbild = ?, notenbildMitText = ?, copyright = ? WHERE id = ?';
        const params = [typ, titel, inhalt || null, strophen || null, notenbild, notenbildMitText, copyright || null, id];
        
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

apiRouter.delete('/objekte/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM objekte WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Objekt nicht gefunden' });
        }
        res.json({ message: 'Objekt erfolgreich gelöscht' });
    } catch (error) {
        console.error('Fehler beim Löschen des Objekts: ', error);
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

apiRouter.post('/sessions', async (req, res) => {
    try {
        const { name, data } = req.body;
        const id = uuidv4();
        await pool.query('INSERT INTO sessions (id, name, data) VALUES (?, ?, ?)', [id, name, JSON.stringify(data)]);
        res.status(201).json({ id, message: 'Session erfolgreich gespeichert' });
    } catch (error) {
        console.error('Fehler beim Speichern der Session:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/sessions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, created_at FROM sessions ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Sessions:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/sessions/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            res.status(404).json({ error: 'Session nicht gefunden' });
        } else {
            console.log("Gefundene Session:", rows[0]);
            res.json(rows[0]);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Session:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.delete('/sessions/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM sessions WHERE id = ?', [req.params.id]);
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

apiRouter.post('/vorlagen', async (req, res) => {
    try {
        const { name, data } = req.body;
        const id = uuidv4();
        await pool.query('INSERT INTO vorlagen (id, name, data) VALUES (?, ?, ?)', [id, name, JSON.stringify(data)]);
        res.status(201).json({ id, message: 'Vorlage erfolgreich gespeichert' });
    } catch (error) {
        console.error('Fehler beim Speichern der Vorlage:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/vorlagen', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM vorlagen');
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Vorlagen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/vorlagen/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vorlagen WHERE id = ?', [req.params.id]);
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

apiRouter.delete('/vorlagen/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM vorlagen WHERE id = ?', [req.params.id]);
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

app.use('/api', apiRouter);

app.use('/api/icons', express.static(path.join(__dirname, 'icons')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/ttf', express.static(path.join(__dirname, 'ttf')));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

async function initializeDatabase() {
    try {
        const conn = await pool.getConnection();
        
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS objekte (
                id INT AUTO_INCREMENT PRIMARY KEY,
                typ VARCHAR(255) NOT NULL,
                titel VARCHAR(255) NOT NULL,
                inhalt LONGTEXT,
                notenbild VARCHAR(255),
                notenbildMitText VARCHAR(255),
                strophen JSON,
                copyright VARCHAR(255)
            )
        `);
        
        const [columns] = await conn.execute("SHOW COLUMNS FROM objekte LIKE 'copyright'");
        if (columns.length === 0) {
            await conn.execute("ALTER TABLE objekte ADD COLUMN copyright VARCHAR(255)");
            console.log('Copyright-Spalte zur objekte-Tabelle hinzugefügt.');
        }
        
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                data JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS vorlagen (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                data JSON NOT NULL
            )
        `);
        
        console.log('Datenbankstruktur überprüft und aktualisiert.');
        
        conn.release();
    } catch (error) {
        console.error('Fehler bei der Datenbankinitialisierung:', error);
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

initializeDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server läuft auf http://0.0.0.0:${PORT}`);
    });
}).catch(error => {
    console.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
});