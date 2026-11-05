const { summarise, TARGET } = require('../../scripts/uptime-monitor');
const { nextDelay, STABLE_MS, MAX_DELAY_MS } = require('../../scripts/supervise');

const checks = (pattern) => [...pattern].map((c) => ({ up: c === 'u', ms: 10 }));

describe('NFR-QA-3 availability monitor', () => {
  test('one failed check in 100 is exactly the 99 % target', () => {
    const s = summarise(checks(`d${'u'.repeat(99)}`), 10);
    expect(s.availability).toBe(TARGET);
    expect(s.pass).toBe(true);
  });

  test('two failed checks in 100 miss the target', () => {
    expect(summarise(checks(`dd${'u'.repeat(98)}`), 10).pass).toBe(false);
  });

  test('the longest outage is the longest run of failed checks', () => {
    expect(summarise(checks('uduuddduu'), 10).longestOutageS).toBe(30);
  });

  test('no checks is not a pass', () => {
    expect(summarise([], 10).pass).toBe(false);
  });
});

describe('NFR-QA-3 server supervisor', () => {
  test('waits 1 s, then doubles while the server keeps failing, up to the maximum', () => {
    let delay = 0;
    const seen = [];
    for (let i = 0; i < 8; i += 1) {
      delay = nextDelay(delay, 100);
      seen.push(delay);
    }
    expect(seen).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
    expect(Math.max(...seen)).toBe(MAX_DELAY_MS);
  });

  test('a run that lasted long enough starts again after 1 s', () => {
    expect(nextDelay(30000, STABLE_MS)).toBe(1000);
  });
});
