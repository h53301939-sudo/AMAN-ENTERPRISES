const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase } = require('../controllers/purchaseController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getPurchases);
router.post('/', protect, admin, createPurchase);

module.exports = router;
