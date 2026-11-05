// NFR-SEC-3: production traffic uses TLS (HTTPS for REST, WSS for sockets).
// When TLS_CERT_FILE and TLS_KEY_FILE are set the server speaks HTTPS, and
// Socket.IO automatically becomes WSS on the same port.
const fs = require('fs');
const http = require('http');
const https = require('https');
const logger = require('../utils/logger');

function createHttpServer(app, vars = process.env) {
  const certFile = vars.TLS_CERT_FILE;
  const keyFile = vars.TLS_KEY_FILE;
  if (certFile || keyFile) {
    if (!certFile || !keyFile) throw new Error('Set both TLS_CERT_FILE and TLS_KEY_FILE (or neither)');
    const options = {
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile),
      minVersion: 'TLSv1.2', // TC-SEC-03: TLS 1.2+ only
    };
    return { server: https.createServer(options, app), protocol: 'https' };
  }
  if (vars.NODE_ENV === 'production') {
    logger.warn('TLS is not configured: run behind an HTTPS proxy or set TLS_CERT_FILE / TLS_KEY_FILE (NFR-SEC-3)');
  }
  return { server: http.createServer(app), protocol: 'http' };
}

module.exports = { createHttpServer };
