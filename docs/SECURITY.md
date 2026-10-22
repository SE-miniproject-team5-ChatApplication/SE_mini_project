# Security notes

## Secrets (NFR-SEC-2)

- All secrets (JWT secret, database URL with credentials) live in `server/.env`,
  which is listed in `.gitignore`. Only `server/.env.example` (no real values) is committed.
- The server refuses to start in production if `JWT_SECRET` is missing or shorter
  than 32 characters (`server/src/config/index.js`).
- Passwords are stored only as bcrypt hashes with cost factor >= 10 (REQ-AUTH-3).
- Before a release, scan the history for leaked secrets (optional tool):
  `npx gitleaks detect` or `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks detect -s /repo`.

If a secret is ever committed: change it immediately (new JWT secret, new DB password).
Deleting the file in a later commit does **not** remove it from Git history.
