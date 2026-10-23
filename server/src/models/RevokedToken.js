// Logged-out tokens (REQ-AUTH-6). A token id (jti) listed here is rejected
// until the token would have expired anyway; MongoDB then deletes the row itself.
const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
});

// TTL index: MongoDB removes each row once expiresAt has passed
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);