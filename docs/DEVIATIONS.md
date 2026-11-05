# Deviations from the Part-1 documents (SRS v1.1, SAD v1.0, Test Plan v1.0)

Part-2 deliverable 2(i): every difference between what we documented and what we built is listed here with the reason. Explain these in the final demo.

Section numbers refer to the versions named in the title. The updated documents in `Documents/Part-1 Deliverables/` are SRS v1.2, SAD v1.1 and Test Plan v1.1.

## Process and schedule

| # | Document says | What we did | Why |
|---|---|---|---|
| P1 | SAD 4.6: four sprints (skeleton+auth; messaging, presence, groups; receipts, history, files, notifications; hardening) | A dry-run week (12-16 Oct), Sprint 1 (19-23 Oct), Sprint 2 (26 Oct - 2 Nov) and Sprint 3 (3-6 Nov) for the Stretch list | The Part-2 brief fixed two sprints, and Part 3 allows an optional Sprint 3 for spill-over. Items were re-planned in the GitHub Project (backlog "Sprint" field). |
| P2 | Test Plan 7: system/performance tests 2-10 Nov, UAT 12-13 Nov | Unit + integration tests run in CI on every PR from Sprint 1; dashboard and search speed tests run with them | Same two-sprint schedule. Message latency, capacity and group fan-out were measured with load scripts (`docs/testing/PERFORMANCE.md`); the usability test was not run (see "Requirements not fully met"). |
| P3 | Test Plan 5 and 6: Playwright UI automation, Artillery load tests, OWASP ZAP, testssl.sh | Not used. Browser flows are checked by hand (`docs/testing/RELIABILITY.md`); speed tests are Jest integration tests (`perf.dashboard.test.js`, `perf.search.test.js`); message latency, capacity and group fan-out are Node load scripts (`server/scripts/perf/`) | Fewer tools to install on student laptops. |
| P4 | SAD 3.9: gitleaks in CI | gitleaks is a manual command (`docs/SECURITY.md`) | The gitleaks GitHub Action needs a paid licence for organisation repositories. |
| P5 | Test Plan 6: seed script with 10 users, 3 groups and sample data | No seed script in the repository; tests create their own data | Each test sets up exactly the data it needs. |
| P6 | PRC-4: no feature merges after 30 Oct | 30 pull requests were merged between 31 Oct and 5 Nov: #196-#199, #200-#203, #205-#225 and the Part-3 test reports pull request | Sprint 2 backlog items finished late. #205 repaired a broken `main`, and #209 added the missing profile page UI. #211 fixed defects found while preparing the demo, which PRC-4 allows. REQ-RCP-5, REQ-HIS-5, REQ-NOT-4, NFR-SEC-3, NFR-PERF-1, NFR-PERF-2, NFR-PERF-5, NFR-QA-1, NFR-QA-3, NFR-QA-6 and NFR-QA-7 were finished from the Stretch backlog in Sprint 3, before v1.0 was tagged. #225 applied security updates and one fix before the release. |
| P7 | SRS NFR-PERF-1 / Test Plan TC-PERF-01: 100 users on a LAN, Artillery script | One laptop runs the server, MongoDB and 100 simulated users; each user sends one message every 5 s, spread evenly; latency is measured to the recipient's connection, not the screen. For capacity, 200 users each send one message a second; for fan-out, one member sends 10 messages to a 50-member group (`docs/testing/PERFORMANCE.md`) | The SRS gives no message rate. One machine is a harder test than a LAN, and the script needs no extra tools. |
| P8 | SRS NFR-QA-3: available at least 99 % during scheduled demonstration and testing periods | Measured once for 60 minutes on one laptop: `/api/health` checked every 10 s under a continuous chat load, with the server run under a restart script (`docs/OPERATIONS.md`) | No demo or test period had been scheduled yet; a measured session shows the method and the result. |

## Technology

| # | Document says | What we did | Why |
|---|---|---|---|
| T1 | SRS 3.2: bcrypt 5.x | `bcryptjs` 3.x | Pure JavaScript - no native build tools needed on Windows (NFR-QA-6). Same `$2b$` hash format, cost factor at least 10 (REQ-AUTH-3 unchanged). |
| T2 | SRS 3.2: Multer 1.x | Multer 2.x | Multer 1.x has known security vulnerabilities; 2.x fixes them with the same API. |
| T3 | SAD 3.6: express-validator | Own validation functions in each service, plus `middleware/rejectUnsafeKeys.js` and `utils/unsafeKeys.js` for NoSQL injection | Simpler, fewer dependencies. |
| T4 | SRS 2.4: Node.js 18 LTS | Node.js 20 LTS recommended (CI uses 20); `engines` still allows >= 18 | Node 18 reached end-of-life in April 2025. |
| T5 | SAD 4.6 open issue: plain CSS or Tailwind | Plain CSS (`client/src/styles.css`) | No build plugin needed; small app. |
| T6 | SAD 4.4: pino logging | pino, with password/token/message fields redacted | (as planned - listed because redaction paths are a design detail added) |
| T7 | SRS 3.2: MongoDB 6.x | MongoDB 6 or newer (README); CI uses MongoDB 7 | All automated tests pass on MongoDB 7 in CI. |
| T8 | Test Plan TC-SAFE-02: backup files restricted to their owner | TC-SAFE-02 fails on Windows because Windows does not enforce Unix/POSIX owner-only file permissions. `server/scripts/backup.js` writes backup files using Mongoose; it does not call `mongodump`. | POSIX mode `0600` is not enforced on Windows in the same way as Linux. The owner-only permission requirement continues to be checked in the Linux environment. This is documented as a Windows platform limitation. |

