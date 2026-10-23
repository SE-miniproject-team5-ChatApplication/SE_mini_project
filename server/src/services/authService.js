// Auth business logic (DD-AUTH). Routes call these; no Express code here.
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const { Errors } = require('../utils/errors');

// REQ-AUTH-1 rules
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/; // bcrypt ignores bytes past 72

function validateRegistration({ username, email, password } = {}) {
  // typeof checks also stop objects like {"$gt": ""} (NoSQL injection, NFR-SEC-5)
  if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
    throw Errors.validation('Username must be 3-20 letters, digits or underscores', 'username');
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw Errors.validation('Enter a valid email address', 'email');
  }
  if (typeof password !== 'string' || !PASSWORD_RE.test(password)) {
    throw Errors.validation('Password must be at least 8 characters with a letter and a digit', 'password');
  }
}

// REQ-AUTH-2: field-specific duplicate errors
async function ensureUnique(username, email) {
  if (await User.exists({ username: username.toLowerCase() })) {
    throw Errors.conflict('Username is already taken', 'username');
  }
  if (await User.exists({ email: email.toLowerCase() })) {
    throw Errors.conflict('Email is already registered', 'email');
  }
}

// REQ-AUTH-1, 2, 3
async function register(body) {
  validateRegistration(body);
  const username = body.username.trim();
  const email = body.email.trim();
  await ensureUnique(username, email);

  // REQ-AUTH-3: salted bcrypt hash, cost from config (>= 10, NFR-SEC-2)
  const passwordHash = await bcrypt.hash(body.password, config.bcryptRounds);

  try {
    const user = await User.create({ username, email, passwordHash, displayName: username });
    return { userId: user._id.toString(), username: user.username };
  } catch (err) {
    // Two people registering the same name at the same moment
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'username';
      throw Errors.conflict(`That ${field} is already in use`, field);
    }
    throw err;
  }
}

module.exports = { register, validateRegistration, PASSWORD_RE };