# Chat Application (Socket Programming) - Team 5

Real-time web chat built with **Node.js, Express, Socket.IO, MongoDB and React**.
Software Engineering (UE24CS341A) mini-project.

| Member | GitHub | Modules owned (SRS Appendix C) |
|---|---|---|
| Prachi Jalan | Prachi-Jalan | AUTH, PRO (auth, profile, contacts) |
| Omkar | omkar040806 | MSG, RCP (messaging, receipts) |
| Pruthviraj Ajay Patil | Pruthviraj-A-Patil | PRS, GRP (presence, groups) |
| Raksha Arun | rakshaarun29 | HIS, FIL, NOT (history, files, notifications) |

## Folder layout (SAD 4.1)

```
.
├── Documents/            Part-1 deliverables (SRS, SAD, Test Plan)
├── docs/                 project documentation
├── server/               Node.js back end
│   ├── src/
│   │   ├── config/       environment configuration
│   │   ├── models/       Mongoose schemas (C12)
│   │   ├── services/     business logic (C4-C11)
│   │   ├── middleware/   auth, validation, rate limit, errors
│   │   ├── routes/       REST endpoints (C2), loaded automatically
│   │   ├── sockets/      Socket.IO gateway (C3) and event handlers
│   │   └── utils/        logger, errors, helpers
│   ├── tests/            Jest unit + integration tests
│   └── scripts/          seed, backup, performance scripts
└── client/               React web client (C1)
```

## Quick start

```bash
cp server/.env.example server/.env     # then edit the values
npm install --prefix server
npm run dev:server                      # http://localhost:5000/api/health
```

## Team workflow

1. Pick your issue on the GitHub Project board and move it to **In Progress**.
2. Create a branch: `feature/<ISSUE-ID>-short-name`, for example `feature/REQ-AUTH-1-register`.
3. Commit with the issue ID in the message: `[REQ-AUTH-1] Register endpoint`.
4. Open a Pull Request whose description contains `Closes #<issue number>`.
5. CI must pass and a repo owner reviews and merges.

## Database backup (NFR-SAFE-1)

- Back up now: `npm run backup --prefix server`. This writes `server/backups/<time>/`, with one JSON file per collection, and keeps the newest 7 (change with `BACKUP_KEEP`, folder with `BACKUP_DIR`).
- Run it daily, e.g. with cron at 2 am: `0 2 * * * cd /path/to/SE_mini_project && npm run backup --prefix server`
- Restore (replaces all current data): `npm run restore --prefix server -- backups/<folder> --yes`
- Backups contain password hashes. Never commit them; `server/backups/` is in `.gitignore`.
