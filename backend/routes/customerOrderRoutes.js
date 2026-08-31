const express = require('express');
const router = express.Router();
const {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getCustomerOrdersDemandSummary,
  cancelCustomerOrder,
  updateCustomerOrderStatus
} = require('../controllers/customerOrderController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCustomerOrders);
router.post('/', protect, createCustomerOrder);
router.get('/demand-summary', protect, getCustomerOrdersDemandSummary);

router.get('/:id', protect, getCustomerOrderById);
router.put('/:id/cancel', protect, cancelCustomerOrder);
router.put('/:id/status', protect, updateCustomerOrderStatus);

module.exports = router;
