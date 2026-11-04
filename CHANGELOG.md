# Changelog

## [1.0.0] - 2026-11-02 (development frozen)

Tagged `v1.0`. Only defect fixes after this, on a `hotfix/` branch.

### Stretch items finished before the release (3-4 Nov 2026)
- Group read receipts: read only when every current member has read it; the sender can see each member's status
- Message latency load test: with 100 users, 95 % of messages arrive within 40 ms (`npm run perf:latency`)
- Capacity load test: 200 simultaneous connections, every message stored and delivered (`npm run perf:capacity`)

### Sprint 2 (26 Oct - 2 Nov 2026)
- Account lock-out; profile page with display name, status, avatar, password change and account deletion
- Offline delivery, reconnect + resend without duplicates, delete message
- Delivered/read receipts pushed live; typing indicator
- Groups: create, admin actions, leave + admin succession, system messages
- Keyword search with highlights; file type checks, authorised download, image thumbnails
- Unread badges, in-app and browser notifications
- Input validation, rate limiting, error handling, daily backups, dashboard and search speed tests
- Modular server structure, 70 % coverage gate and traceability check in CI
- README with install/run instructions, REST API and socket event documentation

### Sprint 1 (19-23 Oct 2026)
- Register, login (JWT), logout, user search, contacts
- Socket gateway with JWT handshake; real-time one-to-one messages stored before ack
- Presence and last seen; conversation list and paged history; file upload
- XSS-safe rendering

### Dry run (12-16 Oct 2026)
- Repository skeleton, ESLint, CI, test harness

### Not finished (Stretch backlog)
See "Requirements not delivered" in `docs/DEVIATIONS.md`.
