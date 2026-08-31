const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicleStockById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getVehicles);
router.get('/:id/stock', protect, getVehicleStockById);
router.post('/', protect, admin, createVehicle);
router.put('/:id', protect, admin, updateVehicle);
router.delete('/:id', protect, admin, deleteVehicle);

module.exports = router;
