const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all inward stock purchases
// @route   GET /api/purchases
const getPurchases = async (req, res) => {
  const purchases = await Purchase.find()
    .populate('supplier', 'name contactPerson phone')
    .populate('receivedBy', 'name')
    .populate('items.product', 'name sku unit')
    .sort({ purchaseDate: -1 });

  res.json(purchases);
};

// @desc    Add incoming stock from supplier (Pepsi Bottling Plant)
// @route   POST /api/purchases
const createPurchase = async (req, res) => {
  const { invoiceNumber, supplier, items, remarks } = req.body;

  if (!invoiceNumber || !supplier || !items || !items.length) {
    return res.status(400).json({ message: 'Missing required purchase details or line items' });
  }

  const invoiceExists = await Purchase.findOne({ invoiceNumber });
  if (invoiceExists) {
    return res.status(400).json({ message: 'Purchase invoice number already exists' });
  }

  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({ message: `Product not found: ${item.product}` });
    }

    const itemQty = Number(item.quantity || 0);
    const itemPrice = Number(item.purchasePrice || 0);

    if (itemPrice >= Number(product.sellingPrice || 0)) {
      return res.status(400).json({
        message: `Inward Purchase Rate for ${product.name} (₹${itemPrice}) cannot be equal to or higher than its current Selling Price (₹${product.sellingPrice}). Please update catalog selling price first.`
      });
    }

    const itemTotal = itemQty * itemPrice;
    totalAmount += itemTotal;

    // Calculate Weighted Average Cost Price per Case for accurate multi-shipment profit tracking
    const currentStock = Number(product.warehouseStock || 0);
    const currentCostPrice = Number(product.purchasePrice || 0);
    const combinedTotalQty = currentStock + itemQty;

    if (combinedTotalQty > 0) {
      const existingInventoryVal = currentStock * currentCostPrice;
      const newShipmentVal = itemQty * itemPrice;
      const weightedAvgCost = (existingInventoryVal + newShipmentVal) / combinedTotalQty;
      product.purchasePrice = Math.round(weightedAvgCost * 100) / 100;
      await product.save();
    }

    processedItems.push({
      product: item.product,
      quantity: itemQty,
      purchasePrice: itemPrice,
      totalValue: itemTotal
    });
  }

  const purchase = new Purchase({
    invoiceNumber,
    supplier,
    items: processedItems,
    totalAmount,
    receivedBy: req.user._id,
    remarks
  });

  await purchase.save();

  // Trigger Ledger transactions and automatically update warehouse stocks
  for (const item of processedItems) {
    await recordLedgerTransaction({
      product: item.product,
      quantity: item.quantity,
      sourceType: 'Supplier',
      sourceId: supplier,
      sourceRefModel: 'Supplier',
      destType: 'Warehouse',
      transactionType: 'Supplier_Inward',
      unitPrice: item.purchasePrice,
      user: req.user._id,
      remarks: `Stock inward from Supplier Invoice #${invoiceNumber}`
    });
  }

  await logActivity({
    req,
    user: req.user,
    action: 'Stock Inward Purchase',
    details: `Processed purchase invoice #${invoiceNumber} total ₹${totalAmount}`
  });

  res.status(201).json(purchase);
};

module.exports = {
  getPurchases,
  createPurchase
};
