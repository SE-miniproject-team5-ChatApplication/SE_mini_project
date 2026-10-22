// users collection (SRS Appendix B.1)
const mongoose = require('mongoose');

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const userSchema = new mongoose.Schema(
  {
    // Stored in lower case so "Omkar" and "omkar" cannot both exist.
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, match: USERNAME_PATTERN },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
    // Only the bcrypt hash is stored, never the password (REQ-AUTH-3). Not returned by default.
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    statusMessage: { type: String, trim: true, maxlength: 100, default: '' },
    avatarPath: { type: String, default: null },
    lastSeen: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Shape that other users are allowed to see (data minimisation, NFR-SEC-7).
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    username: this.username,
    displayName: this.displayName,
    statusMessage: this.statusMessage,
    avatarUrl: this.avatarPath ? `/api/users/${this._id}/avatar` : null,
    lastSeen: this.lastSeen,
  };
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.failedLoginCount;
    delete ret.lockUntil;
    delete ret.avatarPath;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.USERNAME_PATTERN = USERNAME_PATTERN;
