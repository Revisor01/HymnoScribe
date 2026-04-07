'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = require('./app');
const { initializeDatabase } = require('./db/pool');
const { cleanupUnusedImages } = require('./services/imageCleanupService');
const cron = require('node-cron');

const PORT = process.env.PORT || 3000;

async function startServer() {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`HymnoScribe läuft auf Port ${PORT}`);
    });

    // Stündlicher Cleanup-Job
    cron.schedule('0 * * * *', async () => {
        console.log('Führe geplante stündliche Bildbereinigung durch...');
        try {
            const result = await cleanupUnusedImages();
            console.log(`Cron-Job Ergebnis: ${result.deletedCount} von ${result.scannedCount} Dateien gelöscht.`);
        } catch (error) {
            console.error('Fehler beim Cleanup-Job:', error);
        }
    });
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(console.error);
