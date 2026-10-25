# Sprint 1 demo (1 minute) - PRC-1

Video file to commit next to this page: `demo/sprint1-demo.mp4`
(keep it under 50 MB: 720p, about 1 minute. GitHub rejects files over 100 MB.)

## Before recording

1. `server/.env` filled in, MongoDB running.
2. Terminal 1: `npm run dev --prefix server`  -> "Server listening on http://localhost:5000"
3. Terminal 2: `npm run dev --prefix client`  -> open http://localhost:5173
4. Open a **second browser** (or a private window) for the second user.



## Commit

```bash
git checkout -b chore/PRC-1-sprint1-demo
git add demo/sprint1-demo.mp4 demo/SPRINT1_DEMO.md
git commit -m "[PRC-1] Sprint 1 demo video"
git push -u origin chore/PRC-1-sprint1-demo
```

Open the PR with `Closes #8` in the description.
