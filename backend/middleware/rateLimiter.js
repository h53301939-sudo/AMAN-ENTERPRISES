// In-memory Rate Limiter to prevent Brute-Force Password attacks & Hacker bots
const loginAttempts = new Map(); // IP -> { count, lockedUntil }

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 Minutes Lockout

const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = loginAttempts.get(ip);

  if (record) {
    // If IP is currently locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingMins = Math.ceil((record.lockedUntil - now) / 60000);
      return res.status(429).json({
        message: `Account protection active: Too many failed login attempts. Please try again after ${remainingMins} minutes.`,
        locked: true,
        remainingMinutes: remainingMins
      });
    }

    // Reset lockout if time has passed
    if (record.lockedUntil && now >= record.lockedUntil) {
      loginAttempts.delete(ip);
    }
  }

  // Helper attached to res to record failed or successful attempts
  res.recordFailedAttempt = () => {
    const current = loginAttempts.get(ip) || { count: 0, lockedUntil: null };
    current.count += 1;

    if (current.count >= MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_TIME_MS;
      console.warn(`🚨 SECURITY ALERT: IP ${ip} locked out after ${current.count} failed login attempts!`);
    }

    loginAttempts.set(ip, current);
  };

  res.recordSuccessfulLogin = () => {
    loginAttempts.delete(ip);
  };

  next();
};

module.exports = { loginRateLimiter };
