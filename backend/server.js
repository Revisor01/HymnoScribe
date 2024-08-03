const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const fsPromises = fs.promises;
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

console.log('Database config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

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
    origin: process.env.URL ? process.env.URL.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api/icons', express.static(path.join(__dirname, 'icons')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/ttf', express.static(path.join(__dirname, 'ttf')));

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

// Führe die Bereinigung stündlich aus
cron.schedule('0 * * * *', async () => {
    console.log('Führe geplante stündliche Bildbereinigung durch...');
    try {
        const result = await cleanupUnusedImages();
        console.log(`Cron-Job Ergebnis: ${result.deletedCount} von ${result.scannedCount} Dateien gelöscht.`);
    } catch (error) {
        console.error('Fehler beim Ausführen des Cron-Jobs:', error);
    }
});


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

// Middleware für die Authentifizierung
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware für Admin-Authentifizierung
const authenticateAdmin = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if (user.role !== 'admin' && user.role !== 'super-admin') return res.sendStatus(403);
        req.user = user;
        next();
    } catch (err) {
        return res.sendStatus(403);
    }
};

const authenticateSuperAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err || user.role !== 'super-admin') return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware für die Rollenüberprüfung
const checkRole = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    next();
};
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Erhöhen des Limits für JSON-Daten
app.use(express.json({ limit: '50mb' })); // z.B. 50 MB

// Erhöhen des Limits für URL-encoded-Daten
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/reset-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '../frontend/admin.html'));
});

