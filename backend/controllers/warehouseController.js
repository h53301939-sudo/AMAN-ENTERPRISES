const Product = require('../models/Product');
const Damage = require('../models/Damage');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');
const { logActivity } = require('../utils/logActivity');

// @desc    Get warehouse stock overview
// @route   GET /api/warehouse/stock
const getWarehouseStock = async (req, res) => {
  try {
    const products = await Product.find({ status: 'Active' }).sort({ name: 1 });
    
    let totalStockQty = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;

    const stockList = products.map(prod => {
      const value = prod.warehouseStock * prod.purchasePrice;
      totalStockQty += prod.warehouseStock;
      totalStockValue += value;
      if (prod.warehouseStock <= prod.minStock) lowStockCount++;

      return {
        _id: prod._id,
        name: prod.name,
        size: prod.size,
        brand: prod.brand,
        sku: prod.sku,
        category: prod.category,
        unit: prod.unit,
        crateQuantity: prod.crateQuantity,
        warehouseStock: prod.warehouseStock,
        cratesInStock: (prod.warehouseStock / prod.crateQuantity).toFixed(1),
        purchasePrice: prod.purchasePrice,
        sellingPrice: prod.sellingPrice,
        stockValue: value,
        minStock: prod.minStock,
        isLowStock: prod.warehouseStock <= prod.minStock
      };
    });

    res.json({
      summary: {
        totalStockQty,
        totalStockValue,
        lowStockCount,
        totalProducts: products.length
      },
      products: stockList
    });
  } catch (err) {
    console.error('Error fetching warehouse stock:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch warehouse stock' });
  }
};

// @desc    Manually adjust stock with ledger tracking
// @route   POST /api/warehouse/adjust
const adjustStock = async (req, res) => {
  try {
    const { productId, adjustmentQty, remarks } = req.body;

    if (!productId || adjustmentQty === undefined || adjustmentQty === 0) {
      return res.status(400).json({ message: 'Invalid product ID or adjustment quantity' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newStock = product.warehouseStock + Number(adjustmentQty);

    if (newStock < 0) {
      return res.status(400).json({ message: 'Adjustment results in negative stock balance' });
    }

    await recordLedgerTransaction({
      product: productId,
      quantity: Number(adjustmentQty), // can be positive or negative
      sourceType: 'Adjustment',
      destType: 'Warehouse',
      transactionType: 'Stock_Adjustment',
      unitPrice: product.purchasePrice || 0,
      user: req.user?._id,
      remarks: remarks || `Manual adjustment by ${req.user?.name || 'Staff'}`
    });

    await logActivity({
      req,
      user: req.user,
      action: 'Stock Adjustment',
      details: `Adjusted stock for ${product.name} by ${adjustmentQty} units. New Stock: ${product.warehouseStock}`
    });

    res.json({ message: 'Stock adjusted successfully', currentStock: product.warehouseStock });
  } catch (err) {
    console.error('Error adjusting stock:', err);
    res.status(400).json({ message: err.message || 'Failed to adjust stock' });
  }
};

module.exports = {
  getWarehouseStock,
  adjustStock
};
