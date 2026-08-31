const express = require('express');
const router = express.Router();
const { getWarehouseStock, adjustStock } = require('../controllers/warehouseController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stock', protect, getWarehouseStock);
router.post('/adjust', protect, admin, adjustStock);

module.exports = router;
