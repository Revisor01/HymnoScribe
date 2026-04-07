'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { authenticateToken, checkRole } = require('../middleware/auth');

// Multer-Konfiguration fuer Custom-Images
const customImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'custom');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadCustomImage = multer({ storage: customImageStorage });

// Multer-Konfiguration fuer Logo-Uploads
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'logos');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const uploadLogo = multer({ storage: logoStorage });

// POST /upload-custom-image
router.post('/upload-custom-image', uploadCustomImage.single('customImage'), authenticateToken, checkRole(['admin']), (req, res) => {
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

// POST /upload-logo
router.post('/upload-logo', authenticateToken, checkRole(['admin', 'user']), uploadLogo.single('logo'), (req, res) => {
    if (req.file) {
        const logoPath = `/api/uploads/logos/${req.file.filename}`;
        console.log('Logo uploaded successfully:', logoPath);
        res.json({ success: true, logoPath });
    } else {
        console.log('No logo file received');
        res.status(400).json({ success: false, message: 'Kein Bild hochgeladen' });
    }
});

module.exports = router;
