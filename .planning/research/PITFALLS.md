# Pitfalls Research

**Domain:** WYSIWYG Songsheet/PDF Editor — Express.js Security Hardening & Layout Engine Unification
**Researched:** 2026-04-07
**Confidence:** HIGH (codebase analysis) / MEDIUM (Express.js security patterns, verified against known practices)

---

## Critical Pitfalls

### Pitfall 1: Konstanten-Divergenz bei der Layout-Engine-Zusammenführung

**What goes wrong:**
Die zwei Dateien `generatePDF.js` und `previewPageBreaks.js` teilen sich logisch die gleichen Konstanten, definieren sie aber unabhängig voneinander — mit unterschiedlichen Werten. Beim Zusammenführen zu einer einzigen Engine kopiert man die Konstanten aus einer Datei und vergisst, dass die andere abweichende Werte hatte. Das Ergebnis: Vorschau und PDF stimmen immer noch nicht überein, aber diesmal subtiler und schwerer zu debuggen.

Konkret im Code belegt:
- `STROPHE_SPACING`: generatePDF.js = `8`, previewPageBreaks.js = `6`
- `DEFAULT_OBJECT_SPACING`: generatePDF.js = `15`, previewPageBreaks.js = `12`
- `COPYRIGHT_FONT_SIZE`: generatePDF.js = `12`, previewPageBreaks.js = `10`

**Why it happens:**
Entwickler schauen beim Refactoring in eine Datei, übernehmen deren Konstanten als "die richtigen" und merken erst durch Nutzertests, dass die andere Datei andere Werte hatte. Keine Tests, die das auffangen.

**How to avoid:**
Vor der Zusammenführung eine explizite Entscheidungstabelle anlegen: Welcher Wert ist korrekt? Warum? Die Entscheidung dokumentieren. Eine einzige `constants.js`-Datei als Single Source of Truth erstellen — niemals Konstanten in zwei Dateien duplizieren.

**Warning signs:**
- Zwei Dateien mit identisch benannten Konstanten existieren
- Visuelle Unterschiede zwischen Vorschau und PDF bestehen nach der Zusammenführung weiter
- "Feintuning" der Vorschau immer wieder nötig ohne klares Ziel

**Phase to address:**
Security + WYSIWYG-Vorschau Phase — als allerersten Schritt, bevor irgendeine Logik verschoben wird.

---

### Pitfall 2: Zwei-Koordinatensystem-Problem (px vs. pt vs. mm)

**What goes wrong:**
`previewPageBreaks.js` arbeitet mit DOM-Pixeln, `generatePDF.js` mit PDF-Punkten (pt). Die Umrechnung geschieht über `PX_TO_PT_RATIO = 0.75`, was aber nur für 96 DPI-Bildschirme stimmt. Beim Zusammenführen der Engines entsteht ein drittes System: Welche Einheit ist kanonisch? Wenn die Entscheidung nicht explizit getroffen wird, mischen sich Einheiten — Abstände werden um Faktor ~1.33 falsch.

**Why it happens:**
PDF-Bibliotheken (pdf-lib) arbeiten in Punkten. DOM-Rendering arbeitet in Pixeln. Die Umrechnung `pt = px * 0.75` gilt nur bei 96 DPI. Browserzoom, HiDPI-Displays oder CSS-Transform-Skalierung der Vorschau (typisch bei WYSIWYG-Previews) macht die Umrechnung unzuverlässig.

**How to avoid:**
Punkt (pt) als kanonische Einheit der Layout-Engine festlegen. Die Vorschau skaliert die pt-Werte auf Pixel via `ptToPx()` — nicht umgekehrt. Niemals DOM-`getBoundingClientRect()`-Werte direkt in die Layout-Berechnung einspeisen; immer über die pt-basierte Engine berechnen und dann rendern.

**Warning signs:**
- Vorschau sieht auf einem Retina-Display anders aus als auf einem normalen
- Abstände stimmen bei Zoom != 100% nicht mehr
- Funktionen nehmen mal `px`, mal `pt` als Parameter ohne Typkommentar

**Phase to address:**
WYSIWYG-Vorschau Phase — Architekturentscheidung für Einheitensystem muss am Anfang stehen.

---

### Pitfall 3: Security-Fixes als Nachrüstung brechen existierende Features

