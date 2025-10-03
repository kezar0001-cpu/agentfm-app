// Authentication and authorisation helpers.  In a real application
// these would verify JWTs or session tokens to populate req.user.
// For the MVP scaffold we simply assume the user is authenticated and
// has been attached to req.user elsewhere.  If req.user is absent,
// requests are rejected.

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  return next();
}

/**
 * Require that the authenticated user has one of the given roles.  The
 * role list is compared against req.user.role.  If no match, a 403 is
 * returned.  Use this to protect endpoints from unauthorised access.
 * @param {string[]} roles
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };