# 📦 Bakery Crew Backend

This is the backend server for the **Bakery Crew** internal application. Built with **Node.js**, **Express**, and **PostgreSQL**, it manages user registration, authentication (via JWT), role-based access control, event participation, donation tracking, and messaging functionalities.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL
- npm or yarn

### Project Setup

```bash
# Clone the repository
git clone https://github.com/Lilu-B/bakery-crew-BE.git
cd bakery-crew-BE

# Install dependencies
npm install

# Create environment files
touch .env.development .env.test
```

### Environment Configuration

#### `.env.development`

```env
DATABASE_URL=postgresql://liliia:2192@localhost:5432/bakery_crew
PORT=3001
JWT_SECRET=super_secret_token_key
```

#### `.env.test`

```env
DATABASE_URL=postgresql://liliia@localhost:5432/bakery_crew_test
JWT_SECRET=super_secret_token_key
```

### Database Setup

```bash
# Create development and test databases
createdb bakery_crew
createdb bakery_crew_test

# Run initial SQL setup
psql bakery_crew < db/setup.sql
psql bakery_crew_test < db/setup.sql

# Start ENV-dev
npm run dev
# or:
NODE_ENV=development nodemon server.js

# Start ENV-test
npm run dev:test
# or:
NODE_ENV=test nodemon server.js
```

---

## Scripts

```json
"scripts": {
  "start": "node server.js",
  "dev": "NODE_ENV=development nodemon server.js",
  "test": "NODE_ENV=test jest --runInBand --detectOpenHandles",
  "prepare": "husky",
  "seed:test": "NODE_ENV=test node scripts/seedTestUsers.js",
  "dev:test": "NODE_ENV=test nodemon server.js"
}
```

### Script Descriptions

| Command            | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `npm run start`     | Launch the app on production port (default `3001`)                          |
| `npm run dev`       | Start development server with nodemon (`.env.development`)                  |
| `npm run test`      | Run all Jest integration tests in the test environment                      |
| `npm run dev:test`  | Start development server using the `.env.test` config (for Postman testing) |
| `npm run seed:test` | Seed test database with sample users (used for Postman workflows)           |
| `npm run prepare`   | Initializes Husky for pre-commit hooks                                      |

---

## API Endpoints

### Public Endpoints

| Method | Route           | Description             |
|--------|------------------|-------------------------|
| POST   | /api/register    | Register a new user     |
| POST   | /api/login       | Log in an approved user |
| POST   | /api/logout      | Log out (stateless)     |

### Protected Routes (JWT required)

| Method | Route              | Role Access            | Description                       |
|--------|--------------------|------------------------|-----------------------------------|
| GET    | /api/protected     | All roles              | Test JWT validity                 |
| DELETE | /api/users/:id     | User/Manager/Developer | Delete user with role-based logic |

### Admin Routes (`adminRoutes.js`)

| Method | Route                                 | Description                    |
|--------|----------------------------------------|--------------------------------|
| PATCH  | /api/admin/users/:id/approve           | Approve a pending user         |
| PATCH  | /api/admin/users/:id/assign-manager    | Promote user to manager        |
| PATCH  | /api/admin/users/:id/revoke-manager    | Demote manager to regular user |

### Message Routes (`messageRoutes.js`)

| Method | Route               | Role Access | Description                               |
|--------|---------------------|-------------|-------------------------------------------|
| POST   | /api/messages       | All users   | Send message to manager or user           |
| GET    | /api/messages/inbox | All users   | Get inbox messages                        |
| GET    | /api/messages/sent  | All users   | Get sent messages                         |


### Event Routes (`eventRoutes.js`)

| Method | Route                              | Role Access         | Description                                      |
|--------|-------------------------------------|---------------------|--------------------------------------------------|
| POST   | /api/events                         | Manager/Developer   | Create an event                                  |
| GET    | /api/events                         | All roles           | Get all active events                            |
| POST   | /api/events/:eventId/apply          | User (own shift)    | Apply to an event                                |
| DELETE | /api/events/:eventId/cancel         | User                | Cancel own application                           |
| GET    | /api/events/:eventId/applicants     | Manager/Admin/User  | View applicants (if applied or creator)          |
| DELETE | /api/events/:eventId                | Developer/Creator   | Delete event (based on role and ownership)       |

### Donation Routes (`donationRoutes.js`)

