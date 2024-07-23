const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    console.log(`Received request for: ${req.url}`);
    next();
});

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

app.post('/upload-custom-image', uploadCustomImage.single('customImage'), (req, res) => {
    if (req.file) {
        const imagePath = `/uploads/custom/${req.file.filename}`;
        res.json({ success: true, imagePath });
    } else {
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

// Multer-Setup für das Hochladen von Dateien
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
            // Für Logo-Uploads behalten wir den Originalnamen bei
            cb(null, file.originalname);
        } else if (file.fieldname === 'customImage') {
            // Für benutzerdefinierte Bilder verwenden wir einen Zeitstempel
            cb(null, Date.now() + '-' + file.originalname);
        } else {
            const titel = req.body.titel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const suffix = file.fieldname === 'notenbild' ? '_ohne' : '';
            cb(null, `${titel}${suffix}${path.extname(file.originalname)}`);
        }
    }
});

const upload = multer({ storage: storage });

app.post('/upload-logo', upload.single('logo'), (req, res) => {
    if (req.file) {
        const logoPath = `/uploads/logos/${req.file.filename}`;
        console.log("Logo uploaded successfully:", logoPath);
        res.json({ success: true, logoPath });
    } else {
        console.log("No logo file received");
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

app.post('/upload-custom-image', upload.single('customImage'), (req, res) => {
    if (req.file) {
        const imagePath = `/uploads/custom/${req.file.filename}`;
        console.log("Custom image uploaded successfully:", imagePath);
        res.json({ success: true, imagePath });
    } else {
        console.log("No custom image file received");
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

app.post('/upload-logo', upload.single('logo'), (req, res) => {
    if (req.file) {
        const logoPath = `/uploads/logos/${req.file.filename}`;
        console.log("Logo uploaded successfully:", logoPath);
        res.json({ success: true, logoPath });
    } else {
        console.log("No logo file received");
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/ttf', express.static(path.join(__dirname, 'ttf')));

const PORT = 3000;

async function initializeDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gottesdienst'
        });
        
        // Überprüfen und Aktualisieren der Datenbankstruktur
        await connection.execute(`
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
        
        // Überprüfen, ob die copyright-Spalte bereits existiert, falls nicht, fügen wir sie hinzu
        const [columns] = await connection.execute("SHOW COLUMNS FROM objekte LIKE 'copyright'");
        if (columns.length === 0) {
            await connection.execute("ALTER TABLE objekte ADD COLUMN copyright VARCHAR(255)");
            console.log('Copyright-Spalte zur objekte-Tabelle hinzugefügt.');
        }

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                data JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vorlagen (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                data JSON NOT NULL
            )
        `);

        console.log('Datenbankstruktur überprüft und aktualisiert.');
        
        return connection;
    } catch (error) {
        console.error('Fehler bei der Datenbankinitialisierung:', error);
        process.exit(1);
    }
}

async function startServer() {
    const db = await initializeDatabase();
    
    app.post('/objekte', upload.fields([
        { name: 'notenbild', maxCount: 1 },
        { name: 'notenbildMitText', maxCount: 1 }
    ]), async (req, res) => {
        try {
            console.log('Received request body:', req.body);
            console.log('Received files:', req.files);
            
            const { typ, titel, inhalt, strophen, copyright } = req.body;
            const notenbild = req.files && req.files['notenbild'] 
            ? path.join('/uploads', path.relative(path.join(__dirname, 'uploads'), req.files['notenbild'][0].path))
            : null;
            const notenbildMitText = req.files && req.files['notenbildMitText']
            ? path.join('/uploads', path.relative(path.join(__dirname, 'uploads'), req.files['notenbildMitText'][0].path))
            : null;
            
            console.log('Prepared data:', { typ, titel, inhalt, strophen, notenbild, notenbildMitText, copyright });
            
            const safeInhalt = inhalt === undefined ? null : inhalt;
            const safeStrophen = strophen === undefined ? null : strophen;
            
            const [result] = await db.execute(
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
    
    app.get('/objekte', async (req, res) => {
        try {
            console.log('GET /objekte aufgerufen');
            const [results] = await db.execute('SELECT * FROM objekte');
            console.log('Abgerufene Objekte:', results);
            res.json(results);
        } catch (error) {
            console.error('Fehler beim Abrufen der Objekte: ', error);
            res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
        }
    });
    
    app.put('/objekte/:id', upload.fields([
        { name: 'notenbild', maxCount: 1 },
        { name: 'notenbildMitText', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const { id } = req.params;
            const { typ, titel, inhalt, strophen, copyright } = req.body;
            
            console.log('Empfangene Daten:', { id, typ, titel, inhalt, strophen, copyright });
            
            // Holen Sie das existierende Objekt aus der Datenbank
            const [existingObjekt] = await db.execute('SELECT * FROM objekte WHERE id = ?', [id]);
            
            if (existingObjekt.length === 0) {
                return res.status(404).json({ message: 'Objekt nicht gefunden' });
            }
            
            let notenbild = existingObjekt[0].notenbild;
            let notenbildMitText = existingObjekt[0].notenbildMitText;
            
            if (req.files && req.files['notenbild']) {
                notenbild = path.join('/uploads', path.relative(path.join(__dirname, 'uploads'), req.files['notenbild'][0].path));
            }
            if (req.files && req.files['notenbildMitText']) {
                notenbildMitText = path.join('/uploads', path.relative(path.join(__dirname, 'uploads'), req.files['notenbildMitText'][0].path));
            }
            
            const query = 'UPDATE objekte SET typ = ?, titel = ?, inhalt = ?, strophen = ?, notenbild = ?, notenbildMitText = ?, copyright = ? WHERE id = ?';
            const params = [
                typ, 
                titel, 
                inhalt || null, 
                strophen || null, 
                notenbild, 
                notenbildMitText, 
                copyright || null,  // Erlaubt NULL, wenn kein Copyright angegeben ist
                id
            ];
            
            console.log('SQL Query:', query);
            console.log('SQL Params:', params);
            
            const [result] = await db.execute(query, params);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Objekt nicht gefunden' });
            }
            res.json({ message: 'Objekt erfolgreich aktualisiert' });
        } catch (error) {
            console.error('Detaillierter Fehler:', error);
            res.status(500).json({ error: 'Interner Serverfehler', details: error.message, stack: error.stack });
        }
    });
    app.delete('/objekte/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const [result] = await db.execute('DELETE FROM objekte WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Objekt nicht gefunden' });
            }
            res.json({ message: 'Objekt erfolgreich gelöscht' });
        } catch (error) {
            console.error('Fehler beim Löschen des Objekts: ', error);
            res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
        }
    });

    // Neue Routen für Session-Management
    app.post('/sessions', async (req, res) => {
        try {
            const { name, data } = req.body;
            const id = uuidv4();
            await db.execute('INSERT INTO sessions (id, name, data) VALUES (?, ?, ?)', [id, name, JSON.stringify(data)]);
            res.status(201).json({ id, message: 'Session erfolgreich gespeichert' });
        } catch (error) {
            console.error('Fehler beim Speichern der Session:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    });

    app.get('/sessions', async (req, res) => {
        try {
            const [rows] = await db.execute('SELECT id, name, created_at FROM sessions ORDER BY created_at DESC');
            res.json(rows);
        } catch (error) {
            console.error('Fehler beim Abrufen der Sessions:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    });

    app.get('/sessions/:id', async (req, res) => {
        try {
            const [rows] = await db.execute('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
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

    app.delete('/sessions/:id', async (req, res) => {
        try {
            const [result] = await db.execute('DELETE FROM sessions WHERE id = ?', [req.params.id]);
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
    
    

    // Routen für Vorlagen
    app.post('/vorlagen', async (req, res) => {
        try {
            const { name, data } = req.body;
            const id = uuidv4();
            await db.execute('INSERT INTO vorlagen (id, name, data) VALUES (?, ?, ?)', [id, name, JSON.stringify(data)]);
            res.status(201).json({ id, message: 'Vorlage erfolgreich gespeichert' });
        } catch (error) {
            console.error('Fehler beim Speichern der Vorlage:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    });

    app.get('/vorlagen', async (req, res) => {
        try {
            const [rows] = await db.execute('SELECT id, name FROM vorlagen');
            res.json(rows);
        } catch (error) {
            console.error('Fehler beim Abrufen der Vorlagen:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    });

    app.get('/vorlagen/:id', async (req, res) => {
        try {
            const [rows] = await db.execute('SELECT * FROM vorlagen WHERE id = ?', [req.params.id]);
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

    app.delete('/vorlagen/:id', async (req, res) => {
        try {
            const [result] = await db.execute('DELETE FROM vorlagen WHERE id = ?', [req.params.id]);
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

    app.listen(PORT, () => {
        console.log(`Server läuft auf http://localhost:${PORT}`);
    });
}

startServer();