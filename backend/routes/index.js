'use strict';

const express = require('express');
const router = express.Router();

router.use('/', require('./auth'));
router.use('/', require('./users'));
router.use('/', require('./institutions'));
router.use('/', require('./objekte'));
router.use('/', require('./sessions'));
router.use('/', require('./vorlagen'));
router.use('/', require('./uploads'));
router.use('/', require('./contact'));

module.exports = router;
