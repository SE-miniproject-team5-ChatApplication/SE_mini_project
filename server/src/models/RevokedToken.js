// Tokens that were logged out before they expired (REQ-AUTH-6). MongoDB
// deletes each entry automatically once the token would have expired anyway.
const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
});

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
