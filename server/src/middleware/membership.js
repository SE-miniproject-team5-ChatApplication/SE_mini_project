// Route guard: the logged-in user must be a member of the conversation in
// req.params[paramName]; otherwise 403 (NFR-SEC-4, REQ-GRP-5, REQ-HIS-4, REQ-FIL-4).
const { assertMember } = require('../services/membershipService');

function requireMembership(paramName = 'id') {
  return async (req, _res, next) => {
    try {
      req.membership = await assertMember(req.userId, req.params[paramName]);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireMembership };
