const mongoose = require('mongoose');

const damageSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, enum: ['Broken Bottle', 'Leakage', 'Expired', 'Transport Damage', 'Other'], required: true },
    source: { type: String, enum: ['Warehouse', 'Vehicle'], required: true },
    sourceVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    costValue: { type: Number, required: true },
    remarks: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Damage', damageSchema);