**What goes wrong:**
Rate Limiting auf `/api/login` hinzufügen ist trivial. Rate Limiting auf Password-Reset-Endpunkten, ohne den Passwort-Reset-Flow selbst zu unterbrechen, ist es nicht. Konkret: Der Express.js-Wildcard-CORS-Fix (`['*', 'https://hymnoscribe.de']`) erfordert, dass `process.env.URL` korrekt gesetzt ist — wenn es leer ist, fällt die App auf Wildcard zurück. Ein "Fix" ohne gleichzeitige Validierung des Env-Vars ändert das Verhalten nur in der Happy-Path-Umgebung.

**Why it happens:**
Security-Nachrüstung betrachtet jeden Fix isoliert. Die Abhängigkeiten zwischen Fixes (z.B.: CORS-Fix erfordert Env-Validierung; JWT-Expiry-Reduktion erfordert Refresh-Token-Mechanismus oder Nutzer verlieren alle 1h ihre Session) werden nicht vorab kartiert.

**How to avoid:**
Vor dem ersten Fix eine Dependency-Map aller Security-Maßnahmen erstellen:
- CORS-Fix → Env-Var-Validierung
- JWT-Expiry kürzen → Refresh-Token oder explizite Nutzerkommunikation
- Rate Limiting → IP-Whitelisting für eigene Services / Tests
- TLS-Fix Nodemailer → Test-SMTP-Setup muss ebenfalls TLS unterstützen

**Warning signs:**
- Fix funktioniert in Entwicklung, bricht aber in Produktion
- Nach Deployment: Nutzerbeschwerden über unerklärliche Logouts oder Email-Fehler
- Security-Fixes werden einzeln deployed ohne Integrationstests

**Phase to address:**
Security-Härtung Phase — Dependency-Map als erstes Deliverable der Phase.

---

### Pitfall 4: Monolith-Refactoring zerstört implizite Reihenfolge-Abhängigkeiten

**What goes wrong:**
`server.js` ist 1463 Zeilen. Middleware-Registrierungsreihenfolge in Express ist bedeutungstragend: `app.use(cors())` muss vor Routen stehen, der Auth-Middleware-Check muss vor geschützten Routen stehen, `compression()` muss vor statischem Serving stehen. Beim Aufteilen in `routes/`, `middleware/`, `controllers/` verschwindet die visuelle Reihenfolge — und die Registrierung in einer neuen `app.js` muss dieselbe Reihenfolge garantieren.

**Why it happens:**
Entwickler extrahieren Dateien thematisch (alle Auth-Routen zusammen), ohne die Ausführungsreihenfolge der Registrierungen zu dokumentieren. Resultat: CORS-Middleware wird nach den ersten Routen registriert, Auth-Check kommt zu spät.

**How to avoid:**
Vor dem ersten Refactoring-Commit die gesamte Middleware-Kette in `server.js` als kommentierte Liste dokumentieren (Zeile → Funktion → Zweck). Diese Liste wird zur Blaupause für die neue `app.js`. Jede Extraktion wird gegen diese Liste geprüft.

**Warning signs:**
- Nach Extraktion: API-Calls bekommen unerwartet 401 oder CORS-Fehler
- Tests (wenn vorhanden) schlagen sporadisch je nach Reihenfolge fehl
- `app.use()` Calls erscheinen in der neuen `app.js` in anderer Reihenfolge als in der alten `server.js`

**Phase to address:**
Backend-Modularisierung Phase — Reihenfolge-Dokumentation als Precondition, nicht als Nacharbeit.

---

### Pitfall 5: Credential-Logging-Fix reicht nicht allein

**What goes wrong:**
`console.log('Database config:', { host, user, password, database })` in Zeile 17-22 wird entfernt. Fertig? Nein. Die eigentliche Frage ist: Wer hat Zugriff auf die bestehenden Logs? Docker-Logs, die bereits produziert wurden, enthalten das Passwort. Wenn diese Logs an einen externen Dienst gesendet wurden (Papertrail, Datadog etc.), ist das Passwort dort bereits gespeichert. Der Fix ist nur vollständig mit einer Passwort-Rotation.

**Why it happens:**
Credential-Logging wird als Code-Problem behandelt (Zeile löschen = fertig) statt als Incident (Was wurde bereits geloggt? Wo liegen diese Logs?).

**How to avoid:**
Fix in zwei Schritten: 1) Zeile entfernen, 2) DB-Passwort rotieren und Docker-Compose-Secrets aktualisieren. Außerdem: `docker logs`-Rotation prüfen — alte Logs sollten gelöscht werden.

