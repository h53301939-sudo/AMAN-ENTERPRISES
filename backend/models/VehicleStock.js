const mongoose = require('mongoose');

const vehicleStockSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 0 }
  },
  { timestamps: true }
);

vehicleStockSchema.index({ vehicle: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('VehicleStock', vehicleStockSchema);
