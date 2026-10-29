// Polls until check() returns true - for fire-and-forget socket events whose
// effect is only visible in the database.
async function eventually(check, timeoutMs = 2000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return;
    if (Date.now() > end) throw new Error('condition not met in time');
    await new Promise((r) => setTimeout(r, 25));
  }
}

module.exports = { eventually };
