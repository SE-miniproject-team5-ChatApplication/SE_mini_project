// Direct (one-to-one) conversations. Group conversations live in groupService.
const { Conversation, Member, User } = require('../models');
const { Errors } = require('../utils/errors');
const { assertId } = require('../utils/ids');
const { isContact } = require('./userService');
const { joinConversation } = require('../utils/realtime');

// What the client needs to show a direct conversation for one user.
function directView(conversation, otherUser) {
  return {
    id: String(conversation._id),
    type: 'direct',
    name: otherUser ? otherUser.displayName : 'Deleted user',
    otherUser: otherUser ? otherUser.toPublic() : null,
  };
}

// BR-2: a user may start a one-to-one conversation only with a contact.
// Returns the existing conversation if the pair already has one.
async function getOrCreateDirect(userId, otherUserId) {
  assertId(otherUserId, 'userId');
  if (String(userId) === otherUserId) throw Errors.validation('You cannot chat with yourself', 'userId');
  const other = await User.findById(otherUserId);
  if (!other) throw Errors.notFound('User not found');
  if (!(await isContact(userId, otherUserId))) throw Errors.forbidden('Add this user to your contacts first');

  const directKey = Conversation.directKeyFor(userId, otherUserId);
  let conversation = await Conversation.findOne({ directKey });
  if (!conversation) {
    try {
      conversation = await Conversation.create({ type: 'direct', createdBy: userId, directKey });
      await Member.create([
        { conversationId: conversation._id, userId },
        { conversationId: conversation._id, userId: otherUserId },
      ]);
    } catch (err) {
      if (err.code !== 11000) throw err;
      conversation = await Conversation.findOne({ directKey }); // created at the same moment by the other user
    }
  }
  // Both users' open sockets start listening to this conversation.
  joinConversation(userId, conversation._id);
  joinConversation(otherUserId, conversation._id);
  return directView(conversation, other);
}

module.exports = { getOrCreateDirect, directView };
