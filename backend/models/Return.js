const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  value: { type: Number, required: true }
});

const returnSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    returnDate: { type: Date, default: Date.now },
    items: [returnItemSchema],
    totalQuantity: { type: Number, required: true },
    totalValue: { type: Number, required: true },
    status: { type: String, enum: ['Completed', 'Pending'], default: 'Completed' },
    remarks: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Return', returnSchema);
