/* eslint-disable no-console */
// Part-3 test reports: runs every server test once with coverage and writes
//   docs/reports/UNIT_TEST_REPORT.md, SYSTEM_VALIDATION_REPORT.md,
//   CODE_COVERAGE_REPORT.md, BRANCH_COVERAGE_REPORT.md and docs/reports/coverage/ (HTML).
// Usage (MongoDB running, as for npm test):  npm run reports --prefix server
// Add --no-run to rebuild the reports from the last run in server/coverage/.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { TEST_CASES, findCoverage } = require('./check-traceability');

const SERVER = path.join(__dirname, '..');
const ROOT = path.join(SERVER, '..');
const COVERAGE = path.join(SERVER, 'coverage');
const OUT = path.join(ROOT, 'docs', 'reports');
const RESULTS = path.join(COVERAGE, 'results.json');

// Test Plan Appendix A: title, level, priority, owner.
const PLAN = {
  'TC-AUTH-01': ['Register with valid details', 'Integration / Functional', 'High', 'Prachi'],
  'TC-AUTH-02': ['Reject invalid and duplicate registration', 'Unit / Functional', 'High', 'Prachi'],
  'TC-AUTH-03': ['Login success issues JWT', 'Integration / Functional', 'High', 'Prachi'],
  'TC-AUTH-04': ['Account lock-out after repeated failures', 'Integration / Functional / Security', 'High', 'Prachi'],
  'TC-AUTH-05': ['Logout closes session', 'System / Functional', 'Medium', 'Prachi'],
  'TC-AUTH-06': ['Unauthenticated access is rejected', 'Integration / Security', 'High', 'Prachi'],
  'TC-PRO-01': ['Edit profile and avatar rules', 'System / Functional', 'Medium', 'Prachi'],
  'TC-PRO-02': ['Search users and manage contacts', 'Integration / Functional', 'Medium', 'Prachi'],
  'TC-PRO-03': ['Change password', 'Integration / Functional / Security', 'Medium', 'Prachi'],
  'TC-MSG-01': ['Real-time one-to-one delivery', 'System / Functional', 'High', 'Omkar'],
  'TC-MSG-02': ['Message length validation', 'Unit / Functional', 'High', 'Omkar'],
  'TC-MSG-03': ['Message ordering', 'Integration / Functional', 'High', 'Omkar'],
  'TC-MSG-04': ['Offline delivery', 'System / Functional', 'High', 'Omkar'],
  'TC-MSG-05': ['Reconnect and resend without duplicates', 'System / Reliability', 'High', 'Omkar'],
  'TC-MSG-06': ['Delete own message only', 'Integration / Functional', 'Medium', 'Omkar'],
  'TC-PRS-01': ['Presence and last seen', 'System / Functional', 'Medium', 'Pruthviraj'],
  'TC-PRS-02': ['Typing indicator timing', 'System / Functional / Performance', 'Medium', 'Pruthviraj'],
  'TC-PRS-03': ['Multi-session presence', 'Integration / Functional', 'Low', 'Pruthviraj'],
  'TC-GRP-01': ['Group creation limits', 'Integration / Functional', 'High', 'Pruthviraj'],
  'TC-GRP-02': ['Admin-only group management', 'Integration / Functional / Security', 'High', 'Pruthviraj'],
  'TC-GRP-03': ['Group message delivery', 'System / Functional', 'High', 'Pruthviraj'],
  'TC-GRP-04': ['Leave group and admin succession', 'Integration / Functional', 'Medium', 'Pruthviraj'],
  'TC-GRP-05': ['Non-member access blocked', 'Integration / Security', 'High', 'Pruthviraj'],
  'TC-RCP-01': ['Receipt status progression', 'System / Functional', 'High', 'Omkar'],
  'TC-RCP-02': ['Group read receipts', 'System / Functional', 'Medium', 'Omkar'],
  'TC-HIS-01': ['Conversation list and paging', 'Integration / Functional', 'High', 'Raksha'],
  'TC-HIS-02': ['Keyword search and isolation', 'Integration / Functional / Security', 'High', 'Raksha'],
  'TC-HIS-03': ['Export conversation as CSV', 'Integration / Functional', 'Low', 'Raksha'],
  'TC-FIL-01': ['Upload and preview valid file', 'System / Functional', 'Medium', 'Raksha'],
  'TC-FIL-02': ['Reject invalid files', 'Integration / Functional / Security', 'High', 'Raksha'],
  'TC-FIL-03': ['Attachment download authorisation', 'Integration / Security', 'High', 'Raksha'],
  'TC-NOT-01': ['Unread badge and reset', 'System / Functional', 'Medium', 'Raksha'],
  'TC-NOT-02': ['Mute conversation', 'System / Functional', 'Low', 'Raksha'],
  'TC-PERF-01': ['Message latency and connection capacity', 'System / Performance', 'High', 'Omkar'],
  'TC-PERF-02': ['Page and history load time', 'System / Performance', 'Medium', 'Raksha'],
  'TC-PERF-03': ['Search response time', 'System / Performance', 'Medium', 'Raksha'],
  'TC-PERF-04': ['Group fan-out time', 'System / Performance', 'Medium', 'Pruthviraj'],
  'TC-SEC-01': ['XSS and NoSQL injection', 'Integration / Security', 'High', 'Prachi'],
  'TC-SEC-02': ['Rate limiting', 'Integration / Security', 'Medium', 'Pruthviraj'],
  'TC-SEC-03': ['Transport security and secrets', 'System / Security', 'High', 'Prachi'],
  'TC-SAFE-01': ['Fault tolerance and backup', 'System / Reliability', 'Medium', 'Omkar'],
  'TC-USAB-01': ['First-time usability', 'System / Usability', 'Medium', 'Raksha'],
};

