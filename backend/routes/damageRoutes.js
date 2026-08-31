const express = require('express');
const router = express.Router();
const { recordDamage, getDamages } = require('../controllers/damageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, recordDamage);
router.get('/', protect, getDamages);

module.exports = router;
