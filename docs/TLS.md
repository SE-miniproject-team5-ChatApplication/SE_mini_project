# HTTPS and WSS (NFR-SEC-3)

In development plain HTTP/WS on localhost is allowed (SRS 3.3). For the demo /
production run, give the server a certificate; REST becomes HTTPS and the
WebSocket becomes WSS automatically (same port).

## 1. Create a certificate

**Easiest - mkcert (trusted by your browser, no warnings):**

```bash
# install: https://github.com/FiloSottile/mkcert  (Windows: choco install mkcert, macOS: brew install mkcert)
mkcert -install
mkcert -key-file server/certs/key.pem -cert-file server/certs/cert.pem localhost 127.0.0.1
```

**Or OpenSSL (self-signed; the browser shows a warning you must accept once):**

```bash
mkdir -p server/certs
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=localhost" \
  -keyout server/certs/key.pem -out server/certs/cert.pem
```

`server/certs/` must not be committed - add it to `.gitignore` if you create it.

## 2. Configure and run

In `server/.env`:

```
TLS_CERT_FILE=./certs/cert.pem
TLS_KEY_FILE=./certs/key.pem
CLIENT_ORIGIN=https://localhost:5000
```

```bash
npm run build
NODE_ENV=production npm start --prefix server     # https://localhost:5000
```

The server accepts TLS 1.2 and newer only. Helmet sends `Strict-Transport-Security`.

## 3. Check it (TC-SEC-03)

- Browser: padlock icon; DevTools → Network → the `socket.io` request shows `wss://`.
- `testssl.sh https://localhost:5000` (or `docker run --rm -ti drwetter/testssl.sh https://host.docker.internal:5000`):
  no SSLv3 / TLS 1.0 / TLS 1.1 offered.
- MongoDB Atlas connections are always TLS-encrypted.
