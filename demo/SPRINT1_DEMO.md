# Sprint 1 demo (1 minute) - PRC-1

Video file to commit next to this page: `demo/sprint1-demo.mp4`
(keep it under 50 MB: 720p, about 1 minute. GitHub rejects files over 100 MB.)

## Before recording

1. `server/.env` filled in, MongoDB running.
2. Terminal 1: `npm run dev --prefix server`  -> "Server listening on http://localhost:5000"
3. Terminal 2: `npm run dev --prefix client`  -> open http://localhost:5173
4. Open a **second browser** (or a private window) for the second user.

## Script (about 60 seconds)

| Time | Show | Backlog items proven |
|---|---|---|
| 0-10 s | Register `omkar_demo` (show one inline error first, e.g. password without a digit) | REQ-AUTH-1, REQ-AUTH-2 |
| 10-15 s | Log in | REQ-AUTH-4 |
| 15-25 s | Second window: register + log in `prachi_demo`. Search "omk", **Add contact** both ways | REQ-PRO-3, REQ-PRO-4 |
| 25-30 s | Green presence dot appears for the other user | REQ-PRS-1 |
| 30-45 s | Click **Chat**, send messages both ways - they appear instantly with ✓ ticks | REQ-MSG-1, -2, -3, RCP-1 |
| 45-50 s | Send `<script>alert(1)</script>` - shown as text, no popup | NFR-SAFE-2 |
| 50-55 s | Attach a small PNG | REQ-FIL-1 |
| 55-60 s | Close the second window - the first shows "last seen ..." | REQ-PRS-2 |

## Commit

```bash
git checkout -b chore/PRC-1-sprint1-demo
git add demo/sprint1-demo.mp4 demo/SPRINT1_DEMO.md
git commit -m "[PRC-1] Sprint 1 demo video"
git push -u origin chore/PRC-1-sprint1-demo
```

Open the PR with `Closes #8` in the description.
