# Changelog

## [Unreleased]

### Sprint 2 (26 Oct - 2 Nov 2026)
- Account lock-out; profile page with display name, status, avatar, password change and account deletion
- Offline delivery, reconnect + resend without duplicates, delete message
- Delivered/read receipts pushed live; typing indicator
- Groups: create, admin actions, leave + admin succession, system messages
- Keyword search with highlights; file type checks, authorised download, PNG thumbnails
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
