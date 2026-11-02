# Sprint 2 demo (2 minutes) - PRC-2

Video file to commit next to this page: `demo/sprint2-demo.mp4` (under 50 MB).

## Before recording

1. `server/.env` filled in, MongoDB running.
2. Terminal 1: `npm run dev --prefix server`. Terminal 2: `npm run dev --prefix client`.
3. Register `user01`, `user02`, `user03`, `user04` and `locktest`, all with password `Chat1234`.
4. Log in as `user01`, then `user02`, `user03` and `user04`. Search for the other three and click **Add contact**.
5. Keep ready: a GIF, a PNG photo and a PDF.
6. Open three browser windows (one normal, two private): user01, user02, user03. Log out of the other accounts.
7. Open the latest green run on the GitHub **Actions** tab in another tab.

## Script (about 120 seconds)

| Time | Show | Backlog items proven |
|---|---|---|
| 0-10 s | Log in as `locktest` with a wrong password 6 times -> "Try again in 15 minutes" (the account locks on the 5th, the message appears on the 6th) | REQ-AUTH-5 |
| 10-20 s | user01 Profile: change display name, upload avatar (try a GIF first, with the file picker set to "All files" -> rejected) | REQ-PRO-1, -2 |
| 20-35 s | user01 -> user02: ✓✓ straight away; user02 opens the chat -> blue ✓✓ live; user02 types -> "typing…" shows | REQ-RCP-2..4, REQ-PRS-3 |
| 35-45 s | Close user02's window, send 2 messages (single ✓), reopen -> they arrive and turn blue | REQ-RCP-1, REQ-MSG-6 |
| 45-55 s | DevTools "Offline" on user01, send (shows …), back "Online" -> sent once | REQ-MSG-7 |
| 55-60 s | Delete a message -> "This message was deleted" on both sides | REQ-MSG-8 |
| 60-80 s | user01: new group with user02 + user03; message reaches both; Group info: add user04, remove user04; system messages | REQ-GRP-1..3, -6 |
| 80-85 s | user01 leaves -> user02 becomes admin; user02 makes user03 an admin | REQ-GRP-2, -4 |
| 85-95 s | user02 sends "team meeting at ten"; user03 searches "meet" -> highlighted result -> click opens the message | REQ-HIS-3 |
| 95-105 s | Send a PDF and a PNG: progress bar, thumbnail, Download | REQ-FIL-2..4 |
| 105-115 s | user01 opens the chat with user03; user02 sends user01 a message: unread badge + toast; open it -> badge 0 | REQ-NOT-1..3 |
| 115-120 s | GitHub Actions: green run with the coverage summary | NFR-QA-5 |

The tests are shown from GitHub because `npm run test:ci` takes about 2 minutes, and on Windows
TC-SAFE-02 fails (it checks Unix file permissions).

## Commit

```bash
git add demo/sprint2-demo.mp4 demo/SPRINT2_DEMO.md
git commit -m "[PRC-2] Sprint 2 demo video"
git push -u origin chore/PRC-2-sprint2-demo
```

Open the PR with `Closes #9` in the description.
