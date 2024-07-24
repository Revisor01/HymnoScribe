# HymnoScribe

[![Docker](https://github.com/Revisor01/HymnoScribe/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Revisor01/HymnoScribe/actions/workflows/docker-publish.yml)

HymnoScribe ist ein umfassendes Tool zur Erstellung von Gottesdienst-Liedblättern. Es bietet eine benutzerfreundliche Oberfläche zum Erstellen, Bearbeiten und Verwalten von Gottesdienstobjekten sowie zur Generierung von PDF-Liedblättern.

## Funktionen

- Verwaltung von verschiedenen Gottesdienstobjekten (Lieder, Gebete, Lesungen, etc.)
- Drag-and-Drop-Interface zur einfachen Erstellung von Liedblättern
- PDF-Generierung mit anpassbaren Layouts (A5, DIN Lang, A4 schmal)
- Session-Management zum Speichern und Laden von Liedblatt-Entwürfen
- Vorlagen-System für häufig verwendete Liedblatt-Strukturen
- Unterstützung für Noten-Bilder (mit und ohne Text)
- Benutzerdefinierte Bilder und Logos
- Responsives Design für Desktop- und mobile Nutzung

## Installation und Nutzung

### Lokale Installation

1. Klonen Sie das Repository:
   ```
   git clone https://github.com/Revisor01/HymnoScribe.git
   ```

2. Navigieren Sie in das Projektverzeichnis:
   ```
   cd HymnoScribe
   ```

3. Installieren Sie die Abhängigkeiten:
   ```
   npm install
   ```

4. Starten Sie den Server:
   ```
   npm start
   ```

5. Öffnen Sie einen Webbrowser und navigieren Sie zu `http://localhost:3000`

### Docker-Nutzung

Sie können HymnoScribe auch über Docker ausführen:

```
docker run -p 3000:3000 -v /pfad/zum/upload/ordner:/app/uploads revisoren/hymnoscripe:latest
```

## Entwicklung

HymnoScribe verwendet GitHub Actions für kontinuierliche Integration und Bereitstellung. Bei jedem Push in den `main`-Branch wird automatisch ein neues Docker-Image gebaut und auf Docker Hub veröffentlicht.

## Beitrag

Beiträge zum Projekt sind willkommen. Bitte erstellen Sie einen Pull Request oder eröffnen Sie ein Issue für Vorschläge und Fehlermeldungen.

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. Siehe die [LICENSE](LICENSE) Datei für Details.