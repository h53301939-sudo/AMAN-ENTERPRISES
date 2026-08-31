const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const VehicleStock = require('../models/VehicleStock');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');
const { logActivity } = require('../utils/logActivity');
const { sendInvoicePdfDirect, getStatus: getWhatsAppStatus } = require('../services/whatsappService');

// @desc    Process Van Sale POS or Direct Warehouse Counter Sale Transaction & Generate Invoice
// @route   POST /api/sales
const createSale = async (req, res) => {
  try {
    const {
      vehicleId,
      customerId,
      items, // [{ product, quantity, unitPrice }]
      discount, // Discount amount in ₹
      paymentMethod, // 'Cash', 'UPI', 'Credit'
      paidAmount,
      dueDate
    } = req.body;

    if (!vehicleId || !customerId || !items || !items.length) {
      return res.status(400).json({ message: 'Missing vehicle/warehouse selection, customer, or items' });
    }

    const isDirectWarehouse = vehicleId === 'warehouse_direct' || vehicleId === 'direct';

    let vehicle = null;
    if (!isDirectWarehouse) {
      vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) return res.status(404).json({ message: 'Selected vehicle not found' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Validate stock & prices
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found` });

      const unitType = (item.unitType || 'Box').toLowerCase() === 'hanger' ? 'Hanger' : 'Box';
      const effectivePrice = unitType === 'Hanger' 
        ? (product.hangerPrice || (product.boxPrice / (product.hangersPerBox || 24)))
        : (product.boxPrice || product.sellingPrice);

      if (!effectivePrice || Number(effectivePrice) <= 0) {
        return res.status(400).json({
          message: `⛔ Sale Blocked: ${unitType} Price for "${product.name}" is not set!`
        });
      }

      if (isDirectWarehouse) {
        const hangersPerBox = Number(product.hangersPerBox || 24);
        const availHangers = (Number(product.sealedBoxStock || 0) * hangersPerBox) + Number(product.looseHangerStock || 0);
        const reqHangers = unitType === 'Hanger' ? item.quantity : (item.quantity * hangersPerBox);

        if (availHangers < reqHangers) {
          return res.status(400).json({
            message: `Insufficient warehouse stock for ${product.name}. Available: ${product.sealedBoxStock || 0} Boxes (${product.looseHangerStock || 0} Loose Hangers), Sale Request: ${item.quantity} ${unitType}s`
          });
        }
      } else {
        const vStock = await VehicleStock.findOne({ vehicle: vehicleId, product: item.product });
        const availQty = vStock ? vStock.quantity : 0;
        if (availQty < item.quantity) {
          return res.status(400).json({
            message: `Insufficient vehicle stock for ${product.name}. On Van: ${availQty} Boxes, Sale Qty: ${item.quantity} ${unitType}s`
          });
        }
      }
    }

    // Calculate Subtotal, Discount, Gross Profit & Net Profit
    let subTotal = 0;
    let totalGrossProfit = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      const unitType = (item.unitType || 'Box').toLowerCase() === 'hanger' ? 'Hanger' : 'Box';
      const hangersPerBox = Number(product.hangersPerBox || 24);

      // Cost price per unit (Box cost or Hanger cost)
      const boxCostPrice = Number(product.purchasePrice || 0);
      const unitCostPrice = unitType === 'Hanger'
        ? (hangersPerBox > 0 ? Number((boxCostPrice / hangersPerBox).toFixed(4)) : 0)
        : boxCostPrice;

      const defaultUnitPrice = unitType === 'Hanger'
        ? (product.hangerPrice || Number((product.boxPrice / hangersPerBox).toFixed(2)))
        : (product.boxPrice || product.sellingPrice);

      const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : defaultUnitPrice);
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      const lineCost = Number((unitCostPrice * item.quantity).toFixed(2));
      const lineProfit = Number((lineTotal - lineCost).toFixed(2));

      subTotal += lineTotal;
      totalGrossProfit += lineProfit;

      processedItems.push({
        product: product._id,
        productName: product.name,
        unitType,
        size: unitType,
        quantity: item.quantity,
        unitPrice,
        purchasePrice: unitCostPrice,
        totalAmount: lineTotal,
        profit: lineProfit
      });
    }

    const discountAmount = Math.max(0, Number(discount || 0));
    const netTotal = Math.max(0, Math.round(subTotal - discountAmount));
    const grossProfit = Number(totalGrossProfit.toFixed(2));
    const netProfit = Number(Math.max(0, grossProfit - discountAmount).toFixed(2));

    let actualPaid = netTotal;
    let cashAmount = 0;
    let upiAmount = 0;

    if (paymentMethod === 'Credit') {
      cashAmount = Math.max(0, Number(req.body.cashAmount || 0));
      upiAmount = Math.max(0, Number(req.body.upiAmount || 0));
      actualPaid = cashAmount + upiAmount;
      if (actualPaid === 0 && paidAmount) {
        actualPaid = Number(paidAmount || 0);
        cashAmount = actualPaid;
      }
    } else if (paymentMethod === 'Split') {
      cashAmount = Math.max(0, Number(req.body.cashAmount || 0));
      upiAmount = Math.max(0, Number(req.body.upiAmount || 0));
      actualPaid = cashAmount + upiAmount;
    } else if (paymentMethod === 'Cash') {
      actualPaid = netTotal;
      cashAmount = netTotal;
    } else if (paymentMethod === 'UPI') {
      actualPaid = netTotal;
      upiAmount = netTotal;
    }

    const dueAmount = Math.max(0, netTotal - actualPaid);

    // ACTIVE CREDIT LIMIT ENFORCEMENT Check
    if (dueAmount > 0) {
      const creditLimit = Number(customer.creditLimit !== undefined ? customer.creditLimit : 5000);
      const currentDue = Number(customer.outstandingBalance || 0);
      const prospectiveTotalDue = currentDue + dueAmount;
      if (prospectiveTotalDue > creditLimit) {
        return res.status(400).json({
          message: `⛔ Credit Limit Exceeded! Customer "${customer.shopName}" has outstanding balance ₹${currentDue.toLocaleString()} + current due ₹${dueAmount.toLocaleString()} = ₹${prospectiveTotalDue.toLocaleString()} (Limit: ₹${creditLimit.toLocaleString()}). Please collect payment before completing sale.`
        });
      }
    }

    // Auto-generate Unique Invoice Number with format BAL-YYYYMMDD-101
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Find highest invoice sequence today
    let counter = 101;
    const latestSaleToday = await Sale.findOne({
      invoiceNumber: new RegExp(`^BAL-${dateStr}-`)
    }).sort({ createdAt: -1, _id: -1 });

    if (latestSaleToday && latestSaleToday.invoiceNumber) {
      const parts = latestSaleToday.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        counter = Math.max(counter, lastSeq + 1);
      }
    }

    let invoiceNumber = `BAL-${dateStr}-${counter}`;
    while (await Sale.exists({ invoiceNumber })) {
      counter++;
      invoiceNumber = `BAL-${dateStr}-${counter}`;
    }

    // Create Sale Record
    const sale = new Sale({
      invoiceNumber,
      worker: req.user._id,
      vehicle: isDirectWarehouse ? null : vehicleId,
      customer: customerId,
      items: processedItems,
      subTotal,
      discount: discountAmount,
      netTotal,
      grossProfit,
      netProfit,
      paymentMethod,
      cashAmount,
      upiAmount,
      paidAmount: actualPaid,
      dueAmount,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: dueAmount <= 0 ? 'Paid' : (actualPaid > 0 ? 'Partial' : 'Unpaid')
    });

    // Save sale with duplicate key collision auto-resolver
    let savedSuccessfully = false;
    let attempts = 0;
    while (!savedSuccessfully && attempts < 5) {
      try {
        await sale.save();
        savedSuccessfully = true;
      } catch (saveErr) {
        if (saveErr.code === 11000 && (saveErr.keyPattern?.invoiceNumber || (saveErr.message && saveErr.message.includes('invoiceNumber')))) {
          attempts++;
          counter++;
          invoiceNumber = `BAL-${dateStr}-${counter}`;
          sale.invoiceNumber = invoiceNumber;
        } else {
          throw saveErr;
        }
      }
    }

    // Update Customer Credit / Outstanding Balance if Credit sale
    if (dueAmount > 0) {
      customer.outstandingBalance += dueAmount;
      await customer.save();
    }

    // Record Stock Ledger Transactions & Deduct Inventory
    for (const item of processedItems) {
      if (isDirectWarehouse) {
        await recordLedgerTransaction({
          product: item.product,
          quantity: item.quantity,
          unitType: item.unitType,
          sourceType: 'Warehouse',
          destType: 'Customer',
          destId: customerId,
          destRefModel: 'Customer',
          transactionType: 'Warehouse_To_Customer',
          unitPrice: item.unitPrice,
          user: req.user._id,
          remarks: `Direct Warehouse Counter Sale Invoice #${invoiceNumber}`
        });
      } else {
        await recordLedgerTransaction({
          product: item.product,
          quantity: item.quantity,
          unitType: item.unitType,
          sourceType: 'Vehicle',
          sourceId: vehicleId,
          sourceRefModel: 'Vehicle',
          destType: 'Customer',
          destId: customerId,
          destRefModel: 'Customer',
          transactionType: 'Vehicle_To_Customer',
          unitPrice: item.unitPrice,
          user: req.user._id,
          remarks: `Van Sale POS Invoice #${invoiceNumber}`
        });
      }
    }

    await logActivity({
      req,
      user: req.user,
      action: isDirectWarehouse ? 'Direct Warehouse Counter Sale' : 'Van Sale Invoice Generated',
      details: `Generated Invoice #${invoiceNumber} for ${customer.shopName} total ₹${netTotal} (Disc: ₹${discountAmount}, ${paymentMethod})`
    });

    const populatedSale = await Sale.findById(sale._id)
      .populate('customer')
      .populate('worker', 'name phone')
      .populate('vehicle', 'vehicleNumber vehicleName')
      .populate('items.product');

    // Check WhatsApp Gateway status and auto-deliver if connected
    let whatsappDelivery = { status: 'not_connected', message: 'WhatsApp not connected' };
    const waStatus = getWhatsAppStatus();

    if (!customer.phone) {
      whatsappDelivery = {
        status: 'no_phone',
        message: 'No mobile number registered for this customer'
      };
    } else if (waStatus && waStatus.isReady) {
      sendInvoicePdfDirect(customer.phone, populatedSale)
        .then(() => console.log(`✅ [Auto-WhatsApp] PDF Invoice #${invoiceNumber} delivered to +${customer.phone}`))
        .catch(err => console.error('Auto-WhatsApp sending error:', err.message));
      whatsappDelivery = {
        status: 'sent',
        message: `Bill sent successfully to ${customer.phone}`
      };
    } else {
      whatsappDelivery = {
        status: 'not_connected',
        message: 'WhatsApp not connected (Connect in Settings)'
      };
    }

    const responseData = populatedSale.toObject ? populatedSale.toObject() : populatedSale;
    responseData.whatsappDelivery = whatsappDelivery;

    res.status(201).json(responseData);
  } catch (err) {
    console.error('Error creating sale:', err);
    res.status(500).json({ message: err.message || 'Failed to create sale' });
  }
};

