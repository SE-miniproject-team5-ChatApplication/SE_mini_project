// Gives REST routes and services access to the Socket.IO server without a
// circular import. Room names:  user:<userId>  and  conv:<conversationId>.
let io = null;

function setIO(server) {
  io = server;
}

function getIO() {
  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function emitToConversation(conversationId, event, payload) {
  if (io) io.to(`conv:${conversationId}`).emit(event, payload);
}

// Makes every open tab of a user join / leave a conversation room.
function joinConversation(userId, conversationId) {
  if (io) io.in(`user:${userId}`).socketsJoin(`conv:${conversationId}`);
}

function leaveConversation(userId, conversationId) {
  if (io) io.in(`user:${userId}`).socketsLeave(`conv:${conversationId}`);
}

module.exports = { setIO, getIO, emitToUser, emitToConversation, joinConversation, leaveConversation };
