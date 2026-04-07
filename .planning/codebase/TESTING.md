# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Runner:**
- Not detected - No test framework configured
- `package.json` defines test script as: `"test": "echo \"Error: no test specified\" && exit 1"`
- No test files found in codebase (no `.test.js`, `.spec.js`, `.test.ts`, `.spec.ts` files)

**Assertion Library:**
- Not applicable - no testing framework in use

**Run Commands:**
```bash
npm test              # Currently returns error - not implemented
```

## Test File Organization

**Location:**
- No test files exist in current codebase
- Recommendation if implementing: Co-locate test files with source code (same directory as modules)

**Naming:**
- If implemented: Use `.test.js` suffix (e.g., `sessionManagement.test.js`, `utils.test.js`)
- Backend tests: place in `backend/` directory alongside `server.js`

**Structure:**
```
backend/
├── server.js                    # Main server file
├── server.test.js              # (Would contain server tests)
├── email-template.html
├── contact-email-template.html

frontend/
├── js/
│   ├── script.js
│   ├── script.test.js          # (Would contain script tests)
│   ├── sessionManagement.js
│   ├── sessionManagement.test.js
│   ├── utils.js
│   ├── utils.test.js
│   └── ...
```

## Test Structure

**Suite Organization:**
- No test suites currently present
- If implemented, would follow describe/test pattern (assuming Jest/Vitest adoption)

**Patterns (if tests were to be written):**

For backend API routes (e.g., in `server.js`):
```javascript
// Example of how tests would be structured (not currently in codebase)
describe('POST /api/sessions', () => {
    it('should save a session with valid data', async () => {
        // Arrange
        const testSession = { name: 'Test', data: [] };
        
        // Act
        const response = await request(app)
            .post('/api/sessions')
            .set('Authorization', `Bearer ${validToken}`)
            .send(testSession);
        
        // Assert
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
    });
    
    it('should return 401 without authentication token', async () => {
        // Act
        const response = await request(app)
            .post('/api/sessions')
            .send({ name: 'Test' });
        
        // Assert
        expect(response.status).toBe(401);
    });
});
```

For frontend functions (e.g., in `sessionManagement.js`):
```javascript
// Example of how tests would be structured (not currently in codebase)
describe('sessionManagement', () => {
    beforeEach(() => {
        localStorage.clear();
        // Mock authenticatedFetch
    });
    
    describe('saveSession', () => {
        it('should call authenticatedFetch with correct parameters', async () => {
            // Arrange
            const sessionName = 'Test Session';
            
            // Act
            await saveSession(sessionName);
            
            // Assert
            expect(authenticatedFetch).toHaveBeenCalledWith(
                '/api/sessions',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });
    });
});
```

## Mocking

**Framework:**
- Not applicable - no testing framework configured
- If implemented: Would likely use Jest mocks or Vitest

**Patterns (recommended if tests added):**

Database/API mocking for backend tests:
```javascript
// Would mock mysql pool
jest.mock('mysql2/promise', () => ({
    createPool: jest.fn().mockReturnValue({
        query: jest.fn()
    })
}));
```

Frontend fetch mocking:
```javascript
// Would mock authenticatedFetch
jest.mock('./utils.js', () => ({
    authenticatedFetch: jest.fn()
}));
```

**What to Mock:**
- External API calls (database queries in backend, `/api/` endpoints in frontend)
- File system operations in backend (`fs.readFile`, `fs.mkdirSync`)
- Email sending (`nodemailer` transporter)
- JWT token verification (in authentication middleware)
- Time-dependent operations (cron jobs, timeouts)

