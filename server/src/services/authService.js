// Auth Service (component C4).
const bcrypt = require('bcryptjs');
const config = require('../config');
const { User, RevokedToken } = require('../models');
const { getIO } = require('../utils/realtime');
const { Errors } = require('../utils/errors');
const { signToken } = require('../utils/jwt');

const USERNAME_RULE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// REQ-AUTH-3: passwords are stored only as salted bcrypt hashes, cost >= 10.
// bcrypt generates a new random salt for every hash.
async function hashPassword(password) {
  return bcrypt.hash(password, config.bcryptRounds);
}

async function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') return false;
  return bcrypt.compare(password, passwordHash);
}

// REQ-AUTH-1 password rule, reused by REQ-PRO-5 (change password).
function validatePassword(password, field = 'password') {
  if (typeof password !== 'string' || password.length < 8 || password.length > 64) {
    throw Errors.validation('Password must be 8-64 characters long', field);
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw Errors.validation('Password must contain at least one letter and one digit', field);
  }
}

// REQ-AUTH-1: unique username (3-20 letters, digits, underscore), valid email,
// password of at least 8 characters with a letter and a digit.
function validateRegistration({ username, email, password }) {
  if (typeof username !== 'string' || !USERNAME_RULE.test(username)) {
    throw Errors.validation('Username must be 3-20 characters: letters, digits or underscore', 'username');
  }
  if (typeof email !== 'string' || email.length > 100 || !EMAIL_RULE.test(email.trim())) {
    throw Errors.validation('Enter a valid email address', 'email');
  }
  validatePassword(password);
}

// REQ-AUTH-2: a username or email that already exists is rejected with a
// message for that specific field.
async function assertNotTaken(username, email) {
  if (await User.exists({ username: username.toLowerCase() })) {
    throw Errors.conflict('This username is already taken', 'username');
  }
  if (await User.exists({ email: email.trim().toLowerCase() })) {
    throw Errors.conflict('An account with this email already exists', 'email');
  }
}

async function register({ username, email, password }) {
  validateRegistration({ username, email, password });
  await assertNotTaken(username, email);
  try {
    return await User.create({
      username,
      email: email.trim(),
      passwordHash: await hashPassword(password),
      displayName: username,
    });
  } catch (err) {
    // Two people registering the same name at the same moment: the unique index decides.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] === 'email' ? 'email' : 'username';
      throw Errors.conflict(field === 'email' ? 'An account with this email already exists' : 'This username is already taken', field);
    }
    throw err;
  }
}

// What the logged-in user sees about themselves.
function selfView(user) {
  return { ...user.toPublic(), email: user.email };
}

function findByIdentifier(identifier) {
  const value = identifier.trim().toLowerCase();
  const query = value.includes('@') ? { email: value } : { username: value };
  return User.findOne(query).select('+passwordHash');
}

// REQ-AUTH-4: log in with email or username + password; issue a JWT valid for 24 h.
async function login({ identifier, password }) {
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) {
    throw Errors.validation('Enter your username or email and your password');
  }
  const user = await findByIdentifier(identifier);
  // Same generic error whether the user exists or not (does not reveal accounts).
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw Errors.invalidCredentials();
  }
  user.lastLoginAt = new Date();
  await user.save();
  const { token, expiresIn } = signToken(user);
  return { token, expiresIn, user: selfView(user) };
}

// REQ-AUTH-6: logout revokes this session's token and closes the WebSocket
// connections that were opened with it. The client also discards the token.
async function logout(userId, { jti, exp }) {
  if (jti) {
    await RevokedToken.updateOne(
      { jti },
      { $setOnInsert: { jti, userId, expiresAt: new Date(exp * 1000) } },
      { upsert: true }
    );
  }
  const io = getIO();
  if (io) {
    const sockets = await io.in(`user:${userId}`).fetchSockets();
    sockets.filter((s) => s.data.jti === jti).forEach((s) => s.disconnect(true));
  }
}

async function isRevoked(jti) {
  if (!jti) return false;
  return Boolean(await RevokedToken.exists({ jti }));
}

module.exports = {
  logout,
  isRevoked,
  hashPassword,
  verifyPassword,
  validatePassword,
  validateRegistration,
  register,
  login,
  selfView,
};
