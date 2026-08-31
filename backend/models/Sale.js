const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  unitType: { type: String, enum: ['Box', 'Hanger', 'box', 'hanger'], default: 'Box' },
  size: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 }, // Unit cost price (Box cost or Hanger cost)
  totalAmount: { type: Number, required: true },
  profit: { type: Number, default: 0 } // Gross profit for this line item
});

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: false },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [saleItemSchema],
    subTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    netTotal: { type: Number, required: true },
    grossProfit: { type: Number, default: 0 }, // Sum of item profits
    netProfit: { type: Number, default: 0 }, // grossProfit - discount
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Credit', 'Split'], required: true },
    cashAmount: { type: Number, default: 0 },
    upiAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, required: true },
    dueAmount: { type: Number, default: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ['Paid', 'Partial', 'Unpaid'], default: 'Paid' },
    pdfUrl: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
