
# Chat Application (Socket Programming) - Team 5

A real-time web chat application built with **Node.js, Express, Socket.IO, MongoDB and React**.

Software Engineering (UE24CS341A) mini-project.

## Team Members

| Member | GitHub | Modules Owned |
|---|---|---|
| Prachi Jalan | Prachi-Jalan | AUTH, PRO - authentication, profiles, contacts |
| Omkar | omkar040806 | MSG, RCP - messaging, delivery and read receipts |
| Pruthviraj Ajay Patil | Pruthviraj-A-Patil | PRS, GRP - presence, typing and groups |
| Raksha Arun | rakshaarun29 | HIS, FIL, NOT - history, files, search and notifications |

## Features

- User registration and login with JWT authentication.
- Password hashing and account lockout protection.
- User profiles, avatars, search and contact management.
- One-to-one and group conversations.
- Real-time messaging using Socket.IO.
- Offline message delivery and duplicate-message protection.
- Message delivery and read receipts; in a group a message counts as read only when every member has read it, and the sender can see each member's status.
- Online presence, last-seen status and typing indicators.
- Paginated message history, keyword search and export of a conversation as a CSV file.
- Secure file and image sharing.
- Per-conversation unread counts and muting (no notifications, unread messages still counted).
- Group administration with member and admin roles.
- HTTPS and WSS with TLS 1.2 or newer when a certificate is configured (`docs/TLS.md`).

## 1. Requirements

Install the following before running the application:

- Node.js 20 LTS recommended (the project specifies Node.js >=18).
- npm.
- MongoDB 6 or newer, either locally or through MongoDB Atlas.
- Git.

## 2. Installation

Clone the repository:

```bash
git clone https://github.com/SE-miniproject-team5-ChatApplication/SE_mini_project.git
cd SE_mini_project
```

Install server and client dependencies:

```bash
npm run install:all
```

Create the server environment file.

**Windows PowerShell:**

```powershell
Copy-Item server/.env.example server/.env
```

**macOS / Linux / Git Bash:**

```bash
cp server/.env.example server/.env
```

Open `server/.env` and configure the required values.

Important environment variables:

| Variable | Purpose |
|---|---|
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `PORT` | Backend server port |
| `CLIENT_ORIGIN` | Frontend development origin |

Example MongoDB connection string:

```text
mongodb://127.0.0.1:27017/chatapp
```

Generate a secure JWT secret using:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Do not commit `.env` files or expose secret values.

## 3. Run the Application (Development)

Start MongoDB before starting the application.

Open two terminals from the project root.

**Terminal 1 - Backend:**

```bash
npm run dev:server
```

The backend API and Socket.IO server run on:

```text
http://localhost:5000
```

Health endpoint:

```text
http://localhost:5000/api/health
```

**Terminal 2 - Frontend:**

```bash
npm run dev:client
```

Open the React application at:

```text
http://localhost:5173
```

## 4. Production / Demo Mode

Build the frontend:

```bash
npm run build
```

Start the backend in production mode.

**macOS / Linux:**

```bash
NODE_ENV=production npm start --prefix server
```

**Windows PowerShell:**

```powershell
$env:NODE_ENV="production"
npm start --prefix server
```

The backend serves the built React application and API on port 5000.

- To serve HTTPS/WSS, set `TLS_CERT_FILE` and `TLS_KEY_FILE` in `server/.env` (`docs/TLS.md`).
- `npm run start:supervised --prefix server` restarts the server automatically if it exits (`docs/OPERATIONS.md`).

## 5. Testing and Code Quality

The project uses Jest for unit and integration testing.

### Configure the test database

Create a file named `server/.env.test` manually.

Add the following configuration:

```env
MONGO_URL=mongodb://127.0.0.1:27017/chatapp
```

The test setup automatically uses separate databases named `chatapp_test_1`, `chatapp_test_2`, etc., depending on the Jest worker.

The test environment file is ignored by Git and should not be committed.

### Run tests

Run the server test suite:

```bash
npm test --prefix server
```

Run tests with code coverage:

```bash
npm run test:ci --prefix server
```

The CI coverage threshold requires at least **70% statement coverage**.

Run the Test Plan traceability check:

```bash
npm run trace --prefix server
```

Run ESLint for the server and client:

```bash
npm run lint
```

Build the frontend:

```bash
npm run build
```

**Note:** Database integration tests are skipped when `MONGO_URL` is not configured. CI supplies the test database configuration automatically.

