-- Create institutions table
CREATE TABLE IF NOT EXISTS institutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Create users table
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
);

-- Create objekte table
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
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    institution_id INT,
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- Create vorlagen table
CREATE TABLE IF NOT EXISTS vorlagen (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    data JSON NOT NULL,
    institution_id INT,
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);