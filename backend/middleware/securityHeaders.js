// Security HTTP Headers to protect against XSS, Clickjacking, MIME sniffing & injection attacks
const securityHeaders = (req, res, next) => {
  // Prevent website from being embedded inside iframe (Clickjacking protection)
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing (forces browser to adhere to declared content-type)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Cross-Site Scripting (XSS) Filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove Express footprint header
  res.removeHeader('X-Powered-By');

  next();
};

module.exports = { securityHeaders };
