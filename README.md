# HymnoScribe
![Logo](https://github.com/Revisor01/HymnoScribe/blob/master/frontend/img/Logo-hymnoscribe.png)

[![Docker](https://github.com/Revisor01/HymnoScribe/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Revisor01/HymnoScribe/actions/workflows/docker-publish.yml)

HymnoScribe ist ein umfassendes Tool zur Erstellung von Gottesdienst-Liedblättern. Es bietet eine benutzerfreundliche Oberfläche zum Erstellen, Bearbeiten und Verwalten von Gottesdienstobjekten sowie zur Generierung von PDF-Liedblättern.

## Inhaltsverzeichnis
1. [Features](#features)
2. [Installation und Nutzung](#installation-und-nutzung)
   - [Docker Compose Setup](#docker-compose-setup)
   - [Reverse Proxy Setup](#reverse-proxy-setup)
3. [Entwicklungsumgebung](#entwicklungsumgebung)
4. [Benutzerrollen und Berechtigungen](#benutzerrollen-und-berechtigungen)
5. [FAQ](#faq)

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
- Benutzer- und Institutionsverwaltung
- Rollenbasiertes Berechtigungssystem
- E-Mail-Verifizierung und Passwort-Zurücksetzung

## Installation und Nutzung

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

3. **Wie funktioniert die PDF-Generierung?**
   HymnoScribe nutzt die PDFLib-Bibliothek, um PDFs direkt im Browser zu erstellen. Sie können verschiedene Formate wie A5, DIN Lang, A4 schmal und A3 schmal wählen.

4. **Kann ich eigene Bilder und Logos hochladen?**
   Ja, Sie können eigene Bilder und Logos hochladen und in Ihre Liedblätter integrieren.

5. **Wie funktioniert das Session-Management?**
   Sie können Ihre Arbeit als Session speichern und später fortsetzen. Sessions sind benutzerspezifisch und bleiben erhalten, bis Sie sie löschen.

6. **Gibt es eine Begrenzung für die Anzahl der Objekte, die ich erstellen kann?**
   Nein, es gibt keine feste Begrenzung. Die Kapazität hängt von Ihrem Hosting-Plan und den Serverressourcen ab.

7. **Wie sicher sind meine Daten?**
   Wir setzen auf verschlüsselte Verbindungen (HTTPS) und sichere Passwort-Hashing-Methoden. Ihre Daten werden in einer sicheren Datenbank gespeichert.

8. **Kann ich HymnoScribe offline nutzen?**
   HymnoScribe ist eine webbasierte Anwendung und benötigt eine Internetverbindung. Eine Offline-Version ist derzeit nicht verfügbar.

9. **Wie kann ich Fehler melden oder Verbesserungsvorschläge einreichen?**
   Bitte nutzen Sie den Issues-Bereich auf GitHub, um Fehler zu melden oder Verbesserungsvorschläge einzureichen.

10. **Gibt es eine mobile App für HymnoScribe?**
    Aktuell gibt es keine separate mobile App. Die Webanwendung ist jedoch responsiv und kann auf mobilen Geräten genutzt werden.

11. **Wie oft werden Updates veröffentlicht?**
    Wir streben regelmäßige Updates an, um neue Features hinzuzufügen und Fehler zu beheben. Die Häufigkeit variiert je nach Entwicklungsfortschritt.

12. **Kann ich HymnoScribe in meine bestehende Webseite integrieren?**
    Eine direkte Integration ist nicht vorgesehen. Sie können jedoch Links zu Ihrer HymnoScribe-Instanz auf Ihrer Webseite platzieren.

13. **Wie funktioniert die Benutzerverwaltung?**
    Der Super-Admin kann Institutionen anlegen und hat vollen Zugriff auf alle Nutzer:innen. Der Super-Admin hat keinen Zugriff auf die Objekte innerhalb einer Institution. Administratoren können Benutzer innerhalb ihrer Institution erstellen und verwalten. Jeder Benutzer muss seine E-Mail-Adresse verifizieren.

14. **Was passiert mit den Objekten, wenn ein Benutzer gelöscht wird?**
    Objekte bleiben der Institution erhalten, auch wenn der erstellende Benutzer gelöscht wird.

15. **Gibt es eine API für HymnoScribe?**
    Aktuell bieten wir keine öffentliche API an. Bei Bedarf können Sie sich für zukünftige Entwicklungen an uns wenden.