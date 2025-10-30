// Tokens removed: no JWT or user lookup required here

function noCache(req, res, next) {
  // Prevent browsers and proxies from caching sensitive responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
}

async function requireAuth(req, res, next) {
  // No-op: authentication disabled (no tokens). All requests pass through.
  return next();
}

module.exports = { noCache, requireAuth };
