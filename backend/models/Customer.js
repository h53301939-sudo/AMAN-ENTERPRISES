const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    phone: { type: String, required: true },
    whatsapp: { type: String },
    address: { type: String },
    gstNumber: { type: String },
    creditLimit: { type: Number, default: 5000 },
    outstandingBalance: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 }, // Customer specific default discount %
    dueAdjustments: [
      {
        amount: { type: Number, required: true },
        reason: { type: String, default: 'Manual Due Addition' },
        previousBalance: { type: Number, default: 0 },
        newBalance: { type: Number, default: 0 },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Customer) {
  delete mongoose.models.Customer;
}

module.exports = mongoose.model('Customer', customerSchema);
