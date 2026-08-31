const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  streamPurchaseOrderPdfController,
  sendPurchaseOrderWhatsAppController,
  convertPoToInwardPurchaseController,
  deletePurchaseOrder
} = require('../controllers/purchaseOrderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getPurchaseOrders);
router.post('/', protect, admin, createPurchaseOrder);

router.get('/:id/pdf', streamPurchaseOrderPdfController); // Public/Stream PDF View
router.get('/:id', protect, admin, getPurchaseOrderById);
router.post('/:id/send-whatsapp', protect, admin, sendPurchaseOrderWhatsAppController);
router.post('/:id/convert-inward', protect, admin, convertPoToInwardPurchaseController);
router.delete('/:id', protect, admin, deletePurchaseOrder);

module.exports = router;
