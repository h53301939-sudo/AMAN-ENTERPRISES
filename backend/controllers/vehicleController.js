const Vehicle = require('../models/Vehicle');
const VehicleStock = require('../models/VehicleStock');
const StockTransaction = require('../models/StockTransaction');
const User = require('../models/User');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all vehicles with current stock info
// @route   GET /api/vehicles
const getVehicles = async (req, res) => {
  const vehicles = await Vehicle.find().populate('assignedWorker', 'name phone email').sort({ vehicleNumber: 1 });
  
  // Attach stock summary and loading age to each vehicle
  const result = await Promise.all(
    vehicles.map(async (v) => {
      const vStocks = await VehicleStock.find({ vehicle: v._id, quantity: { $gt: 0 } }).populate('product');
      const validStocks = vStocks.filter(st => st.product); // Filter out any deleted product refs
      const totalCases = validStocks.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
      const totalValue = validStocks.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.product?.sellingPrice || 0)), 0);
      
      // Check last loading transaction timestamp
      const lastTx = await StockTransaction.findOne({ 
        destId: v._id, 
        transactionType: 'Warehouse_To_Vehicle' 
      }).sort({ createdAt: -1 });

      const lastLoadedAt = lastTx?.createdAt || (validStocks[0]?.updatedAt || null);
      const hoursSinceLastLoad = (lastLoadedAt && totalCases > 0)
        ? (Date.now() - new Date(lastLoadedAt).getTime()) / (1000 * 60 * 60)
        : 0;
      
      const isStaleStock = totalCases > 0 && hoursSinceLastLoad >= 12;

      return {
        ...v.toObject(),
        loadedStockItemsCount: validStocks.length,
        totalStockUnits: totalCases, // Cases
        totalStockValue: totalValue,
        stockItems: validStocks,
        lastLoadedAt,
        hoursSinceLastLoad: Math.round(hoursSinceLastLoad * 10) / 10,
        isStaleStock
      };
    })
  );

  res.json(result);
};

// @desc    Get vehicle inventory stock by vehicle ID
// @route   GET /api/vehicles/:id/stock
const getVehicleStockById = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id).populate('assignedWorker', 'name phone');
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

  const stocks = await VehicleStock.find({ vehicle: req.params.id, quantity: { $gt: 0 } }).populate('product');
  const validStocks = stocks.filter(st => st.product);

  res.json({
    vehicle,
    stocks: validStocks
  });
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
const createVehicle = async (req, res) => {
  const { vehicleNumber, vehicleName, driverName, assignedWorker, capacityCrates, status } = req.body;

  const existing = await Vehicle.findOne({ vehicleNumber });
  if (existing) return res.status(400).json({ message: 'Vehicle with this number already exists' });

  const vehicle = new Vehicle({
    vehicleNumber,
    vehicleName,
    driverName,
    assignedWorker: assignedWorker || null,
    capacityCrates: capacityCrates || 250,
    status: status || 'Available'
  });

  await vehicle.save();

  if (assignedWorker) {
    await User.findByIdAndUpdate(assignedWorker, { assignedVehicle: vehicle._id });
  }

  await logActivity({ req, user: req.user, action: 'Create Vehicle', details: `Added vehicle ${vehicleNumber} (${vehicleName})` });

  res.status(201).json(vehicle);
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
const updateVehicle = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

  Object.assign(vehicle, req.body);
  await vehicle.save();

  if (req.body.assignedWorker) {
    await User.findByIdAndUpdate(req.body.assignedWorker, { assignedVehicle: vehicle._id });
  }

  await logActivity({ req, user: req.user, action: 'Update Vehicle', details: `Updated vehicle ${vehicle.vehicleNumber}` });

  res.json(vehicle);
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
const deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

  await Vehicle.findByIdAndDelete(req.params.id);
  await VehicleStock.deleteMany({ vehicle: req.params.id });

  await logActivity({ req, user: req.user, action: 'Delete Vehicle', details: `Deleted vehicle ${vehicle.vehicleNumber}` });

  res.json({ message: 'Vehicle removed' });
};

module.exports = {
  getVehicles,
  getVehicleStockById,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
