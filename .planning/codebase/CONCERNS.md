# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

**Monolithic Backend Server:**
- Issue: Single 1463-line `server.js` file contains all routes, middleware, utilities, database operations, and email handling
- Files: `backend/server.js`
- Impact: Difficult to test, maintain, and debug; changes in one area risk breaking unrelated functionality; no separation of concerns
- Fix approach: Refactor into modular structure with separate files for routes (`routes/`), controllers (`controllers/`), middleware (`middleware/`), utilities (`utils/`), and database operations (`db/`)

**No Testing Infrastructure:**
- Issue: Zero test files; `package.json` has placeholder test script that immediately exits with error
- Files: `backend/package.json` (line 9: `"test": "echo \"Error: no test specified\" && exit 1"`)
- Impact: No regression detection; backend changes create risk of breaking existing functionality; critical auth/PDF generation logic untested
- Fix approach: Set up Jest/Vitest testing framework; add unit tests for auth middleware, password reset flow, PDF generation logic; achieve 70%+ coverage for critical paths

**Frontend Monolithic Files:**
- Issue: Large frontend files lack modularity: `generatePDF.js` (1919 lines), `previewPageBreaks.js` (1007 lines), `liedblattManagement.js` (971 lines), `bibliothek.js` (839 lines)
- Files: `frontend/js/generatePDF.js`, `frontend/js/previewPageBreaks.js`, `frontend/js/liedblattManagement.js`, `frontend/js/bibliothek.js`
- Impact: Functions intertwined with side effects; high cognitive load; difficult to test or reuse logic; changes require understanding entire file
- Fix approach: Extract pure functions (PDF rendering algorithms, page break logic, validation); split files at logical boundaries; consider module bundler (Vite/Webpack)

**SQL Injection Vulnerability:**
- Issue: String interpolation in SQL queries using template literals
- Files: `backend/server.js` lines 1235, 1252, 1255 (functions `createOrUpdateTable`, `addColumnIfNotExists`)
- Example: `` const [rows] = await conn.query(`SHOW TABLES LIKE '${tableName}'`); `` (line 1235)
- Impact: If `tableName` contains SQL injection payload, database metadata could be exposed or modified; unlikely in current architecture but violation of parameterized query principle
- Fix approach: Use parameterized queries or prepared statements; never interpolate user input into SQL; only use for schema operations if absolutely necessary, validate tableName against whitelist

**Sensitive Data Logging:**
- Issue: Database configuration credentials logged at startup
- Files: `backend/server.js` lines 17-22
- Code: `console.log('Database config:', { host, user, password, database })`
- Impact: Password visible in application logs; if logs sent to external service or accessed by unauthorized user, credentials exposed; violates principle of least exposure
- Fix approach: Remove sensitive data from console output; log only `host` and `database` name; use environment variable validation without echoing values

**TLS Certificate Validation Disabled:**
- Issue: Email transport explicitly disables certificate validation
- Files: `backend/server.js` line 1290
- Code: `rejectUnauthorized: false` in nodemailer TLS config
- Impact: Vulnerable to man-in-the-middle attacks on email transmission; credentials/tokens sent over potentially compromised connection
- Fix approach: Remove TLS config entirely to use secure defaults, or set `rejectUnauthorized: true`; use proper certificate chain in production environment

**Default Database Credentials:**
- Issue: Docker Compose uses weak default credentials visible in configuration
- Files: `docker-compose.yml` lines 11, 35, 38
- Values: `hymnoscribe9715` appears as default for DB_PASSWORD and MYSQL_ROOT_PASSWORD
- Impact: If defaults not overridden in deployment, database accessible with known credentials; weak credential across instances
- Fix approach: Generate strong random secrets; require explicit environment variable override; never use hardcoded defaults in production configs; add validation to ensure non-default passwords used

## Security Considerations

**JWT Token Expiration Too Long:**
- Risk: 3-hour JWT token lifetime allows extended window for token theft/replay attacks
- Files: `backend/server.js` line 360
- Code: `{ expiresIn: '3h' }`
- Mitigation: Tokens still expire, but longer than typical (15-60 min); refresh token mechanism not implemented
- Recommendations: Reduce to 1 hour for regular users; implement refresh tokens for longer sessions; add token revocation list for logout functionality

**Email Verification Token Not Time-Limited:**
- Risk: Email verification tokens have no expiration; valid indefinitely
- Files: `backend/server.js` lines 258-259 (no expiration set unlike password reset)
- Impact: If token leaked, anyone can verify/hijack email address forever
- Recommendations: Add `verification_token_expires` timestamp; validate expiration in verification endpoint; expire after 24 hours

**Missing Rate Limiting:**
- Risk: No rate limiting on login, password reset, email verification endpoints
- Files: `backend/server.js` lines 226, 246, 288, 331, 348
- Impact: Brute force attacks on passwords, enumeration of valid emails, denial of service
- Recommendations: Add express-rate-limit middleware; limit login to 5 attempts/15min per IP; limit password reset to 3 requests/hour per email

