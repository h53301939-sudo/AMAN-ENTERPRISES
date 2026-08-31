const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  getCustomerDetails,
  createCustomer,
  updateCustomer,
  addCustomerPayment,
  addManualDue,
  deleteCustomer
} = require('../controllers/customerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomerById);
router.get('/:id/details', protect, getCustomerDetails);
router.post('/', protect, createCustomer); // Salesman or admin can quick-create customer
router.put('/:id', protect, updateCustomer);
router.post('/:id/payments', protect, addCustomerPayment);
router.post('/:id/manual-due', protect, addManualDue);
router.delete('/:id', protect, admin, deleteCustomer);

module.exports = router;
