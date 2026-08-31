const express = require('express');
const router = express.Router();
const { loadStockToVehicle, getLoadingHistory } = require('../controllers/loadingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, loadStockToVehicle);
router.get('/history', protect, getLoadingHistory);

module.exports = router;
