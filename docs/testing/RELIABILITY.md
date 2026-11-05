# Reliability checks (NFR-QA-2, REQ-MSG-7)

Automated: `server/tests/integration/reliability.test.js`, `messages.resend.test.js`,
`messages.offline.test.js` (run in CI on every pull request).

## Manual test: 60-second network drop (TC-MSG-05)

1. Log in as user A in Chrome and as user B in another browser. Open the chat.
2. In A's window: DevTools → Network → throttling → **Offline**.
3. A types and sends 3 messages - they show `…` (pending).
4. Wait at least 65 seconds. The yellow "Reconnecting…" bar appears after about a minute, when
   the server's heartbeat gives up (SRS 3.3). Then set throttling back to **No throttling**.
5. Expected within a few seconds:
   - the bar disappears,
   - the 3 messages get ✓ and appear once (not twice) on B's screen,
   - in MongoDB each message exists once: `db.messages.find({ clientMsgId: { $exists: true } })`.

## Settings that make this work

| Setting | Value | Where |
|---|---|---|
| Heartbeat | ping every 25 s, close after 60 s silence (SRS 3.3) | `server/src/sockets/index.js` |
| Client reconnect | automatic, retry delay 0.5 s growing to 5 s, no limit | `client/src/api/socket.js` |
| Resend | outbox of un-acked messages, resent on reconnect | `client/src/context/ChatContext.jsx` |
| Duplicate filter | unique index (senderId, clientMsgId) | `server/src/models/Message.js` |
| Offline delivery | undelivered messages sent on connect | `messageHandler.onConnect` |

## Result of the manual test (5 Nov 2026)

Run in headless Chrome with the browser's offline mode (the same as DevTools "Offline"):
**8 / 8 checks pass.**

| Check | Result |
|---|---|
| While offline, the 3 messages wait | Shown with `…` |
| "Reconnecting…" bar | Appeared 58 s after going offline |
| User B while A is offline | Received nothing |
| After 62 s offline | All 3 messages reached B 0.8 s after reconnecting |
| On both screens | Each message shown once |
| Bar after reconnecting | Disappears |
| Ticks | The 3 messages show ticks instead of `…` |
| MongoDB | Each message stored exactly once |
