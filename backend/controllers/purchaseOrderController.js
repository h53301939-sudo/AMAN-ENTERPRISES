const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const StockTransaction = require('../models/StockTransaction');
const { streamPurchaseOrderPdf } = require('../utils/pdfGenerator');
const { sendPurchaseOrderPdfDirect, getStatus } = require('../services/whatsappService');
const { logActivity } = require('../utils/logActivity');

// Generate unique PO Number: PO-YYYYMMDD-001
const generatePoNumber = async () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PO-${dateStr}`;

  const lastPo = await PurchaseOrder.findOne({
    poNumber: { $regex: `^${prefix}` }
  }).sort({ createdAt: -1 });

  if (!lastPo || !lastPo.poNumber) {
    return `${prefix}-001`;
  }

  const parts = lastPo.poNumber.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;
  return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
};

// @desc    Get all Purchase Orders
// @route   GET /api/purchase-orders
const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate('supplier', 'name contactPerson phone email address gstNumber')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name size warehouseStock minStock')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
};

// @desc    Get single Purchase Order by ID
// @route   GET /api/purchase-orders/:id
const getPurchaseOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name contactPerson phone email address gstNumber')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name size warehouseStock minStock');

    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Error fetching purchase order:', err);
    res.status(500).json({ message: 'Failed to fetch purchase order details' });
  }
};

// @desc    Create new Purchase Order
// @route   POST /api/purchase-orders
const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, expectedDeliveryDate, items, notes } = req.body;

    if (!supplierId) {
      return res.status(400).json({ message: 'Please select a supplier' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Please add at least one item to the purchase order' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Process items
    let totalCases = 0;
    const processedItems = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const product = await Product.findById(item.product);
      if (!product) continue;

      processedItems.push({
        product: product._id,
        productName: product.name,
        size: product.size || item.size || '',
        quantity: qty
      });

      totalCases += qty;
    }

    if (processedItems.length === 0) {
      return res.status(400).json({ message: 'Valid item quantities are required' });
    }

    const poNumber = await generatePoNumber();

    const newPo = new PurchaseOrder({
      poNumber,
      supplier: supplier._id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      supplierEmail: supplier.email || '',
      supplierAddress: supplier.address || '',
      supplierGst: supplier.gstNumber || '',
      orderDate: new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      items: processedItems,
      totalCases,
      status: 'Sent',
      notes: notes || '',
      createdBy: req.user._id
    });

    await newPo.save();

    await logActivity({
      req,
      user: req.user,
      action: 'Create Purchase Order',
      details: `Generated PO #${poNumber} for ${supplier.name} (${totalCases} Cases)`
    });

    const populatedPo = await PurchaseOrder.findById(newPo._id)
      .populate('supplier')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedPo);
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(500).json({ message: 'Failed to create purchase order' });
  }
};

// @desc    Stream Purchase Order PDF
// @route   GET /api/purchase-orders/:id/pdf
const streamPurchaseOrderPdfController = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('createdBy', 'name email');

    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    streamPurchaseOrderPdf(po, res);
  } catch (err) {
    console.error('Error streaming PO PDF:', err);
    res.status(500).json({ message: 'Failed to generate PDF document' });
  }
};

// @desc    Send Purchase Order PDF & Summary via WhatsApp to Supplier
// @route   POST /api/purchase-orders/:id/send-whatsapp
const sendPurchaseOrderWhatsAppController = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('createdBy', 'name email');

    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    const targetPhone = req.body.phone || po.supplierPhone || po.supplier?.phone;
    if (!targetPhone) {
      return res.status(400).json({ message: 'Supplier phone number is missing' });
    }

    const waStatus = getStatus();

    if (waStatus.status !== 'connected') {
      return res.status(400).json({ 
        message: 'Self-hosted WhatsApp Gateway is disconnected. Please scan QR in Settings > WhatsApp to send PO PDF directly.' 
      });
    }

    // Send full binary PDF document directly via Baileys self-hosted gateway
    await sendPurchaseOrderPdfDirect(targetPhone, po);
    po.status = 'Sent';
    await po.save();

    await logActivity({
      req,
      user: req.user,
      action: 'Send PO WhatsApp',
      details: `Sent PO #${po.poNumber} PDF to supplier at ${targetPhone}`
    });

    return res.json({
      success: true,
      channel: 'gateway',
      message: `Purchase Order #${po.poNumber} PDF sent directly to supplier WhatsApp (+${targetPhone})! 🚀`
    });
  } catch (err) {
    console.error('Error dispatching PO via WhatsApp:', err);
    res.status(500).json({ message: err.message || 'Failed to dispatch WhatsApp order' });
  }
};

