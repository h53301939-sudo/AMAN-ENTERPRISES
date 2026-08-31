const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema(
  {
    month: {
      type: String, // Format: YYYY-MM (e.g., "2026-08")
      required: true
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // null for entire agency target, or worker ObjectId for individual target
    },
    targetCases: {
      type: Number,
      default: 5000,
      min: 0
    },
    targetRevenue: {
      type: Number,
      default: 2500000,
      min: 0
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Compound unique index: Each worker (or agency overall) has at most one target per month
targetSchema.index({ month: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Target', targetSchema);
