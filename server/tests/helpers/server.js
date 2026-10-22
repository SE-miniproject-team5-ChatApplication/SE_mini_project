// Starts the real app on a random port so tests can use HTTP (Supertest)
// and WebSockets (socket.io-client) against it.
const http = require('http');
const { createApp } = require('../../src/app');

async function startTestServer() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((resolve) => server.close(resolve));
  return { app, server, url, close };
}

module.exports = { startTestServer };
