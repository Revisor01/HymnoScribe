const jwt = require('jsonwebtoken');
const pool = require('../db/pool'); // Wird in Plan 04 erstellt

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

module.exports = { authenticateToken, authenticateAdmin, authenticateSuperAdmin, checkRole };