**CORS Configuration Too Permissive:**
- Risk: CORS origin includes wildcard fallback
- Files: `backend/server.js` line 40
- Code: `origin: process.env.URL ? process.env.URL.split(',') : ['*', 'https://hymnoscribe.de']`
- Impact: If URL env var missing/empty, any origin can make requests; cross-site request forgery possible
- Recommendations: Remove wildcard from default; require explicit URL configuration; whitelist specific domains only

**No Password Validation Rules:**
- Risk: No enforced password complexity, length, or uniqueness
- Files: `backend/server.js` line 278, 337
- Impact: Users can set weak passwords; no validation when setting/resetting password
- Recommendations: Enforce minimum 12 characters, require mixed case + numbers + symbols; use password strength library

**Super Admin Via Environment Variable:**
- Risk: Super admin access granted by matching environment variable against plaintext input
- Files: `backend/server.js` line 378
- Code: `if (superPassword === process.env.SUPER_PASSWORD)`
- Impact: If SUPER_PASSWORD environment variable compromised, attacker gains administrative access; no audit trail
- Recommendations: Require multi-factor authentication for super-admin access; use secure key exchange instead of environment variable comparison; log all super-admin actions

## Performance Bottlenecks

**Synchronous Image Cleanup in Cron Job:**
- Problem: Hourly cron job scans all uploads directories and queries database synchronously
- Files: `backend/server.js` lines 63-71, 1409-1452
- Cause: Operations block if many files present; no pagination; directory reads sequential
- Impact: If thousands of uploads exist, cleanup could take minutes and block other operations
- Improvement path: Make cleanup asynchronous with pagination; run during off-peak hours; add database index on objekte.notenbild and notenbildMitText; consider soft-delete pattern instead of physical deletion

**No Database Connection Pooling Optimization:**
- Problem: Fixed connection limit of 10; no queue size limit
- Files: `backend/server.js` lines 24-32
- Impact: Under high load, requests exceed pool size; 11th concurrent request waits indefinitely (queueLimit: 0 = unlimited queue)
- Improvement path: Increase pool to 20-30 for expected load; set reasonable queueLimit (e.g., 100); add monitoring for pool exhaustion; implement request timeout

**PDF Generation Not Optimized:**
- Problem: Entire PDF generated in-memory; no streaming; complex layout calculations done synchronously
- Files: `frontend/js/generatePDF.js` (1919 lines, contains many layout calculations)
- Impact: Large PDFs (100+ items) will freeze UI; no progress indication; memory spike when downloading
- Improvement path: Stream PDF generation; move calculations to Web Worker; add progress callback; implement pagination for very large documents

**Image Upload Stores Original Filename:**
- Problem: Custom images stored with timestamp prefix but original filename preserved
- Files: `backend/server.js` line 93
- Code: `cb(null, Date.now() + '-' + file.originalname);`
- Impact: Large file trees; repeated uploads of same content create duplicates; no deduplication
- Improvement path: Hash file content; store once with hash as filename; maintain reference count; clean up when count reaches zero

## Fragile Areas

**Email Service Failure Cascades:**
- Files: `backend/server.js` lines 525-532 (new user creation)
- Why fragile: If email sending fails, user is deleted from database; no retry mechanism; transient SMTP failures break user creation
- Safe modification: Wrap email operations in try-catch with specific error handling; create user first, send email asynchronously; add email queue with retry logic (Bull, RabbitMQ)
- Test coverage: No tests for email failure scenarios; welcome email sending untested

**Institution Deletion Cascades Without Validation:**
- Files: `backend/server.js` lines 461-498
- Why fragile: Hard delete of institution cascades to users, sessions, vorlagen, objekte; no soft-delete; no archive option; accidental deletion loses data permanently
- Safe modification: Require confirmation with institution name typed; soft-delete (add deleted_at timestamp); generate export before deletion; add audit log
- Test coverage: No integration tests for cascade delete; orphaned sessions/vorlagen not tested

**Session/Vorlagen Data Stored as JSON String:**
- Files: `backend/server.js` lines 1024, 1074; `init.sql` lines 44, 54
- Why fragile: JSON stored as string in database; parsing/stringification manual; no schema validation; circular references could cause JSON.stringify to fail
- Safe modification: Use proper JSON schema validation; consider storing as separate table columns for frequently accessed fields; add migration to validate existing data on load
- Test coverage: No tests for malformed JSON data; no validation of loaded vorlagen/sessions

**Orphaned User Sessions on Role Change:**
- Files: `backend/server.js` (no endpoint to revoke existing sessions on password/role change)
- Why fragile: JWT tokens issued; no token revocation; changing password doesn't invalidate existing tokens; user still authenticated with old token
- Safe modification: Maintain token blacklist or issue version number per user; increment on password change; validate token version matches user's current version
- Test coverage: No tests verifying logout invalidates tokens; password change doesn't test token expiry

**Page Break Preview Logic Complex and Untested:**
- Files: `frontend/js/previewPageBreaks.js` (1007 lines)
- Why fragile: Complex page layout calculations; many constants (STROPHE_SPACING, MAX_STROPHES_BEFORE_BREAK); changes to one constant affect entire layout; no unit tests
- Safe modification: Extract layout algorithm into pure function; add data-driven tests with example inputs; document layout rules in comments
- Test coverage: No tests; discovered by user testing only

