# Gottesdienst-Liedblatt Generator

Dieses Projekt ist ein umfassendes Tool zur Erstellung von Gottesdienst-Liedblättern. Es bietet eine benutzerfreundliche Oberfläche zum Erstellen, Bearbeiten und Verwalten von Gottesdienstobjekten sowie zur Generierung von PDF-Liedblättern.

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

1. Klonen Sie das Repository:
   ```
   git clone https://github.com/ihr-benutzername/gottesdienst-liedblatt-generator.git
   ```

2. Navigieren Sie in das Projektverzeichnis:
   ```
   cd gottesdienst-liedblatt-generator
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

## Docker-Nutzung

1. Bauen Sie das Docker-Image:
   ```
   docker build -t gottesdienst-liedblatt-generator .
   ```

2. Starten Sie den Container:
   ```
   docker run -p 3000:3000 -v /pfad/zum/upload/ordner:/app/uploads gottesdienst-liedblatt-generator
   ```

## Hinweise zur Nutzung

- **Admin-Oberfläche**: Verwenden Sie die Admin-Oberfläche, um neue Gottesdienstobjekte hinzuzufügen oder bestehende zu bearbeiten.
- **Liedblatt-Erstellung**: Ziehen Sie Objekte aus dem Pool in den Arbeitsbereich, um Ihr Liedblatt zu gestalten.
- **PDF-Generierung**: Wählen Sie das gewünschte Format und klicken Sie auf "PDF generieren", um Ihr Liedblatt als PDF zu erstellen.
- **Sessions und Vorlagen**: Nutzen Sie das Session-Management, um Ihre Arbeit zu speichern und später fortzusetzen. Erstellen Sie Vorlagen für wiederkehrende Liedblatt-Strukturen.

## Hinweise zur Ausgabe

- Die generierten PDFs sind optimiert für die Druckausgabe in A4 und A3 duplex.
- Die Broschüren-Option ermöglicht es, Liedblätter im Booklet-Format zu erstellen, ideal für gefaltete Gottesdienstordnungen.

## Beitrag

Beiträge zum Projekt sind willkommen. Bitte erstellen Sie einen Pull Request oder eröffnen Sie ein Issue für Vorschläge und Fehlermeldungen.

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. Siehe die [LICENSE](LICENSE) Datei für Details.
