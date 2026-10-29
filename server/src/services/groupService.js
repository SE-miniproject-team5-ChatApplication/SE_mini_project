// Group Service (component C8).
const { Conversation, Member, User, Contact } = require('../models');
const { Errors } = require('../utils/errors');
const { isValidId, assertId } = require('../utils/ids');
const { joinConversation, emitToUser } = require('../utils/realtime');

const MAX_MEMBERS = 100; // REQ-GRP-1 / BR-6
const MIN_OTHER_MEMBERS = 2;

function validateName(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  if (value.length < 1 || value.length > 50) throw Errors.validation('Group name must be 1-50 characters', 'name');
  return value;
}

// Group details with members and their roles (for the Group info screen).
async function groupView(conversationId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') throw Errors.notFound('Group not found');
  const members = await Member.find({ conversationId }).sort({ joinedAt: 1, _id: 1 }).lean();
  const users = await User.find({ _id: { $in: members.map((m) => m.userId) } });
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return {
    id: String(conversation._id),
    type: 'group',
    name: conversation.name,
    createdBy: String(conversation.createdBy),
    members: members.map((m) => ({
      userId: String(m.userId),
      role: m.role,
      joinedAt: m.joinedAt,
      user: byId.get(String(m.userId)) ? byId.get(String(m.userId)).toPublic() : null,
    })),
  };
}

// Sends group:update to every current member (and any extra users, e.g. one just removed).
async function notifyGroup(conversationId, change, extraUserIds = []) {
  const view = await groupView(conversationId);
  const targets = new Set([...view.members.map((m) => m.userId), ...extraUserIds.map(String)]);
  targets.forEach((id) => emitToUser(id, 'group:update', { groupId: view.id, type: change, group: view }));
  return view;
}

// REQ-GRP-1: name 1-50 characters, at least two other members chosen from the
// creator's contacts, at most 100 members. The creator becomes admin (REQ-GRP-2).
async function createGroup(creatorId, { name, memberIds } = {}) {
  const groupName = validateName(name);
  if (!Array.isArray(memberIds) || !memberIds.every(isValidId)) {
    throw Errors.validation('Choose the members from your contacts', 'memberIds');
  }
  const others = [...new Set(memberIds.map(String))].filter((id) => id !== String(creatorId));
  if (others.length < MIN_OTHER_MEMBERS) throw Errors.validation('A group needs at least two other members', 'memberIds');
  if (others.length + 1 > MAX_MEMBERS) throw Errors.validation(`A group can have at most ${MAX_MEMBERS} members`, 'memberIds');

  const contacts = await Contact.find({ userId: creatorId, contactUserId: { $in: others } }).distinct('contactUserId');
  if (contacts.length !== others.length) throw Errors.notFound('Every member must be one of your contacts');

  const conversation = await Conversation.create({ type: 'group', name: groupName, createdBy: creatorId });
  const now = Date.now();
  await Member.create([
    { conversationId: conversation._id, userId: creatorId, role: 'admin', joinedAt: new Date(now) },
    ...others.map((userId, i) => ({ conversationId: conversation._id, userId, role: 'member', joinedAt: new Date(now + i + 1) })),
  ]);
  [String(creatorId), ...others].forEach((id) => joinConversation(id, conversation._id));
  return notifyGroup(conversation._id, 'created');
}

async function getGroup(conversationId) {
  assertId(conversationId, 'groupId');
  return groupView(conversationId);
}

module.exports = { createGroup, getGroup, groupView, notifyGroup, validateName, MAX_MEMBERS };
