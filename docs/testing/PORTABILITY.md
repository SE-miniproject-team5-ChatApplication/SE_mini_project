# Portability (NFR-QA-6)

## Cross-Platform Compatibility

| Check | How |
|---|---|
| Server on Windows, Linux and macOS | CI job `portability` runs server unit tests and a client build on `windows-latest` and `macos-latest`. The main `server` job runs the full server test suite on Linux. |
| No OS-specific scripts | Project scripts use Node.js rather than OS-specific shell scripts. |
| Backup implementation | `server/scripts/backup.js` reads and writes backup files using Mongoose. It does not call `mongodump`. |
| Line endings | `.gitattributes` stores text files with LF on every OS. |
| Paths | The code uses `path.join` and `path.resolve` instead of hard-coded operating-system-specific paths. |

## Windows Backup Permission Limitation

**Known limitation: TC-SAFE-02 fails on Windows.**

The backup security test expects backup files to have owner-only permissions (POSIX mode `0600`).

Windows does not enforce Unix/POSIX file permissions in the same way as Linux and macOS. Consequently, backup files cannot be guaranteed to be accessible only to their owner through POSIX permission bits on Windows.

This is a documented platform limitation, not a failure of the backup data-writing process.

The Linux CI environment continues to validate the backup permission requirement.

## Manual Browser Compatibility Results

Manual testing was performed on 5 November 2026.

| Browser / Viewport | Login | Chat | Upload / Thumbnail | Group | Notes |
|---|---|---|---|---|---|
| Google Chrome | Pass | Pass | Pass | Pass | Login, chat history, message sending, image thumbnail, group information and group messaging verified. The same 11 headless checks as Firefox also pass (Chrome 156). |
| Microsoft Edge 156 | Pass | Pass | Pass | Pass | Login, existing chat history and image thumbnail verified by hand. Headless Edge run on 5 Nov 2026: two users, chat, image thumbnail, group message and muting (TC-NOT-02); 11 / 11 checks. |
| Mozilla Firefox 150 | Pass | Pass | Pass | Pass | Headless Firefox run on 5 Nov 2026: two users, chat, image thumbnail, group message and muting (TC-NOT-02); 11 / 11 checks. |
| Chrome mobile viewport (360 px) | Not tested | Pass | Not tested | Not tested | Header, sidebar, message bubbles and composer fit. No horizontal overflow observed. |

## CI Test Coverage

| Operating System | Server Tests | Client Build |
|---|---|---|
| Ubuntu (Linux) | Full server test suite, lint and traceability | Yes |
| Windows | Unit tests: 52/52 passed locally (16 suites) | Production build passed locally |
| macOS | Unit tests pass in CI (`portability` job) | Production build passes in CI |

**CI note:** The additional Windows and macOS portability jobs increase the duration of pull request checks. Windows runners may take longer than Linux runners.