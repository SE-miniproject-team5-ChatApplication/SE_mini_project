// members collection: one document per (conversation, user) with the role
// (admin/member), join time and per-user unread/mute state.
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0, min: 0 },
  muted: { type: Boolean, default: false },
  lastReadAt: { type: Date, default: null },
});

memberSchema.index({ userId: 1, conversationId: 1 }, { unique: true });
memberSchema.index({ conversationId: 1, joinedAt: 1 });

module.exports = mongoose.model('Member', memberSchema);
