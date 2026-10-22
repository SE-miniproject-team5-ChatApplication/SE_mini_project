// conversations collection (SRS Appendix B.3). A conversation is either
// direct (exactly two members) or group (three or more) - DR-1.
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    name: { type: String, trim: true, minlength: 1, maxlength: 50 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // "smallerUserId:largerUserId" - guarantees one direct conversation per pair.
    directKey: { type: String },
    lastMessage: {
      messageId: { type: mongoose.Schema.Types.ObjectId },
      senderId: { type: mongoose.Schema.Types.ObjectId },
      preview: { type: String, maxlength: 120 },
      type: { type: String },
      sentAt: { type: Date },
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index(
  { directKey: 1 },
  { unique: true, partialFilterExpression: { directKey: { $type: 'string' } } }
);
conversationSchema.index({ lastMessageAt: -1 });

conversationSchema.statics.directKeyFor = (userA, userB) => [String(userA), String(userB)].sort().join(':');

module.exports = mongoose.model('Conversation', conversationSchema);
