'use strict';

// Env-Var-Validierung (SEC-04) — MUSS vor pool-Erstellung und app.use() stehen.
// Fehlende Pflicht-Env-Vars brechen den Prozess ab, damit kein Fallback auf unsichere
// Defaults (z. B. CORS-Wildcard) greifen kann.
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FEHLER: Pflicht-Env-Var ${envVar} nicht gesetzt. Server wird beendet.`);
        process.exit(1);
    }
}

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware-Reihenfolge (BACK-02): Reihenfolge MUSS bei Modularisierung erhalten bleiben.
// Änderungen hier müssen auf server.js und spätere app.js-Revisionen abgestimmt werden.

// 1. Security Headers — helmet() als ERSTE Middleware (vor compression, vor cors).
//    Setzt X-Content-Type-Options, HSTS, X-Frame-Options, entfernt X-Powered-By u.a.
//    CSP gibt CDN-Origins für pdf-lib (cdnjs), fontkit (unpkg) und Quill (cdn.jsdelivr.net) frei.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'", "unpkg.com", "cdnjs.cloudflare.com"],
            connectSrc: ["'self'"]
        }
    }
}));

// 2. HTTP-Kompression
app.use(compression());

// 3. Body-Parser (50MB für Bild-Uploads — zusammengeführt aus zwei express.json()-Aufrufen in server.js)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 4. CORS — nur explizite Origins aus Env-Var URL, kein Wildcard-Fallback (SEC-04).
//    URL-Env-Var kann kommagetrennte Origins enthalten (z. B. "https://hymnoscribe.de,https://www.hymnoscribe.de").
app.use(cors({
    origin: process.env.URL.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 5. Static Files (Reihenfolge aus server.js erhalten)
app.use('/api/icons', express.static(path.join(__dirname, 'icons')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/ttf', express.static(path.join(__dirname, 'ttf')));

// 6. API-Router — wird in Plan 05 (BACK-01) eingehängt wenn die Routes-Extraktion abgeschlossen ist.
// app.use('/api', require('./routes'));

// 7. Frontend Static Serving
app.use(express.static(path.join(__dirname, '../frontend')));

module.exports = app;
