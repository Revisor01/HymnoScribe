# Changelog

Alle nennenswerten Änderungen an HymnoScribe werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [1.5.0] – 2026-08-02

### Added
- **WYSIWYG-Liedblatt-Editor**: Eine einzige Rendering-Engine (`engine.js`) für
  Vorschau und PDF — die Vorschau zeigt exakt das spätere Druckbild inkl.
  Seitenumbrüchen (`domRenderer.js` für die DOM-Vorschau, `pdfRenderer.js` für
  pdf-lib; `generatePDF.js`/`previewPageBreaks.js` nur noch Thin-Wrapper)
- Per-Element-Kontrollen in der Vorschau: Schriftgrößen-Overrides (global +
  pro Element), Abstands-Handles zum Ziehen zwischen Elementen,
  Bildgrößen-Handles mit festem Seitenverhältnis
- Element-Reihenfolge per Drag-and-Drop (SortableJS): Strophen/Refrains
  umsortieren, Refrain duplizieren, Strophenauswahl per Checkbox,
  Refrain wahlweise vollständig oder nur als Verweis
- Format-Switch in der Toolbar (A5, A4, A3, DIN-Lang) mit sofortigem Re-Layout
- Strophen-Split über Seitengrenzen (`pushTextBlock()` mit Mindestzeilen-Regel)
- Overrides werden in Sessions/Vorlagen serialisiert und im PDF berücksichtigt
- Security-Hardening im Backend: `helmet`, `express-rate-limit`,
  `express-validator`
- Caching, Connection-Pooling und Lazy Loading für Bilder

### Changed
- Backend modularisiert: monolithisches `server.js` aufgeteilt in `app.js`,
  `routes/`, `services/` und `db/pool.js`

### Fixed
- Alle 53 offenen Dependabot-Alerts behoben (u. a. kritische `tar`-Kette):
  `bcrypt` 5→6, `uuid` 10→11, `node-cron` 3→4, `nodemailer` 6→9,
  `multer` 1.4→2.0 sowie transitive Updates via `npm audit fix`;
  Platzhalter-Paket `fs` entfernt — `npm audit`: 0 Vulnerabilities
- CSP erlaubt Inline-Event-Handler (`script-src-attr`) und Google Fonts —
  ohne diesen Fix wären alle Buttons in dashboard/bibliothek blockiert gewesen

### Security
- Fallback-Passwörter aus `docker-compose.yml` entfernt — Passwörter müssen
  explizit in `.env` gesetzt sein

## [1.4.2] – 2024-08-08
### Fixed
- Nachbesserungen an Layout-Optimierung und Theme-Vorbereitung aus 1.4.1

## [1.4.1] – 2024-08-08
### Changed
- Layout-Optimierung im gesamten Frontend, Vorbereitung für Themes

## [1.4.0] – 2024-08-03
### Added
- Verbesserte Liedstruktur (Strophen/Refrain-Handling)
### Changed
- Datenbankoptimierung, UX-Verfeinerungen, README aktualisiert

## [1.3.2] – 2024-08-02
### Added
- Verbesserte Nutzerverifizierung
### Changed
- Mobile Optimierung der Oberfläche

## [1.3.1] – 2024-08-02
### Fixed
- Mail-Verifizierungsprozess verbessert
### Security
- Dependabot: `semver`/`nodemon` aktualisiert

## [1.3.0] – 2024-08-01
### Changed
- Umfassende Systemüberarbeitung und Erweiterung (Multi-Tenant-Ausbau,
  E-Mail-Flows, Verwaltung)

## [1.2.0] – 2024-07-26
### Changed
- Entwicklungsumgebung optimiert, Bibliotheken aktualisiert und neu geordnet

## [1.1.4] – 2024-07-25
### Removed
- Alte, ungenutzte Bibliotheken entfernt

## [1.1.3] – 2024-07-25
### Added
- Erweiterte Schriftarten-Auswahl
### Changed
- Schriftarten-Handling performanter

## [1.1.2] – 2024-07-25
### Added
- Kleinere neue Funktionen
### Fixed
- Diverse Fehlerbehebungen

## [1.1.1] – 2024-07-25
### Fixed
- Diverse Verbesserungen und Fehlerbehebungen nach dem Produktions-Release

## [1.1.0] – 2024-07-24
### Added
- Docker-basierte Produktionsumgebung
- JPG-Verarbeitung im PDF, Dateityp-Erkennung
### Fixed
- Uploadpfade für Lieder/Liturgie, Zeilenumbrüche in Strophen bleiben erhalten

## [1.0.0] – 2024-07-21
### Added
- Erste Veröffentlichung: Liedblatt-Editor mit Drag-and-Drop,
  PDF-Generierung (pdf-lib), Bibliothek für Lieder/Liturgien/Gebete/Lesungen,
  Multi-Tenant-Verwaltung mit Institutionen

[Unreleased]: https://github.com/Revisor01/HymnoScribe/compare/1.5.0...HEAD
[1.5.0]: https://github.com/Revisor01/HymnoScribe/compare/1.4.2...1.5.0
[1.4.2]: https://github.com/Revisor01/HymnoScribe/compare/1.4.1...1.4.2
[1.4.1]: https://github.com/Revisor01/HymnoScribe/compare/1.4.0...1.4.1
[1.4.0]: https://github.com/Revisor01/HymnoScribe/compare/1.3.2...1.4.0
[1.3.2]: https://github.com/Revisor01/HymnoScribe/compare/1.3.1...1.3.2
[1.3.1]: https://github.com/Revisor01/HymnoScribe/compare/1.3.0...1.3.1
[1.3.0]: https://github.com/Revisor01/HymnoScribe/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/Revisor01/HymnoScribe/compare/1.1.4...1.2.0
[1.1.4]: https://github.com/Revisor01/HymnoScribe/compare/1.1.3...1.1.4
[1.1.3]: https://github.com/Revisor01/HymnoScribe/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/Revisor01/HymnoScribe/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/Revisor01/HymnoScribe/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/Revisor01/HymnoScribe/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/Revisor01/HymnoScribe/releases/tag/1.0.0
