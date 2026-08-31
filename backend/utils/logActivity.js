const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ req, user, action, details }) => {
  try {
    const userId = user ? user._id : (req && req.user ? req.user._id : null);
    const userName = user ? user.name : (req && req.user ? req.user.name : 'System');
    const userRole = user ? user.role : (req && req.user ? req.user.role : 'system');
    
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const device = req ? (req.headers['user-agent'] || 'Web Browser') : 'Server';

    await ActivityLog.create({
      user: userId,
      userName,
      userRole,
      action,
      details,
      ipAddress,
      device
    });
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};

module.exports = { logActivity };
