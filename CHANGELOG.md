# Changelog

## [1.0.0] - 2026-11-05 (development frozen)

Tagged `v1.0`. Only defect fixes after this, on a `hotfix/` branch.

### Portability (NFR-QA-6, Issue #83)
- Added a CI portability job for Windows and macOS, running server unit tests and a client production build.
- Retained the existing Linux CI jobs for the full server test suite, lint, traceability and client build.
- Added a cross-platform portability checklist in `docs/testing/PORTABILITY.md`.
- Documented the Windows-specific TC-SAFE-02 limitation: Windows does not enforce Unix/POSIX owner-only file permissions in the same way as Linux and macOS.
- Confirmed that `server/scripts/backup.js` writes backup files using Mongoose rather than calling `mongodump`.
- Verified Windows server unit tests (42/42 passed) and the Windows client production build; the macOS CI job passes. Chrome was checked by hand, Edge partly and Firefox not.

### Sprint 3 (3-6 Nov 2026): Stretch items and test reports
- Group read receipts: read only when every current member has read it; the sender can see each member's status.
- Export a conversation as a CSV file (Chat History Report).
- Mute a conversation: no notifications, unread messages still counted.
- HTTPS and WSS with TLS 1.2 or newer when a certificate is configured (`docs/TLS.md`).
- Usability test procedure for the first-message task (`docs/testing/USABILITY_TEST.md`); every primary action measured at 1 click.
- Chrome, Firefox and Edge each pass the same 11 browser checks (`docs/testing/PORTABILITY.md`).
- Message latency load test: with 100 users, 95 % of messages arrive within 40 ms (`npm run perf:latency`).
- Capacity load test: 200 simultaneous connections, every message stored and delivered (`npm run perf:capacity`).
- Group fan-out load test: a message to a 50-member group reaches everyone within 70 ms for 95 % of messages (`npm run perf:fanout`).
- Availability: `npm run start:supervised` restarts the server if it exits, and `npm run monitor` measures availability (99.67 % over 60 minutes).
- Stateless socket handlers checked by a test, and the steps to add a Redis adapter (docs/SCALABILITY.md).
- Part-3 test reports in `docs/reports/`: unit test, system validation, code coverage and branch coverage (`npm run reports`).

### Fixes before the release (5 Nov 2026)
- Security updates: multer 2.5.0, body-parser 1.20.9 (through Express) and follow-redirects 1.16.2 (through Axios).
- A receipt for a message that no longer exists no longer causes an error.

### Sprint 2 (26 Oct - 2 Nov 2026)
- Account lock-out; profile page with display name, status, avatar, password change and account deletion.
- Offline delivery, reconnect + resend without duplicates, delete message.
- Delivered/read receipts pushed live; typing indicator.
- Groups: create, admin actions, leave + admin succession, system messages.
- Keyword search with highlights; file type checks, authorised download, image thumbnails.
- Unread badges, in-app and browser notifications.
- Input validation, rate limiting, error handling, daily backups, dashboard and search speed tests.
- Modular server structure, 70 % coverage gate and traceability check in CI.
- README with install/run instructions, REST API and socket event documentation.

### Sprint 1 (19-23 Oct 2026)
- Register, login (JWT), logout, user search, contacts.
- Socket gateway with JWT handshake; real-time one-to-one messages stored before ack.
- Presence and last seen; conversation list and paged history; file upload.
- XSS-safe rendering.

### Dry run (12-16 Oct 2026)
- Repository skeleton, ESLint, CI, test harness.

### Not fully met
See "Requirements not fully met" in `docs/DEVIATIONS.md`.