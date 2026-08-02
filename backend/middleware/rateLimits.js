const { rateLimit } = require('express-rate-limit');

// Für POST /login — 5 Versuche pro 15min pro IP (SEC-01)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1', // Healthchecks nicht limitieren
    message: { error: 'Zu viele Anmeldeversuche, bitte versuchen Sie es in 15 Minuten erneut.' }
});

// Für /request-password-reset, /reset-password, /set-password (SEC-01)
const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Zu viele Anfragen, bitte versuchen Sie es in 15 Minuten erneut.' }
});

// Für /request-email-verification, /verify-email (SEC-01)
const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Zu viele Anfragen, bitte versuchen Sie es in 15 Minuten erneut.' }
});

// Für POST /super-login — strenger: 3 Versuche pro 15min (SEC-01)
const superLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Zu viele Super-Admin-Anmeldeversuche, bitte versuchen Sie es in 15 Minuten erneut.' }
});

module.exports = { loginLimiter, resetLimiter, verificationLimiter, superLoginLimiter };
