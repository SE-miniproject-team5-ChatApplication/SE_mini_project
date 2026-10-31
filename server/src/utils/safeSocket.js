// NFR-SAFE-4: wraps every listener added with socket.on, so an error thrown (or a
// rejected promise) inside one event handler is logged and reported to that client
// only. It can never become an uncaught error that stops the server.
const logger = require('./logger');
const { AppError, toErrorBody } = require('./errors');

function guardListener(socket, event, listener) {
  return function guarded(...args) {
    const report = (err) => {
      if (!(err instanceof AppError)) {
        logger.error({ err, event, userId: socket.data && socket.data.userId }, 'socket handler failed');
      }
      const { error } = toErrorBody(err);
      socket.emit('error:event', { ...error, event });
      const ack = args[args.length - 1];
      if (typeof ack === 'function') ack({ ok: false, error });
    };
    try {
      const result = listener.apply(this, args);
      if (result && typeof result.then === 'function') result.catch(report);
      return result;
    } catch (err) {
      report(err);
      return undefined;
    }
  };
}

// Call once per socket, before any handler adds listeners.
function protectSocket(socket) {
  const originalOn = socket.on.bind(socket);
  socket.on = (event, listener) => originalOn(event, guardListener(socket, event, listener));
  return socket;
}

module.exports = { protectSocket, guardListener };
