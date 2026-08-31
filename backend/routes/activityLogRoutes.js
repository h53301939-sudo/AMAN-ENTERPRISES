const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityLogController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getActivityLogs);

module.exports = router;
