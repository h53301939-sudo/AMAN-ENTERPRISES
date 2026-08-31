const express = require('express');
const router = express.Router();
const { createSale, getSales, getSaleById, getSalePdfById } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createSale);
router.get('/', protect, getSales);
router.get('/:id/pdf', getSalePdfById); // Public/Stream PDF Invoice link
router.get('/:id', protect, getSaleById);

module.exports = router;
