
// Notification Service (DD-NOT / C11).
// Module owner: Raksha Arun (SRS Appendix C).
// Owns per-conversation unread counters and notification mute preferences.
const { Member } = require('../models');
const { assertMember } = require('./membershipService');

// Add one unread message for every conversation member except the sender.
async function incrementUnreadCounts(conversationId, senderId) {
  return Member.updateMany(
    {
      conversationId,
      userId: { $ne: senderId },
    },
    {
      $inc: { unreadCount: 1 },
    }
  );
}

// Reset one member's unread counter when they open the conversation.
async function resetUnreadCount(userId, conversationId) {
  return Member.updateOne(
    {
      conversationId,
      userId,
    },
    {
      $set: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    }
  );
}

// Update notification preferences for a conversation member.
// Membership is checked before changing the preference.
async function setConversationMuted(userId, conversationId, muted) {
  if (typeof muted !== 'boolean') {
    throw new TypeError('muted must be a boolean');
  }

  const member = await assertMember(userId, conversationId);

  member.muted = muted;
  await member.save();

  return member;
}

module.exports = {
  incrementUnreadCounts,
  resetUnreadCount,
  setConversationMuted,
};
