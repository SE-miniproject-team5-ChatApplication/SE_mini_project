// Creates users directly in the database for tests and returns a valid token.
const { User } = require('../../src/models');
const { signToken } = require('../../src/utils/jwt');
const { hashPassword } = require('../../src/services/authService');

let counter = 0;

async function createUser(overrides = {}) {
  counter += 1;
  const username = overrides.username || `user${String(counter).padStart(2, '0')}_${Date.now() % 100000}`;
  const user = await User.create({
    username,
    email: overrides.email || `${username}@test.com`,
    // Pass { password } when the test needs to log in with it (hashing is slow).
    passwordHash: overrides.password ? await hashPassword(overrides.password) : 'not-a-real-hash',
    displayName: overrides.displayName || username,
  });
  const { token, jti } = signToken(user);
  return { user, token, jti, id: String(user._id) };
}

module.exports = { createUser };
