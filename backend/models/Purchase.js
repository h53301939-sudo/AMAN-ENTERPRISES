const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  totalValue: { type: Number, required: true }
});

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    purchaseDate: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    totalAmount: { type: Number, required: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