// @desc    Optional: Convert Purchase Order into Stock Inward Purchase (Increments warehouse stock)
// @route   POST /api/purchase-orders/:id/convert-inward
const convertPoToInwardPurchaseController = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (po.convertedToInward) {
      return res.status(400).json({ message: 'This Purchase Order has already been converted to stock inward' });
    }

    const { supplierInvoiceNumber, itemRates } = req.body;
    const invoiceNum = supplierInvoiceNumber || `INW-${po.poNumber}`;

    // Calculate total inward items and increment warehouse stock
    let totalInwardAmount = 0;
    const purchaseItems = [];

    for (const item of po.items) {
      const prod = await Product.findById(item.product);
      if (!prod) continue;

      const rate = itemRates && itemRates[String(item.product)] !== undefined
        ? Number(itemRates[String(item.product)])
        : (prod.purchasePrice || prod.costPrice || 0);

      const qty = item.quantity;
      const totalVal = qty * rate;
      totalInwardAmount += totalVal;

      purchaseItems.push({
        product: prod._id,
        quantity: qty,
        purchasePrice: rate,
        totalValue: totalVal
      });

      // Update product warehouse stock
      prod.warehouseStock = (prod.warehouseStock || 0) + qty;
      await prod.save();

      // Record Stock Transaction
      await StockTransaction.create({
        product: prod._id,
        type: 'PURCHASE_INWARD',
        quantity: qty,
        source: 'PURCHASE',
        sourceReference: invoiceNum,
        notes: `Inward stock received from PO #${po.poNumber}`,
        performedBy: req.user._id
      });
    }

    // Create Purchase record
    const newPurchase = await Purchase.create({
      invoiceNumber: invoiceNum,
      supplier: po.supplier,
      purchaseDate: new Date(),
      items: purchaseItems,
      totalAmount: totalInwardAmount,
      receivedBy: req.user._id,
      remarks: `Inward receipt converted from PO #${po.poNumber}`
    });

    po.convertedToInward = true;
    po.inwardPurchaseId = newPurchase._id;
    po.status = 'Received';
    await po.save();

    await logActivity({
      req,
      user: req.user,
      action: 'Convert PO to Inward Stock',
      details: `Converted PO #${po.poNumber} to Inward Bill #${invoiceNum} (${po.totalCases} Boxes added to warehouse)`
    });

    res.json({
      message: `Stock inward recorded successfully! ${po.totalCases} boxes added to warehouse inventory. 📥`,
      purchase: newPurchase
    });
  } catch (err) {
    console.error('Error converting PO to inward:', err);
    res.status(500).json({ message: 'Failed to convert PO to inward stock' });
  }
};

// @desc    Delete Purchase Order
// @route   DELETE /api/purchase-orders/:id
const deletePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (po.convertedToInward) {
      return res.status(400).json({ message: 'Cannot delete a Purchase Order that has already been converted to stock inward' });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);

    await logActivity({
      req,
      user: req.user,
      action: 'Delete Purchase Order',
      details: `Removed PO #${po.poNumber}`
    });

    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase order:', err);
    res.status(500).json({ message: 'Failed to delete purchase order' });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  streamPurchaseOrderPdfController,
  sendPurchaseOrderWhatsAppController,
  convertPoToInwardPurchaseController,
  deletePurchaseOrder
};
