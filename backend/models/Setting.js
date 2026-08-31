const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Pepsi Authorized Distribution Center' },
    companyLogo: { type: String, default: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Pepsi_logo_2023.svg' },
    gstNumber: { type: String, default: '27AAAAA0000A1Z5' },
    address: { type: String, default: 'Plot 42, Pepsi Beverage Park, Industrial Zone, Mumbai - 400072' },
    phone: { type: String, default: '+91 98765 43210' },
    email: { type: String, default: 'sales@pepsi-distributor.com' },
    currencySymbol: { type: String, default: '₹' },
    defaultGstPercent: { type: Number, default: 28 },
    invoiceFooter: { type: String, default: 'Thank you for choosing Pepsi Products! Refresh your world.' },
    isProductionLive: { type: Boolean, default: false },
    upiVpa: { type: String, default: 'pepsiagency@upi' },
    upiName: { type: String, default: 'Pepsi Agency' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
