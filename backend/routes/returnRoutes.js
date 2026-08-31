const express = require('express');
const router = express.Router();
const { processReturn, getReturns } = require('../controllers/returnController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, processReturn);
router.get('/', protect, getReturns);

module.exports = router;
