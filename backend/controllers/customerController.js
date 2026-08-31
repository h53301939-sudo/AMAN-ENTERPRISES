const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { logActivity } = require('../utils/logActivity');

// @desc    Get customers (searchable)
// @route   GET /api/customers
const getCustomers = async (req, res) => {
  const { search } = req.query;
  let query = {};

  if (search) {
    query.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const customers = await Customer.find(query).sort({ shopName: 1 });
  res.json(customers);
};

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single customer full 360 profile, all purchases & invoices history
// @route   GET /api/customers/:id/details
const getCustomerDetails = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('dueAdjustments.addedBy', 'name role');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const custId = customer._id;

    // Fetch all sales & invoices made to this customer, fully populated with customer, worker, and vehicle
    const sales = await Sale.find({
      $or: [
        { customer: custId },
        { customer: custId.toString() }
      ]
    })
      .populate('customer', 'shopName ownerName phone address')
      .populate('worker', 'name phone')
      .populate('vehicle', 'vehicleNumber')
      .sort({ createdAt: -1 });

    // Fetch all direct payment collections
    const payments = await Payment.find({
      $or: [
        { customer: custId },
        { customer: custId.toString() }
      ]
    })
      .populate('customer', 'shopName ownerName phone address')
      .populate('receivedBy', 'name')
      .sort({ createdAt: -1 });

    // Calculate aggregated metrics
    let totalLifetimePurchases = 0;
    let totalCasesPurchased = 0;
    let totalSalesPaid = 0;

    sales.forEach(sale => {
      totalLifetimePurchases += Number(sale.netTotal || 0);
      totalSalesPaid += Number(sale.paidAmount || 0);
      if (Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          totalCasesPurchased += Number(item.quantity || 0);
        });
      }
    });

    const totalDirectPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalAmountPaid = totalSalesPaid + totalDirectPayments;

    res.json({
      customer,
      sales,
      payments,
      dueAdjustments: customer.dueAdjustments || [],
      summary: {
        totalLifetimePurchases,
        totalCasesPurchased,
        totalAmountPaid,
        outstandingBalance: customer.outstandingBalance || 0,
        totalInvoices: sales.length,
        totalPayments: payments.length
      }
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
  const { shopName, ownerName, phone, whatsapp, address, gstNumber, creditLimit, discountPercentage, openingBalance } = req.body;

  if (!shopName || !ownerName || !phone) {
    return res.status(400).json({ message: 'Shop name, owner name, and phone are required' });
  }

  const isAdmin = req.user && req.user.role === 'admin';
  const resolvedLimit = isAdmin && creditLimit ? Number(creditLimit) : 5000;
  const resolvedDiscount = isAdmin && discountPercentage ? Number(discountPercentage) : 0;
  const initialDue = isAdmin ? Number(openingBalance || 0) : 0;

  if (initialDue > resolvedLimit) {
    return res.status(400).json({
      message: `⛔ Initial Past Due (₹${initialDue.toLocaleString('en-IN')}) cannot exceed the Credit Limit (₹${resolvedLimit.toLocaleString('en-IN')})!`
    });
  }

  const customer = new Customer({
    shopName,
    ownerName,
    phone,
    whatsapp: whatsapp || phone,
    address,
    gstNumber,
    creditLimit: resolvedLimit,
    discountPercentage: resolvedDiscount,
    outstandingBalance: initialDue > 0 ? initialDue : 0,
    dueAdjustments: initialDue > 0 ? [
      {
        amount: initialDue,
        reason: 'Opening Balance (Initial Past Due)',
        previousBalance: 0,
        newBalance: initialDue,
        addedBy: req.user._id,
        createdAt: new Date()
      }
    ] : []
  });

  await customer.save();
  await logActivity({ req, user: req.user, action: 'Create Customer', details: `Created customer ${shopName} (${ownerName}) with credit limit ₹${resolvedLimit}` });

  res.status(201).json(customer);
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  const isAdmin = req.user && req.user.role === 'admin';

  if (!isAdmin) {
    // Non-admin workers are strictly barred from editing customer credit limit, discount, or balance
    delete req.body.creditLimit;
    delete req.body.discountPercentage;
    delete req.body.outstandingBalance;
    delete req.body.dueAdjustments;
  } else {
    if (req.body.creditLimit !== undefined) {
      const newCreditLimit = Number(req.body.creditLimit);
      const currentBalance = Number(customer.outstandingBalance || 0);
      if (newCreditLimit < currentBalance) {
        return res.status(400).json({
          message: `⛔ Cannot reduce credit limit to ₹${newCreditLimit.toLocaleString('en-IN')} because customer already has ₹${currentBalance.toLocaleString('en-IN')} outstanding due! Please collect payments before lowering credit limit.`
        });
      }
    }
  }

  Object.assign(customer, req.body);
  await customer.save();
  await logActivity({ req, user: req.user, action: 'Update Customer', details: `Updated customer ${customer.shopName}` });

  res.json(customer);
};

// @desc    Record Customer Payment (Collection)
// @route   POST /api/customers/:id/payments
const addCustomerPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, cashAmount, upiAmount, remarks } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ message: 'Invalid payment amount' });

    const validMethods = ['Cash', 'UPI', 'Split', 'Bank Transfer', 'Cheque'];
    const resolvedMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'Cash';

    const previousBalance = Number(customer.outstandingBalance || 0);
    customer.outstandingBalance = Math.max(0, previousBalance - numAmount);
    await customer.save();

    const payment = new Payment({
      customer: customer._id,
      amount: numAmount,
      paymentMethod: resolvedMethod,
      cashAmount: resolvedMethod === 'Split' ? Number(cashAmount || 0) : (resolvedMethod === 'Cash' ? numAmount : 0),
      upiAmount: resolvedMethod === 'Split' ? Number(upiAmount || 0) : (resolvedMethod === 'UPI' ? numAmount : 0),
      receivedBy: req.user._id,
      remarks: remarks || ''
    });
    await payment.save();

    await logActivity({
      req,
      user: req.user,
      action: 'Payment Collection',
      details: `Collected ₹${numAmount} (${resolvedMethod}) from ${customer.shopName}. New Balance: ₹${customer.outstandingBalance}`
    });

    res.json({ message: 'Payment recorded successfully', customer, payment });
  } catch (err) {
    console.error('Error in addCustomerPayment:', err);
    res.status(500).json({ message: err.message || 'Failed to record payment' });
  }
};

