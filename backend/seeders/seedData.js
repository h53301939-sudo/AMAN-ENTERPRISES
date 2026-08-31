const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Setting = require('../models/Setting');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');

const seedDatabase = async () => {
  try {
    console.log('Seeding Pepsi distribution system database...');

    // Clear existing collections
    await User.deleteMany();
    await Product.deleteMany();
    await Supplier.deleteMany();
    await Vehicle.deleteMany();
    await Customer.deleteMany();
    await Setting.deleteMany();

    // 1. Create Default Settings
    await Setting.create({
      companyName: 'DAVID TRADERS',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Pepsi_logo_2023.svg',
      gstNumber: '27AAAAA0000A1Z5',
      address: 'Plot 42, Pepsi Beverage Park, Industrial Zone, Mumbai - 400072',
      phone: '+91 8932094428',
      email: 'sales@pepsi-distributor.com',
      currencySymbol: '₹',
      defaultGstPercent: 28,
      invoiceFooter: 'Thank you for choosing Pepsi Products! Refresh your world.'
    });

    // 2. Create Users (Admin & Workers)
    const adminUser = await User.create({
      name: 'ANIRUDH KUMAR (Admin)',
      email: 'admin@pepsi.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91 9569703631',
      active: true
    });

    const workerUser1 = await User.create({
      name: 'Ramesh Kumar (Salesman)',
      email: 'worker@pepsi.com',
      password: 'worker123',
      role: 'worker',
      phone: '+91 98765 11111',
      active: true
    });

    const workerUser2 = await User.create({
      name: 'Suresh Patel (Salesman)',
      email: 'suresh@pepsi.com',
      password: 'worker123',
      role: 'worker',
      phone: '+91 98765 22222',
      active: true
    });

    // 3. Create Vehicles
    const vehicle1 = await Vehicle.create({
      vehicleNumber: 'MH-04-AB-1234',
      vehicleName: 'Tata Ace Van 1',
      driverName: 'Ramesh Kumar',
      assignedWorker: workerUser1._id,
      capacityCrates: 250,
      status: 'Loaded'
    });

    const vehicle2 = await Vehicle.create({
      vehicleNumber: 'MH-04-CD-5678',
      vehicleName: 'Mahindra Bolero Pickup 2',
      driverName: 'Suresh Patel',
      assignedWorker: workerUser2._id,
      capacityCrates: 300,
      status: 'Available'
    });

    // Link vehicle to worker
    workerUser1.assignedVehicle = vehicle1._id;
    await workerUser1.save();

    workerUser2.assignedVehicle = vehicle2._id;
    await workerUser2.save();

    // 4. Create Supplier (PepsiCo Bottling Plant)
    const supplier = await Supplier.create({
      name: 'PepsiCo India Holdings Pvt Ltd',
      contactPerson: 'Vikram Singh (Supply Chain Mgr)',
      phone: '+91 22 6677 8899',
      email: 'orders@pepsico.com',
      address: 'Plot 10, MIDC Industrial Area, Thane West, Maharashtra',
      gstNumber: '27AAACP0011B1Z2'
    });

    // 5. Create Balaji Namkeen Product Catalog
    const productList = [
      {
        name: 'Balaji Ratlami Sev Box',
        brand: 'Balaji',
        category: 'Namkeen',
        sku: 'BAL-RATLAMI-BOX',
        barcode: '890123456001',
        image: '',
        purchasePrice: 90.00,
        boxPrice: 120.00,
        sellingPrice: 120.00,
        hangersPerBox: 24,
        hangerPrice: 5.00,
        sellFullBox: true,
        sellIndividualHanger: true,
        sealedBoxStock: 100,
        looseHangerStock: 0,
        warehouseStock: 100,
        minStock: 10,
        status: 'Active'
      },
      {
        name: 'Balaji Aloo Bhujia Box',
        brand: 'Balaji',
        category: 'Namkeen',
        sku: 'BAL-ALOO-BHUJIA-BOX',
        barcode: '890123456002',
        image: '',
        purchasePrice: 90.00,
        boxPrice: 120.00,
        sellingPrice: 120.00,
        hangersPerBox: 24,
        hangerPrice: 5.00,
        sellFullBox: true,
        sellIndividualHanger: true,
        sealedBoxStock: 80,
        looseHangerStock: 0,
        warehouseStock: 80,
        minStock: 10,
        status: 'Active'
      },
      {
        name: 'Balaji Masala Wafers Box',
        brand: 'Balaji',
        category: 'Wafers',
        sku: 'BAL-MASALA-WAFERS-BOX',
        barcode: '890123456003',
        image: '',
        purchasePrice: 90.00,
        boxPrice: 120.00,
        sellingPrice: 120.00,
        hangersPerBox: 24,
        hangerPrice: 5.00,
        sellFullBox: true,
        sellIndividualHanger: true,
        sealedBoxStock: 60,
        looseHangerStock: 0,
        warehouseStock: 60,
        minStock: 10,
        status: 'Active'
      },
      {
        name: 'Balaji Simply Salted Wafers Box',
        brand: 'Balaji',
        category: 'Wafers',
        sku: 'BAL-SALTED-WAFERS-BOX',
        barcode: '890123456004',
        image: '',
        purchasePrice: 90.00,
        boxPrice: 120.00,
        sellingPrice: 120.00,
        hangersPerBox: 24,
        hangerPrice: 5.00,
        sellFullBox: true,
        sellIndividualHanger: true,
        sealedBoxStock: 50,
        looseHangerStock: 0,
        warehouseStock: 50,
        minStock: 10,
        status: 'Active'
      },
      {
        name: 'Balaji Tikha Mitha Mix Box',
        brand: 'Balaji',
        category: 'Namkeen',
        sku: 'BAL-TIKHA-MITHA-BOX',
        barcode: '890123456005',
        image: '',
        purchasePrice: 90.00,
        boxPrice: 120.00,
        sellingPrice: 120.00,
        hangersPerBox: 24,
        hangerPrice: 5.00,
        sellFullBox: true,
        sellIndividualHanger: true,
        sealedBoxStock: 70,
        looseHangerStock: 0,
        warehouseStock: 70,
        minStock: 10,
        status: 'Active'
      }
    ];

    const createdProducts = await Product.insertMany(productList);
    console.log(`Created ${createdProducts.length} Pepsi products`);

    // 6. Create Initial Inward Purchase (Pepsi Company -> Warehouse)
    for (const prod of createdProducts) {
      const stockInwardQty = prod.minStock * 5; // Generous initial warehouse stock
      await recordLedgerTransaction({
        product: prod._id,
        quantity: stockInwardQty,
        sourceType: 'Supplier',
        sourceId: supplier._id,
        sourceRefModel: 'Supplier',
        destType: 'Warehouse',
        transactionType: 'Supplier_Inward',
        unitPrice: prod.purchasePrice,
        user: adminUser._id,
        remarks: 'Initial Pepsi Stock Inward Batch #PEP-2026-001'
      });
    }

    // 7. Load Stock into Vehicle 1 (Warehouse -> Van 1)
    const loadItems = [
      { prod: createdProducts[0], qty: 120 }, // Pepsi 250ml
      { prod: createdProducts[1], qty: 72 },  // Pepsi 500ml
      { prod: createdProducts[3], qty: 96 },  // 7UP 250ml
      { prod: createdProducts[4], qty: 48 },  // Mirinda
      { prod: createdProducts[6], qty: 150 }  // Sting
    ];

    for (const item of loadItems) {
      await recordLedgerTransaction({
        product: item.prod._id,
        quantity: item.qty,
        sourceType: 'Warehouse',
        destType: 'Vehicle',
        destId: vehicle1._id,
        destRefModel: 'Vehicle',
        transactionType: 'Warehouse_To_Vehicle',
        unitPrice: item.prod.purchasePrice,
        user: adminUser._id,
        remarks: `Van Loading for Morning Route - Driver ${vehicle1.driverName}`
      });
    }

    // 8. Create Customers
    const customer1 = await Customer.create({
      shopName: 'Krishna General Store & Cold Drinks',
      ownerName: 'Krishna Kant',
      phone: '+91 98200 12345',
      whatsapp: '+91 98200 12345',
      address: 'Shop 12, Station Road, Malad West, Mumbai',
      gstNumber: '27ABCDE1234F1Z9',
      creditLimit: 50000,
      outstandingBalance: 3200
    });

    const customer2 = await Customer.create({
      shopName: 'A1 Super Market & Snacks',
      ownerName: 'Aslam Khan',
      phone: '+91 98333 44556',
      whatsapp: '+91 98333 44556',
      address: 'Near Cinema Hall, Andheri East, Mumbai',
      gstNumber: '27FGHIJ5678K1Z3',
      creditLimit: 75000,
      outstandingBalance: 0
    });

    console.log('Pepsi Distribution Database successfully seeded with full sample data!');
  } catch (error) {
    console.error('Seeding error:', error.message);
  }
};

module.exports = seedDatabase;

if (require.main === module) {
  const connectDB = require('../config/db');
  dotenv = require('dotenv');
  dotenv.config();
  connectDB().then(async () => {
    await seedDatabase();
    process.exit();
  });
}
