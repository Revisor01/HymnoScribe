const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../db/pool');

async function cleanupUnusedImages() {
    console.log('Starte Bereinigung unbenutzter Bilder...');
    try {
        const baseUploadDir = path.join(__dirname, '..', 'uploads');
        const directories = ['liturgie', 'noten'];

        // Hole alle verwendeten Bildpfade aus der Datenbank
        const [rows] = await pool.query('SELECT notenbild, notenbildMitText FROM objekte WHERE notenbild IS NOT NULL OR notenbildMitText IS NOT NULL');
        const usedImages = new Set(rows.flatMap(row => [row.notenbild, row.notenbildMitText].filter(Boolean)));

        let deletedCount = 0;
        let scannedCount = 0;

        for (const dir of directories) {
            const uploadDir = path.join(baseUploadDir, dir);
            try {
                const files = await fs.readdir(uploadDir);

                for (const file of files) {
                    scannedCount++;
                    const filePath = path.join(uploadDir, file);
                    const relativePath = `/api/uploads/${dir}/${file}`;

                    if (!usedImages.has(relativePath)) {
                        await fs.unlink(filePath);
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

module.exports = { cleanupUnusedImages };
