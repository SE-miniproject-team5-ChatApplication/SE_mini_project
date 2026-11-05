/* eslint-disable no-console */
// TC-SEC-03 / NFR-SEC-3: checks a server that runs with a certificate (docs/TLS.md).
// TLS 1.0 and 1.1 must be refused and 1.2 / 1.3 accepted, REST must work over HTTPS
// with the security headers, plain HTTP must get no answer, and the WebSocket must
// connect over wss://. It registers one user named tls_<number> in the server's database.
// Usage (server running with TLS_CERT_FILE / TLS_KEY_FILE):  npm run tls:check --prefix server -- [port]
const tls = require('tls');
const https = require('https');
const net = require('net');
const { io } = require('socket.io-client');

const PORT = Number(process.argv[2] || process.env.PORT || 5000);
const results = [];
const check = (name, ok, extra = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
};

function probe(version) {
  return new Promise((resolve) => {
    const s = tls.connect({ host: 'localhost', port: PORT, minVersion: version, maxVersion: version, rejectUnauthorized: false, ciphers: 'DEFAULT@SECLEVEL=0' }, () => {
      const v = s.getProtocol();
      s.end();
      resolve({ ok: true, detail: v });
    });
    s.on('error', (e) => resolve({ ok: false, detail: e.code || e.message }));
  });
}

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({ host: 'localhost', port: PORT, method, path, rejectUnauthorized: false,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function plainHttp() {
  return new Promise((resolve) => {
    const s = net.connect(PORT, 'localhost', () => s.write('GET /api/health HTTP/1.1\r\nHost: localhost\r\n\r\n'));
    let text = '';
    s.on('data', (c) => (text += c.toString('latin1')));
    s.on('close', () => resolve(text));
    s.on('error', () => resolve(text));
    setTimeout(() => s.destroy(), 3000);
  });
}

async function main() {
  for (const v of ['TLSv1', 'TLSv1.1']) {
    const r = await probe(v);
    check(`${v} is refused by the server`, !r.ok, r.detail);
  }
  for (const v of ['TLSv1.2', 'TLSv1.3']) {
    const r = await probe(v);
    check(`${v} is accepted`, r.ok && r.detail === v, r.detail);
  }

  const health = await request('GET', '/api/health');
  check('REST over HTTPS works (/api/health)', health.status === 200 && health.body.status === 'ok', `HTTP ${health.status}`);
  const h = health.headers;
  check('Strict-Transport-Security header', /max-age=\d+/.test(h['strict-transport-security'] || ''), h['strict-transport-security']);
  check('X-Content-Type-Options: nosniff', h['x-content-type-options'] === 'nosniff');
  check('Content-Security-Policy header', Boolean(h['content-security-policy']));
  check('X-Frame-Options header', Boolean(h['x-frame-options']), h['x-frame-options']);
  check('no X-Powered-By header', !h['x-powered-by']);

  const plain = await plainHttp();
  check('plain HTTP on the TLS port gets no API answer', !/"status":"ok"/.test(plain), plain ? plain.split('\r\n')[0] : 'connection closed');

  const name = `tls_${Date.now() % 100000}`;
  const reg = await request('POST', '/api/auth/register', { username: name, email: `${name}@test.com`, password: 'Chat1234' });
  const login = await request('POST', '/api/auth/login', { identifier: name, password: 'Chat1234' });
  check('register and login over HTTPS', reg.status === 201 && login.status === 200, `${reg.status} / ${login.status}`);
  const fields = Object.keys(login.body.user).sort();
  check('login returns no password or hash', !fields.some((f) => /password|hash/i.test(f)), fields.join(', '));

  const socket = io(`https://localhost:${PORT}`, { auth: { token: login.body.token }, transports: ['websocket'], rejectUnauthorized: false, reconnection: false });
  const ready = await new Promise((resolve) => {
    socket.once('session:ready', () => resolve(true));
    socket.once('connect_error', (e) => resolve(e.message));
    setTimeout(() => resolve('timeout'), 5000);
  });
  const url = socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.ws && socket.io.engine.transport.ws.url;
  check('WebSocket over TLS (wss://) connects and authenticates', ready === true && /^wss:/.test(url || ''), url || String(ready));
  socket.close();

  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
}

main().catch((e) => {
  console.log('ERROR', e.message);
  process.exit(1);
});
