// Starts the real app on a random port so tests can use HTTP (Supertest)
// and WebSockets (socket.io-client) against it.
const http = require('http');
const { createApp } = require('../../src/app');
const { attachSockets } = require('../../src/sockets');

async function startTestServer() {
  const app = createApp();
  const server = http.createServer(app);
  const io = attachSockets(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const close = async () => {
    io.close();
    await new Promise((resolve) => server.close(() => resolve()));
  };
  return { app, server, io, url, close };
}

module.exports = { startTestServer };
