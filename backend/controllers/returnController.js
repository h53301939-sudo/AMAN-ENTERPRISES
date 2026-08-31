const Return = require('../models/Return');
const Vehicle = require('../models/Vehicle');
const Product = require('../models/Product');
const VehicleStock = require('../models/VehicleStock');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');
const { logActivity } = require('../utils/logActivity');

// @desc    Process End-of-Day Unsold Stock Return (Vehicle -> Warehouse)
// @route   POST /api/returns
const processReturn = async (req, res) => {
  try {
    const { vehicleId, items, remarks } = req.body;

    if (!vehicleId || !items || !items.length) {
      return res.status(400).json({ message: 'Select vehicle and items to return to warehouse' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // 1. Validate vehicle stock
    for (const item of items) {
      const vStock = await VehicleStock.findOne({ vehicle: vehicleId, product: item.product });
      const product = await Product.findById(item.product);
      const availQty = vStock ? vStock.quantity : 0;
      if (availQty < item.quantity) {
        return res.status(400).json({
          message: `Cannot return ${item.quantity} Boxes of ${product ? product.name : 'product'}. Available on van: ${availQty} Boxes`
        });
      }
    }

    let totalQty = 0;
    let totalValue = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const casePrice = product.sellingPrice || 0;
      const val = Number(item.quantity) * casePrice;

      totalQty += Number(item.quantity);
      totalValue += val;

      processedItems.push({
        product: product._id,
        quantity: Number(item.quantity),
        value: val
      });

      // 2. Stock Ledger transaction (Vehicle -> Warehouse)
      await recordLedgerTransaction({
        product: product._id,
        quantity: Number(item.quantity),
        sourceType: 'Vehicle',
        sourceId: vehicleId,
        sourceRefModel: 'Vehicle',
        destType: 'Warehouse',
        transactionType: 'Vehicle_To_Warehouse',
        unitPrice: casePrice,
        user: req.user._id,
        remarks: remarks || `End of day return from Van ${vehicle.vehicleNumber}`
      });
    }

    const returnDoc = new Return({
      worker: req.user._id,
      vehicle: vehicleId,
      items: processedItems,
      totalQuantity: totalQty,
      totalValue,
      status: 'Completed',
      remarks
    });

    await returnDoc.save();

    // Check remaining vehicle stock. If 0, mark vehicle status as Returned
    const remainingStock = await VehicleStock.find({ vehicle: vehicleId, quantity: { $gt: 0 } });
    if (remainingStock.length === 0) {
      vehicle.status = 'Returned';
      await vehicle.save();
    }

    await logActivity({
      req,
      user: req.user,
      action: 'Vehicle Stock Return',
      details: `Returned ${totalQty} Cases (₹${totalValue}) from vehicle ${vehicle.vehicleNumber} to warehouse`
    });

    res.status(201).json(returnDoc);
  } catch (err) {
    console.error('Error processing return:', err);
    res.status(500).json({ message: err.message || 'Failed to process return' });
  }
};

// @desc    Get return history
// @route   GET /api/returns
const getReturns = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'worker') {
      query.worker = req.user._id;
    }

    const returns = await Return.find(query)
      .populate('worker', 'name')
      .populate('vehicle', 'vehicleNumber vehicleName')
      .populate('items.product', 'name sku unit size sellingPrice')
      .sort({ returnDate: -1 });

    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  processReturn,
  getReturns
};
