const { body, validationResult } = require('express-validator');

// Fehler-Handler — einheitlich für alle validierten Endpunkte
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// POST /login
const loginValidation = [
    body('usernameOrEmail').trim().notEmpty().withMessage('Benutzername oder E-Mail erforderlich'),
    body('password').notEmpty().withMessage('Passwort erforderlich')
];

// POST /request-password-reset, /request-email-verification
const emailValidation = [
    body('email').trim().isEmail().withMessage('Gültige E-Mail-Adresse erforderlich').normalizeEmail()
];

// POST /reset-password, /set-password, PUT /users/change-password (SEC-06)
const passwordValidation = [
    body('newPassword')
        .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen haben')
        .matches(/[A-Z]/).withMessage('Passwort muss mindestens einen Großbuchstaben enthalten')
        .matches(/[0-9]/).withMessage('Passwort muss mindestens eine Zahl enthalten')
        .matches(/[^A-Za-z0-9]/).withMessage('Passwort muss mindestens ein Sonderzeichen enthalten')
];

// POST /admin/user (User anlegen)
const userCreateValidation = [
    body('username').trim().isLength({ min: 2, max: 50 }).withMessage('Benutzername: 2-50 Zeichen'),
    body('email').trim().isEmail().withMessage('Gültige E-Mail-Adresse erforderlich').normalizeEmail(),
    body('role').isIn(['admin', 'user']).withMessage('Ungültige Rolle (erlaubt: admin, user)'),
    body('institution_id').isInt({ min: 1 }).withMessage('Ungültige Institution-ID')
];

// PUT /admin/users/:id (User aktualisieren)
const userUpdateValidation = [
    body('username').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Benutzername: 2-50 Zeichen'),
    body('email').optional().trim().isEmail().withMessage('Gültige E-Mail-Adresse').normalizeEmail(),
    body('role').optional().isIn(['admin', 'user']).withMessage('Ungültige Rolle')
];

// PUT /user/change-email
const changeEmailValidation = [
    body('newEmail').trim().isEmail().withMessage('Gültige E-Mail-Adresse erforderlich').normalizeEmail(),
    body('password').notEmpty().withMessage('Aktuelles Passwort erforderlich')
];

module.exports = {
    handleValidationErrors,
    loginValidation,
    emailValidation,
    passwordValidation,
    userCreateValidation,
    userUpdateValidation,
    changeEmailValidation
};
