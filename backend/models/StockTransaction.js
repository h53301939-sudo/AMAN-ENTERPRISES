const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true }, // Positive integer
    sourceType: {
      type: String,
      enum: ['Supplier', 'Warehouse', 'Vehicle', 'Adjustment', 'System'],
      required: true
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'sourceRefModel', default: null },
    sourceRefModel: { type: String, enum: ['Supplier', 'Vehicle', 'User', 'Warehouse'], default: null },
    destType: {
      type: String,
      enum: ['Warehouse', 'Vehicle', 'Customer', 'Damage', 'Adjustment'],
      required: true
    },
    destId: { type: mongoose.Schema.Types.ObjectId, refPath: 'destRefModel', default: null },
    destRefModel: { type: String, enum: ['Vehicle', 'Customer', 'User'], default: null },
    transactionType: {
      type: String,
      enum: [
        'Supplier_Inward',
        'Warehouse_To_Vehicle',
        'Vehicle_To_Customer',
        'Warehouse_To_Customer',
        'Vehicle_To_Warehouse',
        'Warehouse_Damage',
        'Vehicle_Damage',
        'Stock_Adjustment'
      ],
      required: true
    },
    unitPrice: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.models.StockTransaction || mongoose.model('StockTransaction', stockTransactionSchema);
