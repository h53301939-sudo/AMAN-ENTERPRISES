const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, unique: true },
    vehicleName: { type: String, required: true }, // e.g. "Tata Ace Van 1"
    driverName: { type: String },
    assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    capacityCrates: { type: Number, default: 200 },
    status: {
      type: String,
      enum: ['Available', 'Loaded', 'On Route', 'Returned', 'Maintenance'],
      default: 'Available'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
