// In-process events between services, e.g. "message:created" is published by
// the messaging service and consumed by the notification service. This keeps
// modules owned by different members independent of each other.
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(50);

module.exports = bus;
