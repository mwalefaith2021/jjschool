const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function noCache(req, res, next) {
  // Prevent browsers and proxies from caching sensitive responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
}

async function requireAuth(req, res, next) {
  // Accept token from Authorization header (Bearer), x-access-token header or ?token query
  const header = req.headers.authorization || req.headers['x-access-token'] || '';
  const token = (header && header.split ? header.split(' ')[1] : header) || req.query.token;
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { noCache, requireAuth };
