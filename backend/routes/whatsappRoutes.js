const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  initWhatsApp,
  getStatus,
  disconnectWhatsApp,
  sendCustomPdfDocument,
  sendInvoicePdfDirect
} = require('../services/whatsappService');
const Sale = require('../models/Sale');
const { protect, admin } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// @desc    Get WhatsApp Gateway connection status & live QR code
// @route   GET /api/whatsapp/status
router.get('/status', protect, (req, res) => {
  res.json(getStatus());
});

// @desc    Initiate/Restart WhatsApp connection and generate QR code
// @route   POST /api/whatsapp/connect
router.post('/connect', protect, admin, async (req, res) => {
  try {
    await initWhatsApp(true);
    res.json({ message: 'WhatsApp initialization started', ...getStatus() });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to start WhatsApp' });
  }
});

// @desc    Disconnect & logout WhatsApp linked device
// @route   POST /api/whatsapp/disconnect
router.post('/disconnect', protect, admin, async (req, res) => {
  try {
    const result = await disconnectWhatsApp();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to disconnect WhatsApp' });
  }
});

// @desc    Send exact high-resolution PDF document (matching frontend layout Image 2) to customer's WhatsApp
// @route   POST /api/whatsapp/send-pdf
router.post('/send-pdf', protect, upload.single('pdfFile'), async (req, res) => {
  try {
    const phone = req.body.phone;
    const invoiceNumber = req.body.invoiceNumber;
    const customerName = req.body.customerName;
    const netTotal = req.body.netTotal;
    const dueAmount = req.body.dueAmount;
    const paymentMethod = req.body.paymentMethod;
    const cashAmount = req.body.cashAmount;
    const upiAmount = req.body.upiAmount;
    const createdAt = req.body.createdAt;

    if (!phone) {
      return res.status(400).json({ message: 'Customer phone number is required' });
    }

    let pdfBuffer = null;

    if (req.file && req.file.buffer) {
      // Received as binary multipart/form-data
      pdfBuffer = req.file.buffer;
    } else if (req.body.pdfBase64) {
      // Received as base64 string
      const cleanBase64 = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      pdfBuffer = Buffer.from(cleanBase64, 'base64');
    }

    if (!pdfBuffer) {
      return res.status(400).json({ message: 'PDF document content is required' });
    }

    const result = await sendCustomPdfDocument(phone, pdfBuffer, {
      invoiceNumber,
      customerName,
      netTotal,
      dueAmount,
      paymentMethod,
      cashAmount,
      upiAmount,
      createdAt
    });

    res.json({
      success: true,
      message: `Official High-Res PDF Invoice #${invoiceNumber} delivered directly to +${phone}!`,
      result
    });
  } catch (err) {
    console.error('Error sending custom PDF via WhatsApp:', err);
    res.status(500).json({ message: err.message || 'Failed to deliver PDF document via WhatsApp' });
  }
});

// @desc    Send automated PDF invoice document to customer's WhatsApp
// @route   POST /api/whatsapp/send-invoice/:saleId
router.post('/send-invoice/:saleId', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.saleId)
      .populate('customer')
      .populate('worker', 'name phone')
      .populate('vehicle', 'vehicleNumber')
      .populate('items.product');

    if (!sale) {
      return res.status(404).json({ message: 'Sale invoice not found' });
    }

    const customerPhone = sale.customer?.phone || req.body.phone;
    if (!customerPhone) {
      return res.status(400).json({ message: 'Customer phone number is missing' });
    }

    const result = await sendInvoicePdfDirect(customerPhone, sale);
    res.json({
      success: true,
      message: `Official PDF Invoice #${sale.invoiceNumber} delivered directly to +${customerPhone}!`,
      result
    });
  } catch (err) {
    console.error('Error sending PDF invoice via WhatsApp:', err);
    res.status(500).json({ message: err.message || 'Failed to deliver PDF invoice via WhatsApp' });
  }
});

module.exports = router;
