const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '8h' });

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.auth = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ message: 'Unauthorized' }); }
}

function optionalAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token) {
    try { req.auth = jwt.verify(token, SECRET); } catch (e) { /* ignore expired or invalid */ }
  }
  next();
}

const requireRole = (role) => (req, res, next) =>
  req.auth && req.auth.role === role ? next() : res.status(403).json({ message: 'Forbidden' });

module.exports = { signToken, requireAuth, optionalAuth, requireRole };
