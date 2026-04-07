const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
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

// Whitelist erlaubter Tabellennamen — verhindert SQL-Injection in DDL-Statements
const ALLOWED_TABLES = ['users', 'institutions', 'objekte', 'sessions', 'vorlagen'];

async function createOrUpdateTable(conn, tableName, createTableSQL) {
    try {
        if (!ALLOWED_TABLES.includes(tableName)) {
            throw new Error(`Ungültiger Tabellenname: ${tableName}`);
        }
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
        if (!ALLOWED_TABLES.includes(tableName)) {
            throw new Error(`Ungültiger Tabellenname: ${tableName}`);
        }
        const [rows] = await conn.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${columnName}'
        `);
        if (rows.length === 0) {
            if (!ALLOWED_TABLES.includes(tableName)) {
                throw new Error(`Ungültiger Tabellenname: ${tableName}`);
            }
            await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
            console.log(`Spalte ${columnName} zu Tabelle ${tableName} hinzugefügt.`);
        } else {
            console.log(`Spalte ${columnName} in Tabelle ${tableName} existiert bereits.`);
        }
    } catch (error) {
        console.error(`Fehler beim Hinzufügen der Spalte ${columnName} zu Tabelle ${tableName}:`, error);
    }
}

module.exports = { pool, initializeDatabase };
