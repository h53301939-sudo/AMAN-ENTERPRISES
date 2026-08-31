const Damage = require('../models/Damage');
const Product = require('../models/Product');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');
const { logActivity } = require('../utils/logActivity');

// @desc    Record Damaged / Broken / Expired stock
// @route   POST /api/damages
const recordDamage = async (req, res) => {
  const { productId, quantity, reason, source, sourceVehicleId, remarks } = req.body;

  if (!productId || !quantity || !reason || !source) {
    return res.status(400).json({ message: 'Product, quantity, reason, and source are required' });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const numQty = Number(quantity);
  const costValue = numQty * product.purchasePrice;

  // Record Stock Ledger transaction
  const txnType = source === 'Warehouse' ? 'Warehouse_Damage' : 'Vehicle_Damage';
  await recordLedgerTransaction({
    product: productId,
    quantity: numQty,
    sourceType: source,
    sourceId: sourceVehicleId || null,
    sourceRefModel: source === 'Vehicle' ? 'Vehicle' : null,
    destType: 'Damage',
    transactionType: txnType,
    unitPrice: product.purchasePrice,
    user: req.user._id,
    remarks: `Damage Log (${reason}): ${remarks || ''}`
  });

  const damage = new Damage({
    product: productId,
    quantity: numQty,
    reason,
    source,
    sourceVehicle: sourceVehicleId || null,
    reportedBy: req.user._id,
    costValue,
    remarks
  });

  await damage.save();

  await logActivity({
    req,
    user: req.user,
    action: 'Damage Logged',
    details: `Logged ${numQty} damaged ${product.name} (${reason}) from ${source}`
  });

  res.status(201).json(damage);
};

// @desc    Get damage history log
// @route   GET /api/damages
const getDamages = async (req, res) => {
  const damages = await Damage.find()
    .populate('product', 'name sku unit purchasePrice')
    .populate('sourceVehicle', 'vehicleNumber vehicleName')
    .populate('reportedBy', 'name role')
    .sort({ createdAt: -1 });

  res.json(damages);
};

module.exports = {
  recordDamage,
  getDamages
};