**Warning signs:**
- Fix committed, aber kein Passwort-Rotations-Ticket erstellt
- `docker logs hymnoscribe-backend | grep password` zeigt noch Einträge in alten Log-Segmenten

**Phase to address:**
Security-Härtung Phase — als erster Fix (da kein Breaking Change), aber mit explizitem Passwort-Rotations-Schritt.

---

### Pitfall 6: SQL-Injection-Fix für Schema-Operationen führt zu über-parameterisierten Queries

**What goes wrong:**
`SHOW TABLES LIKE '${tableName}'` in Zeile 1235 ist SQL-Injection-anfällig. Der intuitive Fix — parameterisierte Queries — funktioniert für `SHOW TABLES LIKE ?` in manchen MySQL-Treibern nicht korrekt, weil DDL-Statements keine Parameter-Binding-Unterstützung haben. Statt korrekt zu fixen, verwendet man dann entweder einen defekten parameterisierten Query oder bleibt bei der Interpolation.

**Why it happens:**
Parameterisierte Queries sind der Standardratschlag für SQL Injection. DDL-Statements (SHOW, CREATE, ALTER) unterstützen aber kein Parameter-Binding in mysql2. Der Entwickler probiert `?`-Binding, es funktioniert nicht, frustriert bleibt er bei der unsicheren Version.

**How to avoid:**
Der korrekte Fix für Schema-Operationen ist eine Whitelist-Validierung des `tableName`-Parameters gegen bekannte, erlaubte Tabellennamen — bevor der Query gebaut wird. Kein Nutzer-Input sollte je als `tableName` in Schema-Operationen ankommen. Zusätzlich: Diese Funktionen (`createOrUpdateTable`, `addColumnIfNotExists`) sind nur zur Initialisierungszeit aufzurufen, daher kann der Input gegen eine hardcodierte Liste gültiger Tabellen validiert werden.

**Warning signs:**
- `tableName` wird aus Nutzer-Input oder Request-Body bezogen
- Parameterisierter Query für DDL-Statement schlägt mit mysql2-Fehler fehl
- Kommentar "TODO: Parameterisierung hier nicht möglich" in Code

