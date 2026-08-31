const ActivityLog = require('../models/ActivityLog');

// @desc    Get system activity audit logs
// @route   GET /api/activity-logs
const getActivityLogs = async (req, res) => {
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
  res.json(logs);
};

module.exports = { getActivityLogs };
