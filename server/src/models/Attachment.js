// attachments collection (SRS Appendix B.4)
const mongoose = require('mongoose');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (REQ-FIL-1)

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, maxlength: 255 }, // original name, shown to users only
    mimeType: { type: String, required: true, maxlength: 100 },
    size: { type: Number, required: true, min: 1, max: MAX_FILE_SIZE },
    storagePath: { type: String, required: true, maxlength: 255 }, // random server-side name (REQ-FIL-5)
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

attachmentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.url = `/api/files/${ret.id}`;
    delete ret._id;
    delete ret.__v;
    delete ret.storagePath; // never expose the storage name
    return ret;
  },
});

module.exports = mongoose.model('Attachment', attachmentSchema);
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