// Cases whose result is not decided by the automated tests alone.
const NOT_AUTOMATED = {
  'TC-PERF-01': ['Pass', 'Load scripts `perf:latency` and `perf:capacity`: p95 28-38 ms with 100 users; 200 connections, every message stored and delivered (`docs/testing/PERFORMANCE.md`)'],
  'TC-PERF-04': ['Pass', 'Load script `perf:fanout`: p95 37-67 ms with 50 members (`docs/testing/PERFORMANCE.md`)'],
  'TC-NOT-02': ['Not run', 'The mute control is built (REQ-NOT-4), but there is no automated test and no recorded manual run'],
  'TC-USAB-01': ['Not run', 'Procedure written (`docs/testing/USABILITY_TEST.md`); no results recorded'],
  'TC-SEC-03': ['Partial', 'Only the configuration is tested (TLS settings, JWT secret); testssl.sh, OWASP ZAP and gitleaks were not run (`docs/TLS.md`)'],
};

// Tests that fail only because of the machine they run on.
const KNOWN_PLATFORM_FAILURES = {
  'TC-SAFE-02 backup files are readable by the owner only':
    'Windows has no Unix file permissions, so the 0600 check cannot pass there. It passes in CI on Linux (`docs/DEVIATIONS.md` T8).',
};

const pct = (n) => `${n.toFixed(2)} %`;
const rel = (file) => path.relative(ROOT, file).replace(/\\/g, '/');
const tcOf = (name) => (name.match(/TC-[A-Z]+-\d+/) || [])[0] || '';

function runTests() {
  const jest = path.join(SERVER, 'node_modules', 'jest', 'bin', 'jest.js');
  const args = [jest, '--runInBand', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=json',
    '--coverageReporters=html', '--coverageReporters=text-summary', '--json', `--outputFile=${RESULTS}`];
  const r = spawnSync(process.execPath, args, { cwd: SERVER, stdio: 'inherit' });
  if (!fs.existsSync(RESULTS)) throw new Error('jest did not write coverage/results.json');
  return r.status;
}

function header(title, results) {
  let commit = 'unknown';
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    // not a git checkout
  }
  const when = new Date(results.startTime).toISOString().replace('T', ' ').slice(0, 16);
  return [
    `# ${title}`,
    '',
    `Generated by \`npm run reports --prefix server\` on ${when} UTC from commit \`${commit}\`,`,
    `on ${os.type()} with Node ${process.version}. Rebuild it after any code change.`,
    '',
  ];
}