// Anforderung zum Zurücksetzen des Passworts
apiRouter.post('/request-password-reset', async (req, res) => {
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

// Anforderung zur E-Mail-Verifizierung
apiRouter.post('/request-email-verification', async (req, res) => {
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

apiRouter.post('/set-password', async (req, res) => {
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

apiRouter.get('/verify-email', async (req, res) => {
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

// Passwort mit Token zurücksetzen
apiRouter.post('/reset-password', async (req, res) => {
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


// Login-Route
apiRouter.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body);
    const { usernameOrEmail, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ?', [usernameOrEmail, usernameOrEmail]);
        console.log('Query result:', users);
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
// Neue Route zur Token-Überprüfung
apiRouter.get('/verify-token', authenticateToken, (req, res) => {
    res.sendStatus(200);
});

apiRouter.post('/super-login', async (req, res) => {
    console.log('Super-login attempt received');
    const { superPassword } = req.body;
    if (superPassword === process.env.SUPER_PASSWORD) {
        console.log('Super-login successful');
        const token = jwt.sign({ role: 'super-admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: 'super-admin' });
    } else {
        console.log('Super-login failed: Invalid password');
        res.status(401).json({ error: 'Ungültiges Super-Passwort' });
    }
});

apiRouter.delete('/admin/user/:id', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // Überprüfen Sie zuerst, ob der Benutzer existiert und holen Sie relevante Informationen
        const [users] = await conn.query('SELECT id, username, role, institution_id FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        const user = users[0];
        
        // Überprüfen Sie, ob der anfragende Benutzer berechtigt ist, diesen Benutzer zu löschen
        if (req.user.role !== 'super-admin' && req.user.institution_id !== user.institution_id) {
            await conn.rollback();
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Benutzers' });
        }
        
        // Wenn der zu löschende Benutzer ein Admin ist, überprüfen Sie, ob es andere Admins für diese Institution gibt
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
        
        // Löschen der Sessions des Nutzers
        await conn.query('DELETE FROM sessions WHERE id = ?', [id]);
        
        // Löschen des Nutzers
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

// Neue Route für Admin, um seine Institution zu laden
apiRouter.get('/admin/institution', authenticateToken, checkRole(['admin']), async (req, res) => {
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

// Admin-Routen
apiRouter.post('/admin/institution', authenticateSuperAdmin, async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO institutions (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.insertId, name });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Erstellen der Institution' });
    }
});
apiRouter.delete('/admin/institution/:id', authenticateSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // Überprüfen Sie, ob die Institution existiert
        const [institutions] = await conn.query('SELECT * FROM institutions WHERE id = ?', [id]);
        if (institutions.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Institution nicht gefunden' });
        }
        
        // Löschen Sie alle zugehörigen Objekte
        await conn.query('DELETE FROM objekte WHERE institution_id = ?', [id]);
        
        // Löschen Sie alle zugehörigen Vorlagen
        await conn.query('DELETE FROM vorlagen WHERE institution_id = ?', [id]);
        
        // Löschen Sie alle zugehörigen Sessions
        await conn.query('DELETE FROM sessions WHERE institution_id = ?', [id]);
        
        // Löschen Sie alle zugehörigen Benutzer
        await conn.query('DELETE FROM users WHERE institution_id = ?', [id]);
        
        // Löschen Sie die Institution selbst
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

apiRouter.get('/admin/institutions', authenticateToken, checkRole(['admin', 'user', 'super-admin']), async (req, res) => {
    try {
        const [institutions] = await pool.query('SELECT * FROM institutions');
        res.json(institutions);
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Institutionen' });
    }
});

apiRouter.post('/admin/user', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
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
            // Lösche den Benutzer wieder, wenn die E-Mail nicht gesendet werden konnte
            await pool.query('DELETE FROM users WHERE id = ?', [result.insertId]);
            return res.status(500).json({ error: 'Fehler beim Senden der Willkommens-E-Mail. Benutzer wurde nicht erstellt.' });
        }
        
        res.status(201).json({ message: 'Benutzer erfolgreich erstellt', id: result.insertId });
    } catch (error) {
        console.error('Fehler beim Erstellen des Benutzers:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers', details: error.message });
    }
});


apiRouter.get('/admin/users', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, institution_id, username, role FROM users');
        res.json(users);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer', details: error.message });
    }
});

apiRouter.put('/admin/users/:id', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
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

apiRouter.put('/admin/users/:id/password', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
        res.json({ message: 'Passwort aktualisiert' });
    } catch (error) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/admin/users/:institutionId', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
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

apiRouter.put('/admin/user/:id', authenticateAdmin, async (req, res) => {
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

apiRouter.put('/admin/user/:id/change-password', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
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

apiRouter.put('/admin/user/:id/change-email', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    const { id } = req.params;
    const { newEmail } = req.body;
    try {
        // Prüfen, ob die neue E-Mail-Adresse bereits existiert
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

apiRouter.put('/user/change-email', authenticateToken, async (req, res) => {
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

// Benutzer für eine Institution anlegen
apiRouter.post('/institution/users', authenticateAdmin, async (req, res) => {
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

apiRouter.get('/institution/users', authenticateToken, checkRole(['admin', 'super-admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role, email FROM users WHERE institution_id = ?', [req.user.institution_id]);
        res.json(users);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Benutzer für eine Institution löschen
apiRouter.delete('/institution/users/:id', authenticateAdmin, async (req, res) => {
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

// Passwort ändern für einen Benutzer
apiRouter.put('/users/:id/password', authenticateToken, async (req, res) => {
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

apiRouter.put('/users/change-password', authenticateToken, async (req, res) => {
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

apiRouter.put('/user/change-password', authenticateToken, async (req, res) => {
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

// Geschützte Routen
apiRouter.use(authenticateToken);

apiRouter.post('/upload-custom-image', uploadCustomImage.single('customImage'), authenticateToken, checkRole(['admin']), (req, res) => {
    console.log('Bildupload-Anfrage empfangen');
    console.log('Authentifizierter Benutzer:', req.user);
    console.log('Empfangene Datei:', req.file);
    
    if (req.file) {
        const imagePath = `/api/uploads/custom/${req.file.filename}`;
        console.log('Bild erfolgreich hochgeladen:', imagePath);
        res.json({ success: true, imagePath });
    } else {
        console.log('Kein Bild in der Anfrage gefunden');
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

apiRouter.get('/user/info', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role, institution_id, email, email_verified FROM users WHERE id = ?', [req.user.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        
        const user = users[0];
        // Entfernen Sie das Passwort aus den Benutzerdaten, bevor Sie sie zurücksenden
        delete user.password;
        
        res.json(user);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzerinformationen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/user/role', authenticateToken, (req, res) => {
    try {
        res.json({ role: req.user.role });
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzerrolle:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.put('/user/password', authenticateToken, async (req, res) => {
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

apiRouter.put('/user/email', authenticateToken, async (req, res) => {
    const { newEmail } = req.body;
    try {
        await pool.query('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.user.id]);
        res.json({ message: 'E-Mail erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern der E-Mail:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// E-Mail mit Token verifizieren
apiRouter.post('/verify-email', async (req, res) => {
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

apiRouter.post('/upload-logo', authenticateToken, checkRole(['admin', 'user']), upload.single('logo'), (req, res) => {
    if (req.file) {
        const logoPath = `/api/uploads/logos/${req.file.filename}`;
        console.log("Logo uploaded successfully:", logoPath);
        res.json({ success: true, logoPath });
    } else {
        console.log("No logo file received");
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

apiRouter.post('/objekte', authenticateToken, checkRole(['admin']), upload.fields([
    { name: 'notenbild', maxCount: 1 },
    { name: 'notenbildMitText', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Received object data:', req.body);
        console.log('Received files:', req.files);
        const { typ, titel, inhalt, strophen, copyright, melodie, refrain, institution_id } = req.body;
        const notenbild = req.files && req.files['notenbild'] 
        ? `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbild'][0].path)}`
        : null;
        const notenbildMitText = req.files && req.files['notenbildMitText']
        ? `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbildMitText'][0].path)}`
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

apiRouter.get('/objekte', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        let query = 'SELECT * FROM objekte';
        const params = [];
        if (req.user.role !== 'super-admin') {
            query += ' WHERE institution_id = ?';
            params.push(req.user.institution_id);
        }
        const [results] = await pool.query(query, params);
        console.log('Query results:', results); // Debugging
        res.json(results);
    } catch (error) {
        console.error('Fehler beim Abrufen der Objekte:', error); // Debugging
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.put('/objekte/:id', authenticateToken, checkRole(['admin']), upload.fields([
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
            notenbild = `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbild'][0].path)}`;
        }
        if (req.files && req.files['notenbildMitText']) {
            notenbildMitText = `/api/uploads/${path.relative(path.join(__dirname, 'uploads'), req.files['notenbildMitText'][0].path)}`;
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

apiRouter.delete('/objekte/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
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

apiRouter.post('/sessions', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
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

apiRouter.get('/sessions', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, created_at FROM sessions WHERE institution_id = ? ORDER BY created_at DESC', [req.user.institution_id]);
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Sessions:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/sessions/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
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

apiRouter.delete('/sessions/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
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

apiRouter.post('/vorlagen', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
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

apiRouter.get('/vorlagen', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM vorlagen WHERE institution_id = ?', [req.user.institution_id]);
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Vorlagen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

apiRouter.get('/vorlagen/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
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

apiRouter.delete('/vorlagen/:id', authenticateToken, checkRole(['admin', 'user']), async (req, res) => {
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

async function initializeDatabase() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: 'root',
            password: process.env.MYSQL_ROOT_PASSWORD
        });
        
        // Create database if not exists
        await conn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        
        // Create user and grant privileges
        await conn.query(`
            CREATE USER IF NOT EXISTS '${process.env.DB_USER}'@'%' IDENTIFIED BY '${process.env.DB_PASSWORD}'
        `);
        await conn.query(`
            GRANT ALL PRIVILEGES ON ${process.env.DB_NAME}.* TO '${process.env.DB_USER}'@'%'
        `);
        await conn.query('FLUSH PRIVILEGES');
        
        // Switch to the new database
        await conn.changeUser({ database: process.env.DB_NAME });
        
        // Create tables
        await conn.query(`
            CREATE TABLE IF NOT EXISTS institutions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE
            )
        `);
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                institution_id INT,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                reset_token VARCHAR(255),
                reset_token_expires BIGINT,
                verification_token VARCHAR(255),
                email_verified BOOLEAN DEFAULT FALSE,
                role ENUM('super-admin', 'admin', 'user') NOT NULL,
                pending_email VARCHAR(255),
                old_email VARCHAR(255),
                old_email_verified BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `);
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS objekte (
                id INT AUTO_INCREMENT PRIMARY KEY,
                typ VARCHAR(255) NOT NULL,
                titel VARCHAR(255) NOT NULL,
                inhalt LONGTEXT,
                notenbild VARCHAR(255),
                notenbildMitText VARCHAR(255),
                strophen JSON,
                copyright VARCHAR(255),
                melodie VARCHAR(255),
                institution_id INT,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `);
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                data JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                institution_id INT,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `);
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS vorlagen (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                data JSON NOT NULL,
                institution_id INT,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `);
        
        // Create super-admin user if not exists
        const [superAdmins] = await conn.query("SELECT * FROM users WHERE role = 'super-admin'");
        if (superAdmins.length === 0) {
            const hashedPassword = await bcrypt.hash(process.env.SUPER_PASSWORD, 10);
            await conn.query(`
                INSERT INTO users (username, password, role, email_verified)
                VALUES ('superadmin', ?, 'super-admin', TRUE)
            `, [hashedPassword]);
            console.log('Super-Admin user created.');
        }
        
        console.log('Database structure checked and updated.');
        
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        if (conn) {
            try {
                await conn.end();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
}

async function createOrUpdateTable(conn, tableName, createTableSQL) {
    try {
        const [rows] = await conn.query(`SHOW TABLES LIKE '${tableName}'`);
        if (rows.length === 0) {
            await conn.query(createTableSQL);
            console.log(`Tabelle ${tableName} erstellt.`);
        } else {
            console.log(`Tabelle ${tableName} existiert bereits.`);
        }
    } catch (error) {
        console.error(`Fehler beim Erstellen oder Aktualisieren der Tabelle ${tableName}:`, error);
    }
}

async function addColumnIfNotExists(conn, tableName, columnName, columnDefinition) {
    try {
        const [rows] = await conn.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${columnName}'
        `);
        if (rows.length === 0) {
            await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
            console.log(`Spalte ${columnName} zu Tabelle ${tableName} hinzugefügt.`);
        } else {
            console.log(`Spalte ${columnName} in Tabelle ${tableName} existiert bereits.`);
        }
    } catch (error) {
        console.error(`Fehler beim Hinzufügen der Spalte ${columnName} zu Tabelle ${tableName}:`, error);
    }
}

function getEmailTemplate() {
    return fs.readFileSync(path.join(__dirname, 'email-template.html'), 'utf8');
}

function renderEmailTemplate(template, data) {
    let renderedTemplate = template;
    for (const key in data) {
        const regex = new RegExp(`\\[${key}\\]`, 'g');
        renderedTemplate = renderedTemplate.replace(regex, data[key]);
    }
    return renderedTemplate.replace('[LOGO_URL]', process.env.LOGO_URL);
}

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            // Deaktivieren Sie dies nicht in der Produktion
            rejectUnauthorized: false
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

async function cleanupUnusedImages() {
    console.log('Starte Bereinigung unbenutzter Bilder...');
    try {
        const baseUploadDir = path.join(__dirname, 'uploads');
        const directories = ['liturgie', 'noten'];
        
        // Hole alle verwendeten Bildpfade aus der Datenbank
        const [rows] = await pool.query('SELECT notenbild, notenbildMitText FROM objekte WHERE notenbild IS NOT NULL OR notenbildMitText IS NOT NULL');
        const usedImages = new Set(rows.flatMap(row => [row.notenbild, row.notenbildMitText].filter(Boolean)));
        
        let deletedCount = 0;
        let scannedCount = 0;
        
        for (const dir of directories) {
            const uploadDir = path.join(baseUploadDir, dir);
            try {
                const files = await fsPromises.readdir(uploadDir);
                
                for (const file of files) {
                    scannedCount++;
                    const filePath = path.join(uploadDir, file);
                    const relativePath = `/api/uploads/${dir}/${file}`;
                    
                    if (!usedImages.has(relativePath)) {
                        await fsPromises.unlink(filePath);
                        deletedCount++;
                        console.log(`Gelöschte ungenutzte Datei: ${filePath}`);
                    }
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`Verzeichnis nicht gefunden: ${uploadDir}`);
                } else {
                    throw error;
                }
            }
        }
        
        return { deletedCount, scannedCount };
    } catch (error) {
        console.error('Fehler bei der Bereinigung:', error);
        throw error;
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