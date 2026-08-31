const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  size: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 }
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    supplierPhone: { type: String, required: true },
    supplierEmail: { type: String, default: '' },
    supplierAddress: { type: String, default: '' },
    supplierGst: { type: String, default: '' },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    items: [purchaseOrderItemSchema],
    totalCases: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Partially Received', 'Received', 'Cancelled'],
      default: 'Sent'
    },
    notes: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    convertedToInward: { type: Boolean, default: false },
    inwardPurchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