function tests(results, filter = () => true) {
  return results.testResults
    .filter((s) => filter(rel(s.name)))
    .flatMap((s) => s.assertionResults.map((t) => ({ file: rel(s.name), name: t.fullName, status: t.status, ms: t.duration || 0 })));
}

function unitReport(results) {
  const isUnit = (f) => f.startsWith('server/tests/unit/');
  const all = tests(results, isUnit);
  const suites = results.testResults.filter((s) => isUnit(rel(s.name)));
  const passed = all.filter((t) => t.status === 'passed').length;
  const lines = header('Unit Test Report', results);
  lines.push(
    'Unit tests check one service, validator or helper on its own, without the HTTP server or the',
    'database (Test Plan section 5). They live in `server/tests/unit/` and run in CI on Linux,',
    'Windows and macOS.',
    '',
    '| Item | Value |',
    '|---|---|',
    `| Test files | ${suites.length} |`,
    `| Tests | ${all.length} |`,
    `| Passed | ${passed} |`,
    `| Failed | ${all.length - passed} |`,
    '',
    '## By file',
    '',
    '| File | Tests | Passed | Time |',
    '|---|---|---|---|'
  );
  for (const s of suites) {
    const t = s.assertionResults;
    lines.push(`| \`${rel(s.name).replace('server/tests/unit/', '')}\` | ${t.length} | ${t.filter((x) => x.status === 'passed').length} | ${((s.endTime - s.startTime) / 1000).toFixed(1)} s |`);
  }
  lines.push('', '## Every test', '', '| File | Test case | Test | Result |', '|---|---|---|---|');
  for (const t of all) {
    lines.push(`| \`${t.file.replace('server/tests/unit/', '')}\` | ${tcOf(t.name) || '-'} | ${t.name.replace(/\|/g, '\\|')} | ${t.status === 'passed' ? 'Pass' : 'FAIL'} |`);
  }
  return lines;
}