**Phase to address:**
Security-Härtung Phase — zusammen mit der Dokumentation aller SQL-Queries.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Alle Routen in server.js | Schnelle Entwicklung, ein Kontext | Jede Änderung braucht Kenntnis von 1463 Zeilen; Testbarkeit null | Nur bei Prototypen unter 300 Zeilen |
| Zwei Layout-Engines (Preview + PDF) | Unabhängige Optimierung beider Systeme | Konstanten-Drift, doppelte Bugs, Trial-and-Error für Nutzer | Nie — eine Engine oder expliziter Adapter |
| `queueLimit: 0` (unbegrenzte DB-Queue) | Kein Request schlägt mit Queue-Full-Fehler fehl | Unter Last: Memory-Erschöpfung, Requests warten unbegrenzt | Nur wenn Load Balancer vorgelagert Request-Limits durchsetzt |
| JWT ohne Refresh-Token (3h Lifetime) | Einfach zu implementieren | Langer Replay-Angriffszeitraum; Logout invalidiert Token nicht | Akzeptabel als erstes Deployment, muss aber auf Roadmap |
| JSON als String in DB-Spalte | Kein Schema-Design nötig | Kein Indexing, keine Validierung, Parsing-Fehler nicht abfangbar | Für prototypische Sessions/Vorlagen temporär akzeptabel |
| `rejectUnauthorized: false` bei Nodemailer | Funktioniert mit selbstsignierten Zertifikaten | MitM-Angriffe auf Mailverkehr möglich; Credentials übertragbar | Nur lokal, nie in Produktion |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| pdf-lib mit DOM-Preview | DOM-Höhen via `getBoundingClientRect()` als Grundlage für PDF-Koordinaten nehmen | pt-basierte Layout-Engine berechnet Höhen; DOM-Preview rendert diese pt-Werte; keine DOM-Messungen als Quelle |
| express-rate-limit | Limiter global auf alle Routes anwenden, dadurch API-Healthchecks oder Monitoring gedrosselt | Limiter selektiv auf Auth-Endpunkte anwenden; `skip`-Option für interne IPs nutzen |
| Nodemailer + TLS | `rejectUnauthorized: false` für SMTP-Kompatibilität belassen | TLS-Config entfernen, damit sichere Defaults greifen; separates Test-SMTP (z.B. Mailhog) für lokale Entwicklung |
| mysql2 DDL-Statements | Parameter-Binding (`?`) für `SHOW TABLES` und `ALTER TABLE` versuchen | Whitelist-Validierung des Tabellennamens; DDL-Queries nie mit Nutzer-Input aufrufen |
| bcrypt in Tests | Echte bcrypt-Hashes in Tests generieren (langsam) | bcrypt in Tests mocken oder `bcrypt.hash` mit `saltRounds: 1` aufrufen |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchrones Cron-Image-Cleanup | Server friert kurz ein, API-Calls verzögern sich stündlich | Cleanup async mit Pagination; `setImmediate` zwischen Batches | Ab ~1000 Upload-Dateien |
| PDF-Generierung im Main Thread | Browser friert während PDF-Export ein; UI unbedienbar | Web Worker für PDF-Berechnung; Progress-Callback in generatePDF | Ab ~30-40 Elementen im Liedblatt |
| `queueLimit: 0` in Connection Pool | Unter Last: wachsende Speichernutzung, Requests hängen | `queueLimit: 100` + Request-Timeout setzen | Ab ~15 gleichzeitigen Requests |
| Ungecachte Font-Ladevorgänge in pdf-lib | Jeder PDF-Export lädt Fonts neu vom Server | Fonts einmalig laden und im Memory halten; `fetchFont` nur beim ersten Aufruf | Ab erstem parallelen Export-Versuch |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| CORS-Wildcard als Fallback | Bei fehlendem `URL`-Env-Var akzeptiert API Requests von jeder Origin | `URL`-Env-Var als Pflichtfeld validieren beim Start; App-Start abbrechen wenn nicht gesetzt |
| Credential-Logging ohne Rotation | Passwort in Docker-Logs; wenn Logs extern gespeichert, dauerhaft kompromittiert | Logging entfernen + sofortige Passwort-Rotation als untrennbares Fix-Paket |
| Super-Admin via Env-Var-Plaintext-Vergleich | `SUPER_PASSWORD` im Env kompromittiert = voller Admin-Zugriff; kein Audit-Log | Zumindest alle Super-Admin-Aktionen loggen; langfristig: MFA oder separate Admin-Authentifizierung |
| Email-Verification-Token ohne Expiry | Token gültig für immer; Leak = permanente Account-Übernahme | `verification_token_expires` Spalte + 24h-Expiry analog zu Password-Reset |
| Passwort-Änderung invalidiert JWT nicht | Nutzer mit gestohlenem Token bleibt bis Expiry (3h) authentifiziert | Token-Version pro User in DB; bei Passwort-Änderung inkrementieren; JWT-Validierung prüft Version |
| Institution-Isolation nicht getestet | Nutzer von Institution A könnte auf Daten von Institution B zugreifen — unentdeckt | Integration-Tests für Institution-Isolation als Blocker für jedes neue Feature |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Vorschau und PDF divergieren | Nutzer druckt nach Trial-and-Error; Kernversprechen der App gebrochen | Eine Layout-Engine; Vorschau ist skalierter Render desselben Algorithmus |
| Rate-Limiting ohne Nutzerfeedback | Login-Versuch schlägt still fehl; Nutzer denkt, Passwort falsch | HTTP 429 mit `Retry-After`-Header + sichtbare Fehlermeldung "Zu viele Versuche, bitte warten" |
| Passwort-Komplexitätsprüfung nur serverseitig | Nutzer füllt Formular aus, submittet, bekommt Fehler erst dann | Client-seitige Live-Validierung + Server-Validierung; sofortiges visuelles Feedback |
| JWT-Session nach 1h (wenn verkürzt) ohne Erklärung | Nutzer verliert alle ungespeicherten Änderungen; denkt, App ist kaputt | Toast-Notification vor Expiry ("Session läuft in 5 Minuten ab"); Auto-Save des aktuellen Liedblatt-Entwurfs |

---

## "Looks Done But Isn't" Checklist

