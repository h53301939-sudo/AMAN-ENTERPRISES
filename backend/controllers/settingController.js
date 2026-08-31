const Setting = require('../models/Setting');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Return = require('../models/Return');
const Damage = require('../models/Damage');
const StockTransaction = require('../models/StockTransaction');
const VehicleStock = require('../models/VehicleStock');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Vehicle = require('../models/Vehicle');
const { logActivity } = require('../utils/logActivity');

// @desc    Get company settings
// @route   GET /api/settings
const getSettings = async (req, res) => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({});
  }
  res.json(settings);
};

// @desc    Update company settings
// @route   PUT /api/settings
const updateSettings = async (req, res) => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = new Setting(req.body);
  } else {
    Object.assign(settings, req.body);
  }
  await settings.save();
  await logActivity({ req, user: req.user, action: 'Update Settings', details: 'Updated system settings' });

  res.json(settings);
};

// @desc    Reset Demo Data & Start Fresh Production
// @route   POST /api/settings/reset-production
const resetProductionData = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    // Security check if production is already live
    if (settings.isProductionLive && req.body.confirmPhrase !== 'RESET') {
      return res.status(400).json({
        message: '⚠️ Security Lock: System is already Live in Production! To confirm hard reset, type "RESET".'
      });
    }

    // 1. Delete all demo transactions & invoices
    await Sale.deleteMany({});
    await Purchase.deleteMany({});
    await Return.deleteMany({});
    await Damage.deleteMany({});
    await StockTransaction.deleteMany({});
    await VehicleStock.deleteMany({});

    // 2. Reset Customer outstanding balances to 0
    await Customer.updateMany({}, { outstandingBalance: 0 });

    // 3. Reset Vehicle statuses to Idle
    await Vehicle.updateMany({}, { status: 'Idle', loadedStock: [] });

    // 4. Set Production Live Flag to TRUE
    settings.isProductionLive = true;
    await settings.save();

    await logActivity({
      req,
      user: req.user,
      action: 'Production System Reset',
      details: 'Cleared demo transactions and locked system into Live Production Mode'
    });

    res.json({
      message: '✅ System is now LOCKED in Live Production Mode! Test data cleared.',
      settings
    });
  } catch (err) {
    console.error('Error in resetProductionData:', err);
    res.status(500).json({ message: err.message || 'Failed to reset production data' });
  }
};

module.exports = { getSettings, updateSettings, resetProductionData };