## Code structure

| # | Document says | What we did | Why |
|---|---|---|---|
| S1 | SAD 4.1 and SRS Appendix C: code under `server/routes/`, `server/sockets/` | Code is under `server/src/`; socket handlers are in `server/src/sockets/handlers/` | Separates source from `tests/` and `scripts/` in the server folder. |
| S2 | SAD 4.1: `sockets/groupHandler.js` | No group socket handler. Group changes go through `groupService.js`, which sends `group:update`; group messages use `messageHandler.js` | Group changes arrive over REST, so no separate handler was needed. |
| S3 | SAD 4.1: one route file per design unit | Extra route files `contacts.js`, `conversations.js`, `health.js`, `presence.js` and `search.js` | Keeps each file to one responsibility (NFR-QA-4). |
| S4 | SRS NFR-QA-7: handlers stateless so a Redis adapter can be added | Handlers keep no state and all real-time messages use Socket.IO rooms; the presence connection map, both rate limits and the upload folder are per server, and no adapter is installed (docs/SCALABILITY.md) | The requirement asks only that an adapter can be added later. |

## Data model and API

| # | Document says | What we did | Why |
|---|---|---|---|
| D1 | SRS 7: six collections | A seventh collection `revokedtokens` (auto-expiring) | REQ-AUTH-6 + REQ-AUTH-7: a logged-out token must stop working before its 24 h expiry. |
| D2 | Appendix B.2: status includes "deleted" | Status `deleted` plus `deletedAt`; the original text stays in the database but is never returned | BR-4: "deletion does not remove the record for audit but hides its content". |
| D3 | SAD 4.3 endpoint list | Added: `POST /api/conversations/direct`, `GET /api/groups/:id`, `GET /api/presence`, `GET /api/users/:id/avatar`, `DELETE /api/users/me`, `GET /api/health`, `GET /api/messages/:id/receipts`. Changed: removing a member is `DELETE /api/groups/:id/members/:userId` (no request body). | Needed to start direct chats (BR-2), show group info (REQ-GRP-2), initial presence (REQ-PRS-1), show avatars, delete accounts (NFR-SEC-7), check the server is up and show per-member receipts (REQ-RCP-5). Full list: `docs/API.md`. |
| D4 | SAD 4.3.6: `message:ack` event | `message:ack` event **and** the Socket.IO acknowledgement callback; extra event `session:ready` | The callback lets the client match each ack to its message without extra bookkeeping. Full list: `docs/SOCKET_EVENTS.md`. |
| D5 | SRS 7 / NFR-PERF-4: text index for search | The text index exists, but search uses a case-insensitive pattern match limited to the user's conversations | MongoDB text search only matches whole words; REQ-HIS-3 users expect "meet" to find "meeting". Tested within the 2 s limit on 10,000 messages (TC-PERF-03). |
| D6 | SAD 4.3.6: `notification:unread` event | Event not implemented. Unread counts come from `GET /api/conversations`; a count is reset by the `message:read` event | The client already refreshes the conversation list, so no separate event was needed. |

## Requirements not fully met

Every backlog issue is closed. These requirements are built, but their acceptance test was not
fully carried out.

| Requirement | Issue | State | Test case |
|---|---|---|---|
| REQ-NOT-4 mute a conversation | #61 | Built: Mute button in the chat header (`MuteButton.jsx`); muted chats count unread messages but show no notification | TC-NOT-02 has no automated test |
| NFR-SEC-3 TLS | #73 | Built: HTTPS and WSS with TLS 1.2 or newer when a certificate is configured (`docs/TLS.md`); local runs use HTTP | TC-SEC-03 partly run: configuration tests only; testssl.sh and OWASP ZAP were not run |
| NFR-QA-1 first message within 3 min | #78 | Test procedure written (`docs/testing/USABILITY_TEST.md`) | TC-USAB-01 not carried out: no results recorded |
| NFR-QA-6 portability | #83 | CI runs the server unit tests and the client build on Windows and macOS (both pass); Chrome checked by hand, Edge partly | Firefox not tested; TC-SAFE-02 fails on Windows (T8) |

## Behaviour the SRS did not specify, or that differs from it (our decisions)

| # | Decision |
|---|---|
| B1 | Group admins can add only people from their own contacts (same rule as group creation, REQ-GRP-1). |
| B2 | A member added to a group later can read the group's earlier history. |
| B3 | Presence is shared with the user's contacts in both directions (people who added them, and people they added). |
| B4 | Uploaded files are always sent as downloads (`Content-Disposition: attachment`). Images (JPG, PNG, GIF) are shown as inline thumbnails, fetched with the login token (NFR-SAFE-3). |
| B5 | In `NODE_ENV=development`, requests from the same machine are not rate-limited, because all local browsers share one IP behind the dev proxy. Production and tests use the SRS limits (NFR-SEC-6). |
| B6 | When an account is deleted, messages it already sent stay in the other participants' history as "Deleted user" (NFR-SEC-7, BR-4). |
| B7 | Logging out ends only that session (that tab/device); other sessions of the same user stay logged in. |
| B8 | A group message counts as read when every current member has read it, and it is checked again when a member leaves, is removed or deletes their account. A member who joins later does not turn a read message back to unread, because a status only moves forward (REQ-RCP-1); messages not yet read by everyone also wait for the new member. |