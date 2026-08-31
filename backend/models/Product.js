const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, default: 'Balaji' },
    category: { type: String, required: true, default: 'Namkeen' },
    sku: { type: String },
    barcode: { type: String },
    image: { type: String, default: '' },
    purchasePrice: { type: Number, default: 0 },
    boxPrice: { type: Number, default: 120 }, // Selling price of one complete box (e.g. ₹120)
    hangersPerBox: { type: Number, required: true, default: 24 }, // Hangers contained in 1 Box
    looseHangerSurcharge: { type: Number, default: 1 }, // Extra margin for loose hangers (default ₹1)
    hangerPrice: { type: Number, required: true, default: 0 }, // Loose hanger selling price (base + surcharge)
    sellFullBox: { type: Boolean, default: true },
    sellIndividualHanger: { type: Boolean, default: true },
    sealedBoxStock: { type: Number, default: 0 }, // Sealed complete boxes
    looseHangerStock: { type: Number, default: 0 }, // Loose hangers outside boxes
    // Legacy / Aliased fields for backward compatibility across existing API handlers
    sellingPrice: { type: Number }, // Synced with boxPrice
    warehouseStock: { type: Number, default: 0 }, // Synced with sealedBoxStock
    mrp: { type: Number, default: 0 },
    unit: { type: String, default: 'Box' },
    size: { type: String, default: 'Standard' },
    crateQuantity: { type: Number, default: 24 },
    minStock: { type: Number, default: 5 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
  },
  { timestamps: true }
);

// Pre-validate middleware to guarantee synced values before Mongoose schema validation runs
productSchema.pre('validate', function (next) {
  const effectiveBoxPrice = Number(
    this.boxPrice !== undefined && this.boxPrice !== null
      ? this.boxPrice
      : (this.sellingPrice !== undefined && this.sellingPrice !== null ? this.sellingPrice : 120)
  );

  this.boxPrice = effectiveBoxPrice;
  this.sellingPrice = effectiveBoxPrice;

  const hBox = Number(this.hangersPerBox || 24);
  this.hangersPerBox = hBox;

  const surcharge = Number(this.looseHangerSurcharge !== undefined ? this.looseHangerSurcharge : 1);
  this.looseHangerSurcharge = surcharge;

  const basePrice = Math.ceil(effectiveBoxPrice / hBox);
  // Auto-calculate hanger price as base + surcharge if not explicitly provided or on price change
  if (!this.hangerPrice || this.hangerPrice === 0 || this.isModified('boxPrice') || this.isModified('sellingPrice') || this.isModified('hangersPerBox')) {
    this.hangerPrice = basePrice + surcharge;
  }

  if (this.sealedBoxStock !== undefined && this.sealedBoxStock !== null) {
    this.warehouseStock = this.sealedBoxStock;
  } else if (this.warehouseStock !== undefined && this.warehouseStock !== null) {
    this.sealedBoxStock = this.warehouseStock;
  } else {
    this.sealedBoxStock = 0;
    this.warehouseStock = 0;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
