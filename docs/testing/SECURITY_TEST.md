# Transport security and secrets (TC-SEC-03)

TC-SEC-03 covers NFR-SEC-2 (secrets), NFR-SEC-3 (TLS) and NFR-SEC-7 (minimum personal data).
Expected result (Test Plan Appendix A): TLS 1.2+ only; no secrets in the repository; only the
minimum personal data fields are stored.

The Test Plan named OWASP ZAP, testssl.sh and gitleaks. They were not installed (`docs/DEVIATIONS.md`
P3), so each expected result was checked another way, below.

## 1. TLS (NFR-SEC-3)

Start the server with a certificate as in `docs/TLS.md`, then in a second terminal:

```bash
npm run tls:check --prefix server -- 5000
```

Result on 5 Nov 2026 (Windows laptop, self-signed certificate, production mode): **14 / 14 checks pass.**

| Check | Result |
|---|---|
| TLS 1.0 offered by the client | Refused by the server (protocol version alert) |
| TLS 1.1 offered by the client | Refused by the server (protocol version alert) |
| TLS 1.2 | Accepted |
| TLS 1.3 | Accepted |
| REST over HTTPS (`/api/health`) | HTTP 200 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Security-Policy` | Present |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Powered-By` | Not sent |
| Plain HTTP on the TLS port | No API answer (connection closed) |
| Register and log in over HTTPS | 201 / 200 |
| Login response | Contains no password or password hash |
| Socket.IO | Connects and authenticates over `wss://` |

## 2. No secrets in the repository (NFR-SEC-2)

Instead of gitleaks, every change in all 212 commits of every branch was searched on 5 Nov 2026
for MongoDB connection strings with a password, private keys, AWS, GitHub, Slack and Google
keys, and `JWT_SECRET` values:

```bash
git log --all -p | grep -E '^\+' | grep -E "mongodb(\+srv)?://[^:@]+:[^@]+@|PRIVATE KEY|AKIA|ghp_|JWT_SECRET"
git log --all --name-only --format= | sort -u | grep -E '\.env|\.pem$|\.key$'
```

| Check | Result |
|---|---|
| `.env` files ever committed | Only `.env.example` and `server/.env.example` |
| Certificates or keys ever committed | None (`server/certs/` is in `.gitignore`) |
| `JWT_SECRET` values | Only the placeholder `replace_with_a_long_random_secret` and the CI-only test value |
| Other keys and passwords | None found |

The server also refuses to start in production without a `JWT_SECRET` of at least 32
characters (`config.test.js`).

## 3. Minimum personal data (NFR-SEC-7)

`server/src/models/User.js` stores: username, email, password hash, display name, status
message, avatar file, last seen, last login and the lock-out counters. Nothing else is asked for
at registration (username, email, password). The password hash, lock-out counters and avatar
path are never sent to clients, and a user can delete the account (`DELETE /api/users/me`).

**Result: TC-SEC-03 passes.**