// @desc    Get Sales history with filtering
// @route   GET /api/sales
const getSales = async (req, res) => {
  const { startDate, endDate, customerId, workerId, paymentMethod, search } = req.query;
  let query = {};

  if (req.user.role === 'worker') {
    query.worker = req.user._id;
  } else if (workerId) {
    query.worker = workerId;
  }

  if (customerId) query.customer = customerId;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  if (search) {
    query.invoiceNumber = { $regex: search, $options: 'i' };
  }

  const sales = await Sale.find(query)
    .populate('customer', 'shopName ownerName phone address')
    .populate('worker', 'name')
    .populate('vehicle', 'vehicleNumber vehicleName')
    .sort({ createdAt: -1 });

  res.json(sales);
};

// @desc    Get sale by ID / Invoice detail
// @route   GET /api/sales/:id
const getSaleById = async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer')
    .populate('worker', 'name phone email')
    .populate('vehicle', 'vehicleNumber vehicleName driverName')
    .populate('items.product');

  if (!sale) return res.status(404).json({ message: 'Sale invoice not found' });
  res.json(sale);
};

// @desc    Get PDF Invoice stream for Sale
// @route   GET /api/sales/:id/pdf
const getSalePdfById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer')
      .populate('worker', 'name phone email')
      .populate('vehicle', 'vehicleNumber vehicleName driverName')
      .populate('items.product');

    if (!sale) return res.status(404).json({ message: 'Sale invoice not found' });
    const { streamInvoicePdf } = require('../utils/pdfGenerator');
    streamInvoicePdf(sale, res);
  } catch (err) {
    console.error('Error streaming PDF:', err);
    res.status(500).json({ message: 'Failed to generate PDF invoice' });
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  getSalePdfById
};
