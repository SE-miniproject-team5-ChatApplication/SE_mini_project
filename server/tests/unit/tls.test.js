const http = require('http');
const { createHttpServer } = require('../../src/config/tls');

describe('NFR-SEC-3 TLS configuration', () => {
  test('TC-SEC-03 plain HTTP is used only when no certificate is configured', () => {
    const { server, protocol } = createHttpServer(() => {}, {});
    expect(protocol).toBe('http');
    expect(server).toBeInstanceOf(http.Server);
  });

  test('half a TLS configuration is refused instead of silently using HTTP', () => {
    expect(() => createHttpServer(() => {}, { TLS_CERT_FILE: 'cert.pem' })).toThrow(/TLS_KEY_FILE/);
  });
});