| Method | Route                                          | Role Access         | Description                                           |
|--------|------------------------------------------------|---------------------|-------------------------------------------------------|
| POST   | /api/donations                                 | Developer/Manager   | Create a new donation campaign                        |
| GET    | /api/donations/active                          | All roles           | Retrieve all active donation campaigns                |
| GET    | /api/donations                                 | All roles           | Retrieve all donation campaigns (including inactive)  |
| GET    | /api/donations/:donationId                     | All roles           | Retrieve a specific donation campaign by ID           |
| POST   | /api/donations/:donationId/confirm-payment     | User                | Confirm a donation payment                            |
| GET    | /api/donations/:donationId/applicants          | Manager/Admin/User  | View applicants for a donation campaign               |
| DELETE | /api/donations/:donationId                     | Developer/Creator   | Delete a donation campaign (based on role and ownership) |

---

## Testing

### Postman Testing

- A Postman collection is available for manual API testing.
- A separate `seedTestUsers.js` file is used to populate the test database with fixed users for Postman usage.

### Integration Testing with Jest and Supertest

- Integration tests are written using **Jest** and **Supertest**
- Each test file uses isolated setup logic and defines required test data within the file (e.g. users, events, donations).
- Located in the `__tests__/` directory.

#### Running Tests

```bash
# Run all tests
npm test

# Run a specific test file
npx jest __tests__/event.test.js
```

---

## Utilities

- `scripts/seedTestUsers.js` — preloads users for Postman testing
- `utils/testUtils.js` — used for resetting database between tests (events, users, messages, etc.)

---

## 📦 Dependencies

### Runtime

- `express`
- `pg`
- `dotenv`
- `cors`
- `jsonwebtoken`
- `bcrypt`
- `express-validator`

### Development

- `jest`
- `supertest`
- `nodemon`
- `husky`

---

## Environment Management

- `.env.development` for dev mode
- `.env.test` for isolated test environment
- PostgreSQL database is separated between `bakery_crew` (development) and `bakery_crew_test` (testing)
- JWT secret stored per environment

---

## Database Management

```bash
# Create databases
createdb bakery_crew
createdb bakery_crew_test

# Load schema
psql bakery_crew < db/setup.sql
psql bakery_crew_test < db/setup.sql

# Note: db/seeds.sql is currently empty and intended for future data seeding.

# Enter DB shell
psql bakery_crew

# View tables
\dt

# Query tables
SELECT * FROM users;
```

---

## Role-Based Access Summary

| Role      | Can Approve Users | Can Delete Users        | Can Promote/Demote | JWT Access | Apply to Events | Manage Events | Manage Donations | Messages |
|-----------|-------------------|-------------------------|--------------------|-------------|------------------|----------------|------------------|----------|
| Developer | ✅                 | All users               | ✅                  | ✅           | ❌               | ✅              | ✅                | ❌        |
| Manager   | ✅                 | Users in their shift    | ❌                  | ✅           | ❌               | ✅              | ✅                | ✅        |
| User      | ❌                 | Only self               | ❌                  | ✅           | ✅ (own shift)   | ❌              | ✅                | ✅ (to manager) |


---

## API Documentation

- Postman Collection: available via export from Postman (recommended for frontend and QA)
- Swagger (optional): to generate, install Swagger UI Express:

```bash
npm install swagger-ui-express
```

And configure in your app if needed.

---

## Code Quality and Hooks

- **Husky** is installed for Git hooks
- Pre-commit setup available
- To initialize manually:

```bash
npx husky install
```

---

## Project Structure

```
bakery-crew-BE/
├── __tests__/             # Integration tests
├── controllers/           # Route handlers
├── db/                    # SQL setup scripts
├── middleware/            # Auth, validation, etc.
├── models/                # Data access logic
├── routes/                # Express route files
├── utils/                 # Seeders and helpers
├── .env.development       # Dev environment variables
├── .env.test              # Test environment variables
├── server.js              # Entry point
├── app.js                 # App definition
└── README.md              # This file
```

---

This backend is designed for scalability and clean role-based logic separation.

--------------
NEW - что добавили в процессе разработки фронтенда!
--------------

В authController.js:
  getProtectedUser,
  updateUserProfile 

В eventController.js:
  handleGetSingleEvent

В authRoutes.js 
  router.get('/protected', verifyToken, getProtectedUser);
  router.patch('/users/me', verifyToken, updateUserProfile);

В eventRoutes.js 
  router.get('/:eventId', handleGetSingleEvent);

	1.	Как создать middleware convertCamelToSnake.js
	2.	Как подключить его в app.js (или server.js)
	3.	Как использовать его только на нужных роутерах (например, на POST, PATCH, PUT)