**What NOT to Mock:**
- Business logic functions (calculation, data transformation)
- Local helper functions (e.g., utility functions that don't call externals)
- Core authentication logic if testing auth flows

## Fixtures and Factories

**Test Data:**
- Not implemented in current codebase
- If implemented, would create test user objects:

```javascript
// Recommended structure for test fixtures (not currently in codebase)
const createTestUser = (overrides = {}) => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashedPassword123',
    role: 'user',
    institution_id: 1,
    email_verified: true,
    ...overrides
});

const createTestSession = (overrides = {}) => ({
    id: 'uuid-1234-5678',
    name: 'Sunday Service',
    data: JSON.stringify([
        { typ: 'Titel', inhalt: 'Service Title' }
    ]),
    institution_id: 1,
    created_at: new Date(),
    ...overrides
});
```

**Location:**
- Would be placed in dedicated `backend/fixtures/` or `frontend/tests/fixtures/` directories
- Example structure:
  - `backend/fixtures/users.js` - User test data factories
  - `backend/fixtures/objects.js` - Song/object test data
  - `frontend/fixtures/sessions.js` - Session test data

## Coverage

**Requirements:**
- Not enforced - no coverage configuration detected
- No `jest.config.js` or `coverage` configuration present

**View Coverage (if implemented):**
```bash
npm test -- --coverage         # (Would generate coverage report)
```

**Target coverage:** Unknown (not specified in project)

## Test Types

**Unit Tests:**
- Not implemented
- Scope would be: Individual functions, utility methods, helper functions
- Example: Testing `getImagePath()` in `utils.js` with various input types
- Would test error cases: invalid paths, null values, missing properties

**Integration Tests:**
- Not implemented
- Scope would be: API routes with database interactions, authentication flows
- Example: Testing `POST /api/sessions` with authenticated user, verifying database persistence
- Would test middleware chains (authentication → role check → route handler)

**E2E Tests:**
- Not implemented
- Not planned - no E2E testing framework detected (Cypress, Playwright, Selenium)
- If implemented: Would test full workflows (user login → create session → generate PDF → download)

## Common Patterns

**Async Testing:**
- Not currently tested, but present in codebase:
- Backend: All database operations are async: `await pool.query(...)`
- Frontend: All API calls are async: `await authenticatedFetch(...)`

If tests were implemented:
```javascript
// Would test async functions properly
it('should load session data', async () => {
    // authenticatedFetch would be mocked to return test data
    const session = await loadSession('uuid-123');
    expect(session.name).toBe('Test Session');
});

// Alternative with done callback (older style, not recommended)
it('should send password reset email', (done) => {
    sendPasswordResetEmail('user@example.com', 'token123')
        .then(() => {
            expect(nodemailer.sendMail).toHaveBeenCalled();
            done();
        })
        .catch(done);
});
```

**Error Testing:**
- Not currently tested, but error handling exists throughout:
- Backend: try-catch blocks with specific error responses
- Frontend: try-catch blocks with user-facing alerts

If tests were implemented:
```javascript
// Backend error handling test
it('should return 404 when user not found', async () => {
    jest.spyOn(pool, 'query').mockResolvedValueOnce([[]]);
    
    const response = await request(app)
        .post('/api/request-password-reset')
        .send({ email: 'nonexistent@example.com' });
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Benutzer nicht gefunden');
});

// Frontend error handling test
it('should display alert on fetch error', async () => {
    jest.spyOn(utils, 'authenticatedFetch').mockRejectedValue(
        new Error('Network error')
    );
    
    await saveSession('Test');
    
    expect(customAlert).toHaveBeenCalledWith(
        expect.stringContaining('Fehler beim Speichern')
    );
});
```

## Current Testing Status

**What is untested:**
- Authentication logic (JWT token verification, password hashing, bcrypt)
- Session management (save, load, delete operations)
- PDF generation (complex coordinate calculations, font rendering)
- Database operations (all CRUD operations for users, objects, sessions)
- Email functionality (contact form, password reset emails)
- Frontend utilities (fetch helpers, localStorage operations)
- File upload handling (multer storage configuration)
- Drag-and-drop functionality
- Error handling in all routes and functions

**What needs test coverage:**
1. **High Priority (security/core functionality):**
   - Authentication and authorization middleware (`authenticateToken`, `authenticateAdmin`, `checkRole`)
   - User registration and password reset flows
   - Session persistence and retrieval

2. **Medium Priority (business logic):**
   - PDF generation and page break calculations
   - Session/template save/load operations
   - File cleanup operations (cron job)
   - Role-based access control

3. **Low Priority (UI/UX):**
   - Drag-and-drop reordering
   - Modal dialogs
   - Format selection in preview

## Recommendations for Test Implementation

1. **Choose Framework:** Jest (recommended for Node.js/frontend) or Vitest (modern alternative)
2. **Start with:** Backend API routes and middleware (highest value, fewer dependencies)
3. **Config Files Needed:**
   - `jest.config.js` for test runner configuration
   - `package.json` update: change test script to `"test": "jest"`
   - `.env.test` for test database configuration
4. **Mock Strategy:**
   - Database: Use mock connection pool to avoid actual DB access
   - Email: Mock nodemailer transporter
   - File I/O: Mock fs module
   - External APIs: Not applicable (no external API calls detected)

---

*Testing analysis: 2026-04-07*
