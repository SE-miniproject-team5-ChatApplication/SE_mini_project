# Test Summary Report (Test Plan section 8)

This report preserves the full-suite baseline recorded on 2 Nov 2026 and adds the portability checks performed on 5 Nov 2026 for NFR-QA-6.

## Overall Test Results

| Item | Value |
|---|---|
| Historical full-suite baseline | `main` at `4ba43b3` plus REQ-RCP-5 |
| Historical baseline date | 2 Nov 2026 |
| Historical automated tests | Local, Windows, Node 22: 227 / 228. CI, Linux, Node 20: 223 / 223 on `4ba43b3`; the REQ-RCP-5 run was on its pull request |
| Historical statement coverage (target >= 70 %) | 94.68 % (local); 94.52 % in CI on `4ba43b3` |
| Historical Test Plan cases implemented (`npm run trace`) | 39 / 42 |
| Manual cases executed (USAB, browser, reliability) | Sprint 2 video script run in a headless browser: 37 checks passed. Other manual cases not recorded |
| Open defects (critical / high / medium / low) | 0 / 0 / 0 / 0 (no open `bug` issues) |

## Portability Validation (NFR-QA-6)

Portability checks performed locally on Windows on 5 Nov 2026:

| Operating System | Check | Result |
|---|---|---|
| Windows | Server unit tests | **Pass — 13 suites, 42 tests passed** |
| Windows | Client production build | **Pass — Vite production build completed successfully** |
| Linux | Full server test suite and client checks | Run by the existing Linux CI jobs |
| macOS | Server unit tests and client build | Pending GitHub Actions CI result |

The new CI workflow adds a `portability` job with Windows and macOS runners. Both runners execute the server unit tests and client production build. The existing Linux jobs continue to run the full server test suite, lint and traceability checks, as well as the client lint and build.

### Windows Backup Permission Limitation

The known Windows-specific failure is `TC-SAFE-02` (backup files readable by the owner only).

The test expects POSIX owner-only file permissions (`0600`). Windows does not enforce Unix/POSIX file permissions in the same way as Linux and macOS, so this permission requirement cannot be guaranteed on Windows.

`server/scripts/backup.js` writes backup files directly using Mongoose. It does not call `mongodump`.

The backup permission requirement continues to be validated in the Linux environment. This Windows limitation is documented in `docs/DEVIATIONS.md` and `docs/testing/PORTABILITY.md`.

## Defects Found by the Browser Run

The automated tests cover the server, so these client-visible defects passed CI. All four are fixed, and the historical test results include those fixes.

| Defect | Requirement | Cause |
|---|---|---|
| Image previews never appeared | REQ-FIL-3 | The client requested `/api/api/files/...` |
| Attachments could not be downloaded | REQ-FIL-4 | A plain link cannot send the login token |
| Garbled paperclip in the chat list preview | REQ-FIL-1 | Damaged text encoding in `messageService.js` |
| Garbled ellipsis in long search results | REQ-HIS-3 | Damaged text encoding in `historyService.js` |

## Results by Area

| Area | Test cases | Result | Notes |
|---|---|---|---|
| Authentication | TC-AUTH-01..06 | Pass | Automated |
| Profile and contacts | TC-PRO-01..03 | Pass | Automated |
| Messaging | TC-MSG-01..06 | Pass | Automated; the manual network drop in `docs/testing/RELIABILITY.md` is not recorded |
| Presence and typing | TC-PRS-01..03 | Pass | Automated |
| Groups | TC-GRP-01..05 | Pass | Automated |
| Receipts | TC-RCP-01..02 | Pass | Automated |
| History and search | TC-HIS-01..03 | TC-HIS-01, -02 pass; TC-HIS-03 not run in the historical baseline | Historical baseline |
| Files | TC-FIL-01..03 | Pass | Automated |
| Notifications | TC-NOT-01..02 | TC-NOT-01 pass; TC-NOT-02 not run in the historical baseline | Historical baseline |
| Performance | TC-PERF-01..04 | Pass | Latency p95 28-38 ms with 100 users; 200 connections with every message stored and delivered; 50-member group fan-out p95 37-67 ms (`docs/testing/PERFORMANCE.md`) |
| Security | TC-SEC-01..03 | TC-SEC-01, -02 pass; TC-SEC-03 partial | Only the configuration checks are automated; TLS is not built and ZAP/testssl were not run |
| Safety | TC-SAFE-01 | Pass | Automated |
| Availability | NFR-QA-3 (no Test Plan case) | Pass | 99.67 % over 60 minutes under load; the server restarted in 1 s after it was stopped (`docs/OPERATIONS.md`) |
| Usability | TC-USAB-01 | Not run in the historical baseline | See `docs/testing/USABILITY_TEST.md` |
| Portability | NFR-QA-6 | Windows unit tests and client build passed; macOS CI pending | See `docs/testing/PORTABILITY.md` |

## Exit Criteria (Test Plan section 5)

The following figures refer to the historical full-suite baseline:

- [ ] 100 % of planned test cases executed (not met: 41 of 42 implemented; TC-NOT-02 has no test, and the TC-USAB-01 procedure has not been carried out)
- [ ] All High-priority cases passed (not met: TC-SEC-03 partial)
- [x] 0 critical or high defects open
- [x] Coverage >= 70 %
- [ ] Every requirement in the RTM has at least one passed test case (not met: see "Requirements not delivered" in `docs/DEVIATIONS.md`)

Signed off by (Product Owner): ____________________