const http = require('http');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { protectSocket } = require('../../src/utils/safeSocket');

describe('NFR-SAFE-4 a failing socket handler does not crash the server', () => {
  let server;
  let io;
  let client;

  beforeAll(async () => {
    server = http.createServer();
    io = new Server(server);
    io.on('connection', (socket) => {
      protectSocket(socket);
      socket.on('boom', () => {
        throw new Error('sync failure');
      });
      socket.on('boomAsync', async () => {
        throw new Error('async failure');
      });
      socket.on('echo', (text, ack) => ack(text));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    client = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    await new Promise((resolve) => client.once('connect', resolve));
  });

  afterAll(async () => {
    client.close();
    io.close();
    await new Promise((resolve) => server.close(() => resolve()));
  });

  test('TC-SAFE-04 a thrown error is reported to that client as error:event', async () => {
    const reported = new Promise((resolve) => client.once('error:event', resolve));
    client.emit('boom');
    const err = await reported;
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.event).toBe('boom');
    expect(err.message).not.toMatch(/sync failure/);
  });

  test('TC-SAFE-04 a rejected async handler answers the ack with ok:false', async () => {
    const ack = await client.timeout(2000).emitWithAck('boomAsync', {});
    expect(ack.ok).toBe(false);
    expect(ack.error.code).toBe('INTERNAL_ERROR');
  });

  test('TC-SAFE-04 the connection and server keep working after failures', async () => {
    client.emit('boom');
    await client.timeout(2000).emitWithAck('boomAsync', {});
    expect(await client.timeout(2000).emitWithAck('echo', 'still alive')).toBe('still alive');
    expect(client.connected).toBe(true);
  });
});
