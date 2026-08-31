const express = require('express');
const router = express.Router();
const {
  getCurrentTarget,
  setMonthTarget,
  getWorkersTargetSummary
} = require('../controllers/targetController');
const { protect, admin } = require('../middleware/authMiddleware');

// Get target & pacing for current user or queried worker
router.get('/current', protect, getCurrentTarget);

// Get target overview for all workers (Admin only)
router.get('/workers-summary', protect, admin, getWorkersTargetSummary);

// Set or update target for agency or worker (Admin only)
router.post('/', protect, admin, setMonthTarget);

module.exports = router;
