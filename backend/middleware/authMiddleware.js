const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pepsi_super_secret_jwt_key_2026');
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user || !req.user.active) {
        return res.status(401).json({ message: 'Your account has been blocked. Please contact admin.' });
      }

      return next();
    } catch (error) {
      console.error('JWT Auth Error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Your 30-minute session has expired for security. Please sign in again.',
          expired: true
        });
      }
      return res.status(401).json({ message: 'Authentication failed. Invalid token.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No session token provided.' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin privileges required.' });
  }
};

module.exports = { protect, admin };
