# HymnoScribe

![Logo](https://github.com/Revisor01/HymnoScribe/blob/master/frontend/img/Logo-hymnoscribe.png)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Docker](https://github.com/Revisor01/HymnoScribe/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Revisor01/HymnoScribe/actions/workflows/docker-publish.yml)

HymnoScribe ist ein umfassendes Tool zur Erstellung von Gottesdienst-Liedblättern. Es bietet eine benutzerfreundliche Oberfläche zum Erstellen, Bearbeiten und Verwalten von Gottesdienstobjekten sowie zur Generierung von PDF-Liedblättern.

## Inhaltsverzeichnis
1. [Features](#features)
2. [Nutzung und Lizenzierung](#nutzung-und-lizenzierung)
3. [Installation](#installation)
   - [Docker Compose Setup](#docker-compose-setup)
   - [Reverse Proxy Setup](#reverse-proxy-setup)
4. [Entwicklungsumgebung](#entwicklungsumgebung)
5. [Benutzerrollen und Berechtigungen](#benutzerrollen-und-berechtigungen)
6. [FAQ](#faq)
7. [Kontakt und Support](#kontakt-und-support)
8. [Mitwirken](#mitwirken)
9. [Lizenz](#lizenz)

## Features

- Drag & Drop Interface zur einfachen Erstellung von Liedblättern
- Verwaltung verschiedener Gottesdienstobjekte (Lieder, Gebete, Lesungen, etc.)
- PDF-Generierung mit anpassbaren Layouts (A5, DIN Lang, A4 schmal, A3 schmal)
- Echtzeit-Vorschau von Änderungen
- Session-Management zum Speichern und Laden von Liedblatt-Entwürfen
- Vorlagen-System für häufig verwendete Liedblatt-Strukturen
- Unterstützung für Noten-Bilder (mit und ohne Text)
- Integration eigener Bilder und Logos
- Responsives Design für Desktop- und mobile Nutzung
- Benutzer- und Institutionsverwaltung mit rollenbasiertem Berechtigungssystem
- E-Mail-Verifizierung und Passwort-Zurücksetzung
- Mehrere Ausgabeformate: A4, A3, DIN Lang (6er-Flyer)
- Individuelle Anpassung des Layouts (Schriftart, -größe, Ausrichtung)
- Möglichkeit zur Integration eines Kirchenlogos

## Nutzung und Lizenzierung

HymnoScribe ist ein Projekt, das die Arbeit von Gemeinden erleichtern und die Verkündigung des Evangeliums unterstützen soll. Wir bieten folgende Nutzungsmodelle an:

- **Private Nutzung:** Kostenlos zum Selbsthosten oder über unsere Plattform (nach Anfrage).
- **Gemeindliche Nutzung:** Für regelmäßige Nutzung auf unserer Plattform bitten wir um einen Beitrag von 5€ pro Monat.
- **Organisationen/Unternehmen:** Bitte kontaktieren Sie uns für individuelle Lizenzvereinbarungen.

Eine Testversion ist unter https://app.hymnoscribe.de verfügbar. Nutzen Sie die Zugangsdaten:
- Admin (Passwort: demoAdmin)
- User (Passwort: demoUser)

Für die Selbsthosting-Option finden Sie alle Informationen in diesem Repository.

## Installation

### Docker Compose Setup

1. Klonen Sie das Repository:
   ```
   git clone https://github.com/Revisor01/HymnoScribe.git
   cd HymnoScribe
   ```

2. Erstellen Sie eine `.env` Datei im Hauptverzeichnis basierend auf der `example.env` und passen Sie die Werte an.

3. Starten Sie die Anwendung mit Docker Compose:
   ```
   docker-compose up -d
   ```

4. Die Anwendung ist nun unter `http://localhost:9615` erreichbar.

### Reverse Proxy Setup

Für eine sichere Produktionsumgebung empfehlen wir die Verwendung eines Reverse Proxy wie Nginx. Hier ist ein Beispiel für eine Nginx-Konfiguration:

```nginx
server {
    listen 80;
    server_name hymnoscribe.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name hymnoscribe.your-domain.com;

    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    location / {
        proxy_pass http://localhost:9615;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```apache
# HTTPS-Redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API-Anfragen
<Location /api>
# CORS-Header hinzufügen
Header always set Access-Control-Allow-Origin "URL"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
Header always set Access-Control-Allow-Credentials "true"

# Präflug-Anfragen behandeln
RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]

ProxyPass http://127.0.0.1:9615/api
ProxyPassReverse http://127.0.0.1:9615/api
</Location>

# Frontend und alle anderen Anfragen
<Location />
ProxyPass http://127.0.0.1:9615/
ProxyPassReverse http://127.0.0.1:9615/
</Location>

# ACME-Challenge von Proxy ausschließen
<Location /.well-known/acme-challenge/>
RewriteEngine off
ProxyPass !
</Location>

# Websocket-Unterstützung (falls benötigt)
RewriteEngine On
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:9615/$1" [P,L]
```

Ersetzen Sie `hymnoscribe.your-domain.com` mit Ihrer tatsächlichen Domain und passen Sie die Pfade zu Ihren SSL-Zertifikaten an.

## Entwicklungsumgebung

1. Klonen Sie das Repository und navigieren Sie in das Projektverzeichnis.
2. Kopieren Sie `example.env` zu `.env` und passen Sie die Werte an.
3. Starten Sie die MySQL-Datenbank mit Docker Compose:
   ```
   docker-compose up -d db
   ```
4. Installieren Sie die Abhängigkeiten:
   ```
   npm install
   ```
5. Starten Sie den Entwicklungsserver:
   ```
   npm run dev
   ```
6. Die Anwendung ist nun unter `http://localhost:9615` erreichbar.

## Benutzerrollen und Berechtigungen

HymnoScribe verwendet ein rollenbasiertes Berechtigungssystem:

- **Superadmin**: Voller Zugriff auf alle Funktionen, kann Institutionen und Benutzer verwalten.
- **Admin**: Zugriff auf Liedblatt, Bibliothek, Vorlagen- und Session-Verwaltung innerhalb ihrer Institution.
- **User**: Zugriff auf Liedblatt, Erstellung von Vorlagen, Verwaltung von Sessions.

## FAQ

1. **Wie kann ich HymnoScribe nutzen?**
   HymnoScribe ist eine webbasierte Anwendung. Sie können sie direkt in Ihrem Browser nutzen, nachdem Sie sich angemeldet haben.

2. **Kann ich HymnoScribe selbst hosten?**
   Ja, HymnoScribe kann auf Ihrem eigenen Server gehostet werden. Folgen Sie unserer Installationsanleitung.

3. **Woher kommen die Noten?**
   Sie können eigene Noten hochladen oder aus unserer Bibliothek wählen. Wir arbeiten mit verschiedenen Verlagen zusammen.

4. **Wo werden meine Daten gespeichert?**
   Ihre Daten werden sicher auf Servern in Deutschland gespeichert und unterliegen den strengen europäischen Datenschutzrichtlinien.

5. **Wie funktioniert die Benutzerverwaltung?**
   Der Super-Admin kann Institutionen anlegen und hat vollen Zugriff auf alle Nutzer:innen. Der Super-Admin hat keinen Zugriff auf die Objekte innerhalb einer Institution. Administratoren können Benutzer innerhalb ihrer Institution erstellen und verwalten. Jeder Benutzer muss seine E-Mail-Adresse verifizieren.

6. **Was passiert mit den Objekten, wenn ein Benutzer gelöscht wird?**
   Objekte bleiben der Institution erhalten, auch wenn der erstellende Benutzer gelöscht wird.

## Kontakt und Support

Für Fragen, Anregungen oder Unterstützung bei der Einrichtung kontaktieren Sie uns bitte über das [Kontaktformular auf unserer Website](https://www.hymnoscribe.de/contact) oder erstellen Sie ein Issue in diesem GitHub-Repository.

## Mitwirken

Wir freuen uns über Beiträge zur Weiterentwicklung von HymnoScribe. Wenn Sie Ideen haben oder mitentwickeln möchten, erstellen Sie bitte einen Pull Request oder kontaktieren Sie uns direkt.

## Lizenz

HymnoScribe ist unter der [GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0) lizenziert.