const Vehicle = require('../models/Vehicle');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const VehicleStock = require('../models/VehicleStock');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');
const { logActivity } = require('../utils/logActivity');

// @desc    Load Stock into Vehicle (Transfer Warehouse -> Vehicle)
// @route   POST /api/loading
const loadStockToVehicle = async (req, res) => {
  try {
    const { vehicleId, items, remarks } = req.body;

    if (!vehicleId || !items || !items.length) {
      return res.status(400).json({ message: 'Select vehicle and at least one product item to load' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Validate all requested items against available warehouse stock & selling price setup
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.product}` });
      const qty = Number(item.quantity || 0);

      if (qty <= 0) {
        return res.status(400).json({ message: 'Please enter a valid box quantity to load' });
      }

      // STRICT SELLING PRICE VALIDATION
      if (!product.sellingPrice || Number(product.sellingPrice) <= 0) {
        return res.status(400).json({
          message: `⛔ Loading Blocked: Van Selling Price for "${product.name}" is not set by Admin! Please set the Van Selling Price in "Van Selling Prices" page before loading onto van.`
        });
      }

      if (Number(product.warehouseStock || 0) < qty) {
        return res.status(400).json({
          message: `Insufficient warehouse stock for ${product.name}. Available: ${product.warehouseStock} Boxes, Attempted Loading: ${qty} Boxes`
        });
      }
    }

    // Record transactions and adjust stocks
    let totalValue = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      const qty = Number(item.quantity || 0);

      await recordLedgerTransaction({
        product: item.product,
        quantity: qty,
        sourceType: 'Warehouse',
        destType: 'Vehicle',
        destId: vehicle._id,
        destRefModel: 'Vehicle',
        transactionType: 'Warehouse_To_Vehicle',
        unitPrice: product.purchasePrice || (product.sellingPrice * 0.8),
        user: req.user._id,
        remarks: remarks || `Loaded onto Van ${vehicle.vehicleNumber}`
      });
      totalValue += qty * (product.sellingPrice || 0);
    }

    // Update vehicle status to Loaded / On Route
    vehicle.status = 'On Route';
    await vehicle.save();

    await logActivity({
      req,
      user: req.user,
      action: 'Vehicle Loaded',
      details: `Loaded stock worth ₹${totalValue} onto vehicle ${vehicle.vehicleNumber}`
    });

    const updatedStocks = await VehicleStock.find({ vehicle: vehicle._id, quantity: { $gt: 0 } }).populate('product');

    res.status(200).json({
      message: `Successfully loaded stock onto Vehicle ${vehicle.vehicleNumber}`,
      vehicle,
      stocks: updatedStocks
    });
  } catch (err) {
    console.error('Error in loadStockToVehicle:', err);
    res.status(500).json({ message: err.message || 'Failed to load stock onto vehicle' });
  }
};

// @desc    Get loading history
// @route   GET /api/loading/history
const getLoadingHistory = async (req, res) => {
  try {
    const transactions = await StockTransaction.find({ transactionType: 'Warehouse_To_Vehicle' })
      .populate('product', 'name size sku unit crateQuantity sellingPrice purchasePrice')
      .populate('destId', 'vehicleNumber vehicleName driverName')
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(transactions);
  } catch (err) {
    console.error('Error fetching loading history:', err);
    res.status(500).json({ message: 'Failed to fetch loading history' });
  }
};

module.exports = {
  loadStockToVehicle,
  getLoadingHistory
};
