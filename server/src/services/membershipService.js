// NFR-SEC-4: server-side authorisation per conversation. Every conversation,
// history, search, file and socket operation asks this module first
// ("deny by default": only current members get through).
const { Member, Conversation } = require('../models');
const { Errors } = require('../utils/errors');
const { assertId } = require('../utils/ids');

async function getMembership(userId, conversationId) {
  return Member.findOne({ userId, conversationId });
}

async function isMember(userId, conversationId) {
  return Boolean(await Member.exists({ userId, conversationId }));
}

// Returns the Member document or throws 400 / 404 / 403.
async function assertMember(userId, conversationId) {
  assertId(conversationId, 'conversationId');
  const member = await getMembership(userId, conversationId);
  if (member) return member;
  if (!(await Conversation.exists({ _id: conversationId }))) throw Errors.notFound('Conversation not found');
  throw Errors.forbidden('You are not a member of this conversation');
}

async function memberUserIds(conversationId) {
  const ids = await Member.find({ conversationId }).distinct('userId');
  return ids.map(String);
}

async function conversationIdsOf(userId) {
  const ids = await Member.find({ userId }).distinct('conversationId');
  return ids;
}

module.exports = { getMembership, isMember, assertMember, memberUserIds, conversationIdsOf };