## Test Coverage Gaps

**Authentication Flow Untested:**
- What's not tested: Login with correct/incorrect password, token verification, role-based access control, token expiration
- Files: `backend/server.js` lines 348-369 (login), 105-141 (auth middleware)
- Risk: Auth bypass bugs introduced without detection; privilege escalation unnoticed until production
- Priority: High

**Email Workflows Untested:**
- What's not tested: Password reset token generation, email verification, email change flow, welcome email
- Files: `backend/server.js` lines 196-219 (contact), 226-243 (request reset), 246-268 (request verification), 288-328 (verify), 1295-1320 (password reset), 1323-1349 (change email verification)
- Risk: Email delivery failures, token injection, SQL injection via email fields (if unsanitized)
- Priority: High

**PDF Generation Untested:**
- What's not tested: Text wrapping, page breaks, font rendering, image scaling, layout with various content types
- Files: `frontend/js/generatePDF.js` (entire file)
- Risk: PDF corrupted in production; users report broken layouts; no regression detection for layout changes
- Priority: High

**Permission System Untested:**
- What's not tested: Institution isolation (users from Institution A accessing Institution B data), admin-user boundaries, super-admin capabilities
- Files: `backend/server.js` (permission checks scattered throughout)
- Risk: Data leakage between institutions; privilege escalation undetected
- Priority: High

**Database Integrity Untested:**
- What's not tested: Foreign key constraints, cascade deletes, transaction rollback on error
- Files: `backend/server.js` lines 1120-1231 (database initialization)
- Risk: Orphaned records, data corruption, inconsistent state after failures
- Priority: Medium

**Frontend Form Validation Untested:**
- What's not tested: Empty input validation, XSS prevention, CSRF tokens, sanitization
- Files: `frontend/js/admin.js`, `frontend/js/bibliothek.js`
- Risk: Malicious input reaches backend; user data corrupted; stored XSS in display
- Priority: Medium

## Missing Critical Features

**No Audit Logging:**
- Problem: No record of who created/modified/deleted objects; no timestamps for updates; super-admin access not logged
- Blocks: GDPR compliance (cannot prove data access), incident investigation, user dispute resolution
- Impact: Cannot trace data modifications; security incidents undetectable

**No API Documentation:**
- Problem: No API spec (OpenAPI/Swagger); endpoint parameters not documented; auth token format unclear
- Blocks: Frontend developer must read server.js to understand API; external integrations impossible; maintenance requires code reading
- Impact: Onboarding slow; misused endpoints; contract changes break consumers

**No Data Export/Import:**
- Problem: No way to export institution data; hard delete only option for cleanup; no bulk operations
- Blocks: User data portability (GDPR); data migration between deployments; bulk user upload
- Impact: Users locked into system; data loss on export needed for compliance

**No Admin Dashboard/Metrics:**
- Problem: No visibility into system health, user counts, storage usage, error rates
- Blocks: Capacity planning, performance monitoring, debugging production issues
- Impact: Blind to production problems; cannot predict when storage/bandwidth exhausted

**No Soft Delete / Archive:**
- Problem: All deletes are permanent; deleted users/sessions/vorlagen lost forever
- Blocks: Audit trail, recovery from accidental deletion, data retention compliance
- Impact: Accidental deletion = permanent data loss; audit logs impossible

## Dependencies at Risk

**Outdated Node.js Version Requirement:**
- Risk: `engines.node` allows `>=14.0.0`; Node 14 reached end-of-life October 2023
- Files: `backend/package.json` line 29
- Impact: No security updates for Node 14; vulnerabilities unpatched; modern packages may not support v14
- Migration plan: Update minimum to Node 18 LTS; update Dockerfile to use Node 18+ base image; test compatibility with all dependencies

**bcrypt Performance:**
- Risk: Default salt rounds (10) in bcrypt can slow down login under load
- Files: `backend/server.js` lines 278, 337, 1210 (bcrypt.hash calls)
- Impact: Each login/password change takes 1-2 seconds; acceptable for single user, problematic at scale
- Consideration: Monitor login times; increase rounds only if security requires (currently adequate); consider argon2 alternative if performance needed

**mysql2 Library Stability:**
- Risk: mysql2 is less actively maintained than mysql; some issues remain unfixed
- Files: `backend/package.json` line 20, `backend/server.js` line 8
- Impact: Any discovered MySQL protocol bugs won't be fixed; compatibility issues with newer MySQL versions
- Migration plan: Monitor for critical security issues; migration to better-maintained pool (mariadb package) if issues arise; ensure connection pooling works correctly

**Nodemailer SMTP Security:**
- Risk: SMTP credentials passed as plaintext in transporter config; no certificate pinning
- Files: `backend/server.js` line 1280 (createTransporter)
- Impact: MitM attack on SMTP connection; credentials visible in memory dump
- Recommendation: Use environment variables for SMTP config (already done); enable certificate validation; consider OAuth2 instead of password auth

---

*Concerns audit: 2026-04-07*