// @desc    Add Manual Due / Past Balance to Customer
// @route   POST /api/customers/:id/manual-due
const addManualDue = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Invalid due amount. Must be greater than 0.' });
    }

    const previousBalance = Number(customer.outstandingBalance || 0);
    const creditLimit = Number(customer.creditLimit || 5000);
    const newTotalBalance = previousBalance + numAmount;

    // VALIDATION: Credit Limit Cannot be Exceeded!
    if (newTotalBalance > creditLimit) {
      const availableCredit = Math.max(0, creditLimit - previousBalance);
      return res.status(400).json({
        message: `⛔ Credit Limit Exceeded! Customer "${customer.shopName}" credit limit is ₹${creditLimit.toLocaleString('en-IN')}. Current Due: ₹${previousBalance.toLocaleString('en-IN')}, Adding: ₹${numAmount.toLocaleString('en-IN')}. New Total (₹${newTotalBalance.toLocaleString('en-IN')}) would exceed the limit. Maximum allowed to add right now is ₹${availableCredit.toLocaleString('en-IN')}.`
      });
    }

    customer.outstandingBalance = newTotalBalance;

    const note = reason && reason.trim() ? reason.trim() : 'Manual Due / Past Udhaar Addition';

    if (!customer.dueAdjustments) customer.dueAdjustments = [];
    customer.dueAdjustments.push({
      amount: numAmount,
      reason: note,
      previousBalance,
      newBalance: newTotalBalance,
      addedBy: req.user._id,
      createdAt: new Date()
    });

    await customer.save();

    await logActivity({
      req,
      user: req.user,
      action: 'Add Manual Due',
      details: `Added manual due ₹${numAmount.toLocaleString('en-IN')} to ${customer.shopName} (${note}). Previous: ₹${previousBalance}, New Total: ₹${newTotalBalance}`
    });

    res.json({
      message: `Manual due of ₹${numAmount.toLocaleString('en-IN')} added to ${customer.shopName}`,
      customer,
      addedAmount: numAmount,
      newTotalDue: newTotalBalance
    });
  } catch (err) {
    console.error('Error in addManualDue:', err);
    res.status(500).json({ message: err.message || 'Failed to add manual due' });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  await Customer.findByIdAndDelete(req.params.id);
  await logActivity({ req, user: req.user, action: 'Delete Customer', details: `Deleted customer ${customer.shopName}` });

  res.json({ message: 'Customer removed' });
};

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerDetails,
  createCustomer,
  updateCustomer,
  addCustomerPayment,
  addManualDue,
  deleteCustomer
};
