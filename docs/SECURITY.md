# Security notes

## Secrets (NFR-SEC-2)

- All secrets (JWT secret, database URL with credentials) live in `server/.env`,
  which is listed in `.gitignore`. Only `server/.env.example` (no real values) is committed.
- The server refuses to start in production if `JWT_SECRET` is missing or shorter
  than 32 characters (`server/src/config/index.js`).
- Passwords are stored only as bcrypt hashes with cost factor >= 10 (REQ-AUTH-3).
- Before a release, scan the history for leaked secrets. For v1.0 this was done with the
  `git log` search in `docs/testing/SECURITY_TEST.md` (gitleaks was not installed). With
  gitleaks: `npx gitleaks detect` or `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks detect -s /repo`.

If a secret is ever committed: change it immediately (new JWT secret, new DB password).
Deleting the file in a later commit does **not** remove it from Git history.

## Uploaded files (REQ-FIL-2)

`server/src/services/fileService.js` accepts a file only when its extension is allowed, its
first bytes are the signature of that type, and `file-type` detects the same type. The
signature check comes first, so content of any other format never reaches `file-type`'s
parsers. This blocks GHSA-5v7r-6r5c-r473: a malformed ASF video, even when named `.png`,
made `file-type` 16 loop forever and stopped the whole server (found and fixed on
5 Nov 2026; test in `server/tests/integration/files.upload.test.js`).

## Dependency audit (`npm audit`, 5 Nov 2026)

| Package | Severity | Used in | Why it is not upgraded for v1.0 |
|---|---|---|---|
| `file-type` 16.5.4 | Moderate | Server | The ASF parser that loops is never reached (see above). The fixed version (21.3.1+) is ES-module only. |
| `react-router-dom` 6.30 | Moderate | Client | Open redirect through `<Link>` / `navigate()` with a crafted path, and an SSR issue. The app only links to fixed internal paths and does not use SSR. The fix needs v7. |
| `vite` 5, `esbuild` | High / Moderate | Client development server only | Not part of the built application. Do not expose `npm run dev` to a network. The fix needs Vite 8. |
| `nodemon`, `minimatch` | Moderate | Server development only | Not part of the running application. |
| `jest` and its dependencies | Low | Tests only | Not part of the running application. |

`npm audit --omit=dev` lists only the `file-type` and `react-router` entries.
