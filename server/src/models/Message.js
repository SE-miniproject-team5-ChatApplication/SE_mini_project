// messages collection (SRS Appendix B.2)
const mongoose = require('mongoose');

const MAX_CONTENT_LENGTH = 2000;
const STATUSES = ['sent', 'delivered', 'read', 'deleted'];

const receiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  // null for system messages ("Raksha added Omkar")
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
  content: { type: String, default: '', maxlength: MAX_CONTENT_LENGTH },
  attachmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attachment', default: null },
  // Id created by the sender's browser; used to drop duplicates on resend (REQ-MSG-7).
  clientMsgId: { type: String, maxlength: 64 },
  // Server timestamp - messages are ordered by this (REQ-MSG-5).
  sentAt: { type: Date, default: Date.now, required: true },
  status: { type: String, enum: STATUSES, default: 'sent' },
  deliveredTo: { type: [receiptSchema], default: [] },
  readBy: { type: [receiptSchema], default: [] },
  deletedAt: { type: Date, default: null },
});

messageSchema.index({ conversationId: 1, sentAt: 1, _id: 1 });
messageSchema.index({ content: 'text' });
messageSchema.index(
  { senderId: 1, clientMsgId: 1 },
  { unique: true, partialFilterExpression: { clientMsgId: { $type: 'string' } } }
);

messageSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    // A deleted message keeps its record for audit (BR-4) but its content is hidden.
    if (ret.status === 'deleted') ret.content = null;
    return ret;
  },
});

module.exports = mongoose.model('Message', messageSchema);
module.exports.MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH;
module.exports.STATUSES = STATUSES;
