# Test Summary Report (Test Plan section 8)

Results for the v1.0 release, measured on 5 Nov 2026. CI numbers are for `main` at `81aafb6`
(all backlog issues merged); the local run is on the pre-release fix branch, which adds
security updates, one fix and documents on top of it. The detailed Part-3 reports (unit test,
system validation, code coverage and branch coverage) are in [`docs/reports/`](reports/README.md).

## Overall Test Results

| Item | Value |
|---|---|
| Build tested | `main` at `81aafb6` plus the pre-release fixes (`fix/pre-release-docs-and-security`) |
| Date | 5 Nov 2026 |
| Automated tests (passed / total) | CI, Linux, Node 20: 246 / 246 server tests on `main` at 2f004fe, and 52 / 52 unit tests on Windows and macOS. Local, Windows, Node 22: 246 / 247 with the new upload test (TC-SAFE-02, below) |
| Statement coverage (target >= 70 %) | 94.52 % (CI, `main` at 2f004fe); 94.54 % (local) |
| Test Plan cases implemented (`npm run trace`) | 42 / 42 |
| Browser checks | Sprint 2 video script: 37 / 37; group receipts: 14 / 14; 60-second network drop (TC-MSG-05): 8 / 8 (headless Chrome); cross-browser and mute: 11 / 11 in Chrome and in Firefox |
| Load and availability tests | Latency, capacity and fan-out pass (`docs/testing/PERFORMANCE.md`); availability 99.67 % over 60 minutes (`docs/OPERATIONS.md`) |
| Open defects (critical / high / medium / low) | 0 / 0 / 0 / 0 (no open `bug` issues) |
| Known dependency advisories | 3 moderate, each fixed only by a major upgrade: `file-type` (server), `react-router` and `react-router-dom` (client) |

## Portability Validation (NFR-QA-6)

Portability checks performed locally on Windows on 5 Nov 2026:

| Operating System | Check | Result |
|---|---|---|
| Windows | Server unit tests | **Pass — 16 suites, 52 tests passed** |
| Windows | Client production build | **Pass — Vite production build completed successfully** |
| Linux | Full server test suite and client checks | Run by the existing Linux CI jobs |
| macOS | Server unit tests and client build | Pass in CI (`portability` job) |

The new CI workflow adds a `portability` job with Windows and macOS runners. Both runners execute the server unit tests and client production build. The existing Linux jobs continue to run the full server test suite, lint and traceability checks, as well as the client lint and build.

### Windows Backup Permission Limitation

The known Windows-specific failure is `TC-SAFE-02` (backup files readable by the owner only).

The test expects POSIX owner-only file permissions (`0600`). Windows does not enforce Unix/POSIX file permissions in the same way as Linux and macOS, so this permission requirement cannot be guaranteed on Windows.

`server/scripts/backup.js` writes backup files directly using Mongoose. It does not call `mongodump`.

The backup permission requirement continues to be validated in the Linux environment. This Windows limitation is documented in `docs/DEVIATIONS.md` and `docs/testing/PORTABILITY.md`.

## Defects Found by the Browser Run

The automated tests cover the server, so these client-visible defects passed CI. All four are fixed, and the results above include those fixes.

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
| Messaging | TC-MSG-01..06 | Pass | Automated; the 60-second network drop also passes in the browser, 8 / 8 (`docs/testing/RELIABILITY.md`) |
| Presence and typing | TC-PRS-01..03 | Pass | Automated |
| Groups | TC-GRP-01..05 | Pass | Automated |
| Receipts | TC-RCP-01..02 | Pass | Automated |
| History and search | TC-HIS-01..03 | Pass | Automated, including the CSV export (TC-HIS-03) |
| Files | TC-FIL-01..03 | Pass | Automated |
| Notifications | TC-NOT-01..02 | Pass | Automated; muting also checked in Chrome, Firefox and Edge (no notification, unread badge still counts) |
| Performance | TC-PERF-01..04 | Pass | Latency p95 28-38 ms with 100 users; 200 connections with every message stored and delivered; 50-member group fan-out p95 37-67 ms (`docs/testing/PERFORMANCE.md`) |
| Scalability | NFR-QA-7 (no Test Plan case) | Pass | Guard test server/tests/unit/stateless.test.js; limits in docs/SCALABILITY.md |
| Security | TC-SEC-01..03 | Pass | TC-SEC-03: `npm run tls:check` 14 / 14 with a certificate, git-history secret search, stored user fields (`docs/testing/SECURITY_TEST.md`) |
| Safety | TC-SAFE-01 | Pass | Automated |
| Availability | NFR-QA-3 (no Test Plan case) | Pass | 99.67 % over 60 minutes under load; the server restarted in 1 s after it was stopped (`docs/OPERATIONS.md`) |
| Usability | TC-USAB-01 | Partial | Every primary action takes 1 click from the dashboard (9 / 9); the timed test with five first-time users has not been run (`docs/testing/USABILITY_TEST.md`) |
| Portability | NFR-QA-6 | Pass | Unit tests and client build pass on Windows and macOS; Chrome, Firefox and Edge pass 11 / 11 each (`docs/testing/PORTABILITY.md`) |

## Exit Criteria (Test Plan section 5)

For the v1.0 release:

- [ ] 100 % of planned test cases executed (not met: 41 of 42 fully executed; only the click-count part of TC-USAB-01 has been run, the timed test needs five first-time users)
- [x] All High-priority cases passed (TC-USAB-01 is Medium in the Test Plan although the SRS calls usability the highest priority: `docs/DEVIATIONS.md` P9)
- [x] 0 critical or high defects open
- [x] Coverage >= 70 %
- [ ] Every requirement in the RTM has at least one passed test case (not met: see "Requirements not fully met" in `docs/DEVIATIONS.md`)

Signed off by (Product Owner): ____________________