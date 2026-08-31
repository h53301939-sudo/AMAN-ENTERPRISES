const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  clearAllProducts
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getProducts);
router.delete('/clear-all', protect, admin, clearAllProducts);
router.get('/:id', protect, getProductById);
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;