function systemReport(results) {
  const all = tests(results);
  const found = findCoverage();
  const failed = all.filter((t) => t.status !== 'passed');
  const lines = header('System Validation Report', results);
  lines.push(
    'Validates every test case in Test Plan Appendix A against the built system: the automated',
    'integration and unit tests from this run, the load and availability scripts, and the manual',
    'procedures. Requirements per case come from `server/scripts/check-traceability.js`.',
    '',
    '## Automated run',
    '',
    '| Item | Value |',
    '|---|---|',
    `| Test files | ${results.numTotalTestSuites} |`,
    `| Tests | ${results.numTotalTests} |`,
    `| Passed | ${results.numPassedTests} |`,
    `| Failed | ${results.numFailedTests} |`,
    ''
  );
  if (failed.length) {
    lines.push('Failed in this run:', '');
    for (const t of failed) {
      const known = Object.entries(KNOWN_PLATFORM_FAILURES).find(([k]) => t.name.includes(k));
      lines.push(`- \`${t.file}\`: ${t.name}. ${known ? known[1] : '**Not explained - investigate before release.**'}`);
    }
    lines.push('');
  }
  lines.push('## Test Plan cases', '', '| Test case | Title | Requirements | Priority | Owner | Automated tests | Result | Evidence |', '|---|---|---|---|---|---|---|---|');
  const counts = { Pass: 0, Partial: 0, 'Not run': 0, Fail: 0 };
  for (const [id, reqs] of Object.entries(TEST_CASES)) {
    const [title, , priority, owner] = PLAN[id];
    const mine = all.filter((t) => tcOf(t.name) === id);
    const ok = mine.filter((t) => t.status === 'passed').length;
    const platformOnly = mine.filter((t) => t.status !== 'passed').every((t) => Object.keys(KNOWN_PLATFORM_FAILURES).some((k) => t.name.includes(k)));
    let result;
    let evidence = (found[id] || []).map((f) => `\`${f}\``).join(', ') || '-';
    if (NOT_AUTOMATED[id]) [result, evidence] = [NOT_AUTOMATED[id][0], NOT_AUTOMATED[id][1]];
    else if (mine.length === 0) result = 'Not run';
    else result = ok === mine.length || platformOnly ? 'Pass' : 'Fail';
    counts[result] += 1;
    lines.push(`| ${id} | ${title} | ${reqs} | ${priority} | ${owner} | ${mine.length ? `${ok} / ${mine.length}` : '-'} | ${result} | ${evidence} |`);
  }
  lines.splice(lines.indexOf('## Test Plan cases'), 0,
    `**Result: ${counts.Pass} of 42 test cases pass, ${counts.Partial} partial, ${counts['Not run']} not run, ${counts.Fail} failed.**`, '');
  lines.push(
    '',
    '## Non-functional requirements',
    '',
    '| Requirement | How it was validated | Result |',
    '|---|---|---|',
    '| NFR-PERF-1 latency at 100 users | `npm run perf:latency`, one laptop, 100 users | Pass: p95 28-38 ms (limit 500 ms) |',
    '| NFR-PERF-2 200 connections | `npm run perf:capacity` | Pass: 1000 of 1000 messages stored and delivered |',
    '| NFR-PERF-3 dashboard and history | `perf.dashboard.test.js` (TC-PERF-02) | Pass |',
    '| NFR-PERF-4 search over 10,000 messages | `perf.search.test.js` (TC-PERF-03) | Pass |',
    '| NFR-PERF-5 50-member fan-out | `npm run perf:fanout` | Pass: p95 37-67 ms (limit 1000 ms) |',
    '| NFR-QA-2 no acknowledged message lost | `reliability.test.js`, `messages.resend.test.js` (TC-MSG-05) | Pass |',
    '| NFR-QA-3 availability | `npm run monitor` for 60 minutes under load | Pass: 99.67 % (`docs/OPERATIONS.md`) |',
    '| NFR-QA-5 coverage and traceability | `npm run test:ci`, `npm run trace` in CI | Pass (`CODE_COVERAGE_REPORT.md`) |',
    '| NFR-QA-6 portability | CI `portability` job on Windows and macOS; manual browser checks | Partial: Firefox not checked (`docs/testing/PORTABILITY.md`) |',
    '| NFR-QA-7 stateless handlers | `stateless.test.js` | Pass (`docs/SCALABILITY.md`) |',
    '',
    'The load and availability figures are the recorded results of runs on 4-5 Nov 2026; this',
    'report does not repeat them. Requirements that are built but not fully validated are listed',
    'in `docs/DEVIATIONS.md` ("Requirements not fully met").'
  );
  return lines;
}

function coverageReport(results, summary) {
  const t = summary.total;
  const lines = header('Code Coverage Report', results);
  lines.push(
    'Coverage of `server/src` (except `server.js`) by the unit and integration tests, measured by',
    'Jest. NFR-QA-5 requires at least 70 % statement coverage, and CI fails below that.',
    'Interactive version: [`coverage/index.html`](coverage/index.html).',
    '',
    '| Measure | Covered | Total | Coverage | Target |',
    '|---|---|---|---|---|',
    `| Statements | ${t.statements.covered} | ${t.statements.total} | ${pct(t.statements.pct)} | 70 % |`,
    `| Lines | ${t.lines.covered} | ${t.lines.total} | ${pct(t.lines.pct)} | - |`,
    `| Functions | ${t.functions.covered} | ${t.functions.total} | ${pct(t.functions.pct)} | - |`,
    `| Branches | ${t.branches.covered} | ${t.branches.total} | ${pct(t.branches.pct)} | - (see \`BRANCH_COVERAGE_REPORT.md\`) |`,
    '',
    '## By file',
    '',
    '| File | Statements | Lines | Functions |',
    '|---|---|---|---|'
  );
  const files = Object.keys(summary).filter((k) => k !== 'total').sort();
  for (const f of files) {
    const s = summary[f];
    lines.push(`| \`${rel(f).replace('server/src/', '')}\` | ${pct(s.statements.pct)} | ${pct(s.lines.pct)} | ${pct(s.functions.pct)} |`);
  }
  return lines;
}

