// contacts collection: "userId has contactUserId in their contact list"
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contactUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A contact can be added only once (REQ-PRO-4).
contactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });
contactSchema.index({ contactUserId: 1 });

module.exports = mongoose.model('Contact', contactSchema);