- [ ] **CORS-Fix:** Nur `['*']` entfernt — verify: Env-Var-Validierung erzwingt explizite Origin-Konfiguration beim Start
- [ ] **Credential-Logging:** Nur `console.log`-Zeile gelöscht — verify: DB-Passwort wurde rotiert, alte Docker-Logs gelöscht
- [ ] **Rate Limiting:** Nur Login gedrosselt — verify: Password-Reset, Email-Verification, Kontaktformular ebenfalls limitiert
- [ ] **SQL-Injection-Fix:** Nur offensichtliche Interpolationen gepatcht — verify: Alle `server.js`-Queries auf String-Interpolation mit Nutzer-Input geprüft
- [ ] **Layout-Engine-Unifikation:** Konstanten in eine Datei gezogen — verify: Alle Werte wurden verglichen und bewusst gewählt, nicht blind übernommen
- [ ] **TLS-Fix Nodemailer:** `rejectUnauthorized: false` entfernt — verify: Email-Delivery in Staging-Umgebung mit echtem SMTP-Server getestet
- [ ] **Monolith-Split:** Dateien aufgeteilt — verify: Middleware-Registrierungsreihenfolge in neuer `app.js` identisch zur alten `server.js`
- [ ] **Email-Verification-Expiry:** Spalte hinzugefügt — verify: Migration läuft durch, bestehende Tokens werden korrekt behandelt (nicht sofort invalidiert)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Konstanten-Divergenz nach Zusammenführung | MEDIUM | Beide alten Dateien aus git-History holen; Konstanten-Diff erstellen; Werte manuell abgleichen und begründen |
| CORS-Wildcard in Produktion aktiviert | LOW | Env-Var `URL` setzen und Container neu starten; kein Code-Change nötig |
| Credential-Logging bereits in externen Logs | HIGH | Passwort rotieren; alle aktiven DB-Connections prüfen; Log-Retention-Policy für externen Dienst prüfen/löschen |
| Middleware-Reihenfolge nach Refactoring falsch | MEDIUM | `git diff` auf Middleware-Registrierungen; Reihenfolge in `app.js` anhand alter `server.js` korrigieren |
| Rate-Limit bricht legitime Nutzung | LOW | `skip`-Option für spezifische IPs oder User-Agents; Limit-Werte lockern; Whitelist für CI/CD-Healthchecks |
| PDF stimmt nach Engine-Unifikation immer noch nicht | HIGH | Regression: beide alten Engines als Referenz testen; Output-Vergleich mit vorher aufgezeichneten PDFs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Konstanten-Divergenz | WYSIWYG-Vorschau (Beginn) | Einzige `constants.js` Datei; kein `grep -r "STROPHE_SPACING"` findet mehr als einen Treffer |
| Zwei-Koordinatensystem | WYSIWYG-Vorschau (Architektur) | Alle Layout-Berechnungen in pt; DOM-Render-Funktionen konvertieren pt → px |
| Security-Fixes brechen Features | Security-Härtung (Planung) | Dependency-Map dokumentiert; alle Fixes in einem Branch zusammen getestet |
| Monolith-Refactoring bricht Middleware-Reihenfolge | Backend-Modularisierung | Middleware-Reihenfolge-Test: Request durch jeden Layer; Integrationstests für Auth + CORS |
| Credential-Logging unvollständig gefixt | Security-Härtung (erster Fix) | `docker logs` zeigt keine Credentials; Passwort-Rotation dokumentiert |
| SQL-Injection DDL | Security-Härtung | Code-Review: kein Nutzer-Input in Schema-Funktionen; Whitelist-Validierung testbar |
| Institution-Isolation nicht getestet | Jede Phase mit neuen API-Endpunkten | Cross-Institution-Test läuft für jeden neuen Endpunkt als Pflicht |
| JWT ohne Invalidierung | Security-Härtung oder eigene Phase | Passwort-Änderungs-Test prüft, dass alter Token abgelehnt wird |

---

## Sources

- Codebase-Analyse: `backend/server.js` (direkte Code-Inspektion, Zeilen 17-22, 40, 360, 1235, 1252, 1255, 1280, 1290)
- Codebase-Analyse: `frontend/js/generatePDF.js` vs. `frontend/js/previewPageBreaks.js` (Konstanten-Divergenz direkt belegt)
- `.planning/codebase/CONCERNS.md` (dokumentierte Schwachstellen, 2026-04-07)
- Express.js-Dokumentation: Middleware-Registrierungsreihenfolge ist bedeutungstragend (HIGH confidence)
- mysql2-Dokumentation: DDL-Statements unterstützen kein Parameter-Binding (MEDIUM confidence, bekanntes Verhalten)
- pdf-lib: arbeitet in Punkten (pt), nicht Pixeln (HIGH confidence, direkt im Code sichtbar)

---
*Pitfalls research for: WYSIWYG Songsheet/PDF Editor — HymnoScribe*
*Researched: 2026-04-07*