function describeBranch(type, i, n) {
  if (type === 'if') return i === 0 ? 'the `if` part' : 'the `else` part (or skipping the `if`)';
  if (type === 'cond-expr') return i === 0 ? 'the first value of `? :`' : 'the second value of `? :`';
  if (type === 'binary-expr') return `part ${i + 1} of ${n} of \`&&\` / \`||\``;
  if (type === 'default-arg') return 'the default value';
  if (type === 'switch') return `case ${i + 1} of ${n}`;
  return `${type}, way ${i + 1} of ${n}`;
}

function branchReport(results, summary, detail) {
  const t = summary.total.branches;
  const lines = header('Branch Coverage Report', results);
  lines.push(
    'A branch is each way through an `if`, `switch`, `? :`, `&&` / `||` or default value. This report',
    'shows how many of them the tests took, per file, and lists the branches no test reached in the',
    'files below 80 %.',
    '',
    `**Branches covered: ${t.covered} of ${t.total} = ${pct(t.pct)}.**`,
    '',
    '## By file (lowest first)',
    '',
    '| File | Covered | Total | Branch coverage |',
    '|---|---|---|---|'
  );
  const files = Object.keys(summary).filter((k) => k !== 'total');
  files.sort((a, b) => summary[a].branches.pct - summary[b].branches.pct || a.localeCompare(b));
  for (const f of files) {
    const b = summary[f].branches;
    lines.push(`| \`${rel(f).replace('server/src/', '')}\` | ${b.covered} | ${b.total} | ${b.total ? pct(b.pct) : 'no branches'} |`);
  }
  lines.push('', '## Branches not reached (files below 80 %)', '');
  for (const f of files.filter((x) => summary[x].branches.total && summary[x].branches.pct < 80)) {
    const d = detail[f] || Object.values(detail).find((x) => path.resolve(x.path) === path.resolve(f));
    if (!d) continue;
    const missed = [];
    for (const [id, counts] of Object.entries(d.b)) {
      const m = d.branchMap[id];
      counts.forEach((c, i) => {
        if (c !== 0) return;
        // An `if` without `else` has no location for the missing else; use the if itself.
        const at = m.locations[i] && m.locations[i].start && m.locations[i].start.line ? m.locations[i] : m.loc;
        missed.push(`line ${at.start.line}: ${describeBranch(m.type, i, counts.length)}`);
      });
    }
    lines.push(`- \`${rel(f).replace('server/src/', '')}\`: ${missed.join('; ')}`);
  }
  lines.push('', 'Most unreached branches are error paths (database failures, malformed input from a client', 'that the UI never sends) and fallbacks for optional settings.');
  return lines;
}

function copyHtml() {
  const target = path.join(OUT, 'coverage');
  fs.rmSync(target, { recursive: true, force: true });
  // Only the HTML report: no raw data, and no copies left by other coverage reporters.
  const skip = (src) => /\.(json|info|xml)$/.test(src) || path.basename(src) === 'lcov-report';
  fs.cpSync(COVERAGE, target, { recursive: true, filter: (src) => !skip(src) });
}

function main() {
  let status = 0;
  if (!process.argv.includes('--no-run')) status = runTests();
  const results = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
  const summary = JSON.parse(fs.readFileSync(path.join(COVERAGE, 'coverage-summary.json'), 'utf8'));
  const detail = JSON.parse(fs.readFileSync(path.join(COVERAGE, 'coverage-final.json'), 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, lines) => {
    fs.writeFileSync(path.join(OUT, name), `${lines.join('\n')}\n`);
    console.log(`written docs/reports/${name}`);
  };
  write('UNIT_TEST_REPORT.md', unitReport(results));
  write('SYSTEM_VALIDATION_REPORT.md', systemReport(results));
  write('CODE_COVERAGE_REPORT.md', coverageReport(results, summary));
  write('BRANCH_COVERAGE_REPORT.md', branchReport(results, summary, detail));
  copyHtml();
  console.log('copied the HTML coverage report to docs/reports/coverage/');
  process.exit(status);
}

main();
