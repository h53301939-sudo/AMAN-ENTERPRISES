const express = require('express');
const router = express.Router();
const {
  loginUser,
  getMe,
  getWorkers,
  getWorkerProfile,
  toggleWorkerStatus,
  createWorker,
  updateWorker,
  deleteWorker
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');

// Rate-limited login route to prevent brute-force attacks
router.post('/login', loginRateLimiter, loginUser);

router.get('/me', protect, getMe);
router.get('/workers', protect, admin, getWorkers);
router.get('/workers/:id/profile', protect, getWorkerProfile);
router.put('/workers/:id/toggle-status', protect, admin, toggleWorkerStatus);
router.post('/workers', protect, admin, createWorker);
router.put('/workers/:id', protect, admin, updateWorker);
router.delete('/workers/:id', protect, admin, deleteWorker);

module.exports = router;