### Test reports and other checks

| Command (run with `--prefix server`) | What it does |
|---|---|
| `npm run reports` | Runs the tests with coverage and writes the unit test, system validation, code coverage and branch coverage reports to `docs/reports/` |
| `npm run perf:latency`, `perf:capacity`, `perf:fanout` | Load tests against a running server (`docs/testing/PERFORMANCE.md`) |
| `npm run monitor` | Measures availability of a running server (`docs/OPERATIONS.md`) |
| `npm run tls:check -- <port>` | Checks TLS versions, HTTPS, WSS and security headers of a server started with a certificate (`docs/testing/SECURITY_TEST.md`) |

The overall test results are in `docs/TEST_SUMMARY.md`.

## 6. Project Structure

```text
SE_mini_project/
|
|-- Documents/             Part-1 deliverables (SRS, SAD, Test Plan)
|-- docs/                  Technical documentation
|   |-- testing/           Manual and load test procedures and results
|   |-- reports/           Part-3 test and coverage reports
|-- demo/                  Sprint demo videos and scripts
|
|-- server/
|   |-- src/
|   |   |-- config/        Environment and database configuration
|   |   |-- models/        Mongoose database models
|   |   |-- services/      Application business logic
|   |   |-- middleware/    Authentication, validation and security
|   |   |-- routes/        REST API endpoints
|   |   |-- sockets/       Socket.IO gateway and event handlers
|   |   |-- utils/         Shared utilities
|   |
|   |-- tests/             Jest unit and integration tests
|   |-- scripts/           Backup, restore, traceability, report, load-test, monitoring and TLS-check scripts
|
|-- client/
    |-- src/
        |-- pages/
        |-- components/
        |-- context/
        |-- hooks/
        |-- api/
```

## 7. Documentation

| Document | Description |
|---|---|
| `docs/API.md` | REST API endpoints, request formats and responses |
| `docs/SOCKET_EVENTS.md` | Socket.IO events, payloads and acknowledgements |
| `docs/DEVIATIONS.md` | Every difference from the SRS, SAD and Test Plan, with the reason |
| `docs/TEST_SUMMARY.md` | Test results and exit criteria for v1.0 |
| `docs/reports/` | Unit test, system validation, code coverage and branch coverage reports |
| `docs/testing/` | Performance, portability, reliability, security and usability tests |
| `docs/TRACEABILITY.md` | Test Plan cases mapped to test files |
| `docs/SECURITY.md` | Security information |
| `docs/TLS.md` | Running the server with HTTPS/WSS |
| `docs/OPERATIONS.md` | Supervised start, availability monitoring and backups |
| `docs/SCALABILITY.md` | Stateless handlers and adding a Redis adapter |
| `docs/BRANCH_PROTECTION.md` | GitHub branch protection settings |
| `docs/RELEASE.md` | Tagging and publishing v1.0 |
| `CHANGELOG.md` | Changes in each sprint |

## 8. Database Backup and Restore

Create a database backup:

```bash
npm run backup --prefix server
```

Restore a backup:

```bash
npm run restore --prefix server -- backups/<folder> --yes
```

**Warning:** Restoring a backup replaces the existing database data.

Backup files contain sensitive information, including password hashes. Never commit backup files to Git.

## 9. Team Workflow

1. Select an issue from the GitHub Project board and move it to **In Progress**.
2. Update your local `main` branch:

   ```bash
   git switch main
   git pull origin main
   ```

3. Create a feature branch:

   ```bash
   git switch -c feature/<ISSUE-ID>-short-name
   ```

4. Implement the issue and test your changes.
5. Commit with the issue ID in the message:

   ```bash
   git commit -m "[ISSUE-ID] Description of changes"
   ```

6. Push the branch and create a Pull Request.
7. Include `Closes #<issue number>` in the PR description.
8. Ensure CI passes and obtain the required review before merging.

## 10. Troubleshooting

| Problem | Possible Solution |
|---|---|
| `MongooseServerSelectionError` | Ensure MongoDB is running and check `MONGO_URL`. |
| `JWT_SECRET must be set` | Configure `JWT_SECRET` in `server/.env`. |
| Frontend cannot connect to backend | Ensure the backend is running on port 5000 and check `CLIENT_ORIGIN`. |
| Login or API requests return 401 | Check that the authentication token is present and valid. |
| HTTP 429 errors | Check the configured API rate limits. |
| Test database connection fails | Check `server/.env.test` and ensure the test MongoDB instance is available. |
