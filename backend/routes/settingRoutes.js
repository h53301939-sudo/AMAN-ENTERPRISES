const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, resetProductionData } = require('../controllers/settingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/reset-production', protect, admin, resetProductionData);
router.get('/', protect, getSettings);
router.put('/', protect, admin, updateSettings);

module.exports = router;
