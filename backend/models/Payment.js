const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }, // Optional, linked to invoice if applicable
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Split', 'Bank Transfer', 'Cheque'], default: 'Cash', required: true },
    cashAmount: { type: Number, default: 0 },
    upiAmount: { type: Number, default: 0 },
    paymentDate: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String }
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Payment) {
  delete mongoose.models.Payment;
}

module.exports = mongoose.model('Payment', paymentSchema);
