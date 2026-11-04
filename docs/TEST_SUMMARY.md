# Test Summary Report (Test Plan section 8)

Numbers come from CI (`npm run test:ci`), `npm run trace` and a local run on Windows.
REQ-RCP-5 was added after `4ba43b3`; v1.0 is tagged once it is merged and CI is green.

| Item | Value |
|---|---|
| Build / tag tested | `main` at `4ba43b3` plus REQ-RCP-5 (`feature/REQ-RCP-5-group-read-receipts`) |
| Date | 2 Nov 2026 |
| Automated tests (passed / total) | Local, Windows, Node 22: 227 / 228. CI, Linux, Node 20: 223 / 223 on `4ba43b3`; the REQ-RCP-5 run is on its pull request |
| Statement coverage (target >= 70 %) | 94.68 % (local); 94.52 % in CI on `4ba43b3` |
| Test Plan cases implemented (`npm run trace`) | 39 / 42 |
| Manual cases executed (USAB, browser, reliability) | Sprint 2 video script run in a headless browser: 37 checks passed. Other manual cases not recorded |
| Open defects (critical / high / medium / low) | 0 / 0 / 0 / 0 (no open `bug` issues) |

The one local failure is `TC-SAFE-02 backup files are readable by the owner only`. It checks
Unix file permissions, which Windows does not have, and it passes on Linux.

## Defects found by the browser run

The automated tests cover the server, so these client-visible defects passed CI. All four are
fixed, and the table above includes the fixes.

| Defect | Requirement | Cause |
|---|---|---|
| Image previews never appeared | REQ-FIL-3 | The client requested `/api/api/files/...` |
| Attachments could not be downloaded | REQ-FIL-4 | A plain link cannot send the login token |
| Garbled paperclip in the chat list preview | REQ-FIL-1 | Damaged text encoding in `messageService.js` |
| Garbled ellipsis in long search results | REQ-HIS-3 | Damaged text encoding in `historyService.js` |

## Results by area

| Area | Test cases | Result | Notes |
|---|---|---|---|
| Authentication | TC-AUTH-01..06 | Pass | Automated |
| Profile and contacts | TC-PRO-01..03 | Pass | Automated |
| Messaging | TC-MSG-01..06 | Pass | Automated; the manual network drop in `docs/testing/RELIABILITY.md` is not recorded |
| Presence and typing | TC-PRS-01..03 | Pass | Automated |
| Groups | TC-GRP-01..05 | Pass | Automated |
| Receipts | TC-RCP-01..02 | Pass | Automated |
| History and search | TC-HIS-01..03 | TC-HIS-01, -02 pass; TC-HIS-03 not run | REQ-HIS-5 is not built |
| Files | TC-FIL-01..03 | Pass | Automated |
| Notifications | TC-NOT-01..02 | TC-NOT-01 pass; TC-NOT-02 not run | REQ-NOT-4 has no mute control in the UI |
| Performance | TC-PERF-01..04 | TC-PERF-02, -03 pass; TC-PERF-01 partial; TC-PERF-04 not run | Latency (NFR-PERF-1) passes: p95 28-38 ms with 100 users, see `docs/testing/PERFORMANCE.md`. Capacity (NFR-PERF-2) and fan-out not run |
| Security | TC-SEC-01..03 | TC-SEC-01, -02 pass; TC-SEC-03 partial | Only the configuration checks are automated; TLS is not built and ZAP/testssl were not run |
| Safety | TC-SAFE-01 | Pass | Automated |
| Usability | TC-USAB-01 | Not run | |

## Exit criteria (Test Plan section 5)

- [ ] 100 % of planned test cases executed (not met: 39 of 42 implemented)
- [ ] all High-priority cases passed (not met: TC-PERF-01 and TC-SEC-03 partial)
- [x] 0 critical or high defects open
- [x] coverage >= 70 %
- [ ] every requirement in the RTM has at least one passed test case (not met: see "Requirements not delivered" in `docs/DEVIATIONS.md`)

Signed off by (Product Owner): ____________________
