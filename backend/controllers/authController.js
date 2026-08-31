const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { logActivity } = require('../utils/logActivity');

// Email regex pattern (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 30 Minutes Strict JWT Session Expiry
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pepsi_super_secret_jwt_key_2026', {
    expiresIn: '30m', // Strictly 30 Minutes
  });
};

// @desc    Auth user & get token with server-side validation & rate-limiting
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 1. Server-side Type & Presence Validation (Do not rely on client-side)
  if (typeof email !== 'string' || typeof password !== 'string') {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Invalid input format. Email and password must be text strings.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Please enter your email address' });
  }

  if (!cleanPassword) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Please enter your password' });
  }

  // 2. Server-side Email Format Validation
  if (!EMAIL_REGEX.test(cleanEmail)) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  // 3. Server-side Password Length Validation
  if (cleanPassword.length < 4 || cleanPassword.length > 128) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Password must be between 4 and 128 characters long' });
  }

  // Check if database has any users. If completely empty, auto-seed default admin & worker
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('Zero users in database. Creating default admin & worker on demand...');
    await User.create({
      name: 'Rajesh Sharma (Admin)',
      email: 'admin@pepsi.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91 99887 76655',
      active: true
    });
    await User.create({
      name: 'Ramesh Kumar (Salesman)',
      email: 'worker@pepsi.com',
      password: 'worker123',
      role: 'worker',
      phone: '+91 98765 11111',
      active: true
    });
  }

  // 4. Safe Query (Exact match, prevents NoSQL injection)
  const user = await User.findOne({ email: cleanEmail }).populate('assignedVehicle');

  if (user && (await user.matchPassword(cleanPassword))) {
    if (!user.active) {
      if (res.recordFailedAttempt) res.recordFailedAttempt();
      return res.status(401).json({ message: 'Your account has been blocked. Please contact admin.' });
    }

    // Reset failed login counter on success
    if (res.recordSuccessfulLogin) res.recordSuccessfulLogin();

    await logActivity({ req, user, action: 'User Login', details: `User ${user.name} (${user.role}) logged in successfully` });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      assignedVehicle: user.assignedVehicle,
      token: generateToken(user._id),
      sessionDuration: '30m'
    });
  } else {
    // Record failed attempt for rate-limiting
    if (res.recordFailedAttempt) res.recordFailedAttempt();

    await logActivity({
      req,
      user: null,
      action: 'Failed Login Attempt',
      details: `Failed login attempt for email: ${cleanEmail} from IP: ${req.ip || 'Unknown'}`
    });

    return res.status(401).json({ message: 'Invalid email address or password. Please try again.' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('assignedVehicle');
  res.json(user);
};

const Sale = require('../models/Sale');
const Payment = require('../models/Payment');

// @desc    Get all workers with today's shift collections summary
// @route   GET /api/auth/workers
const getWorkers = async (req, res) => {
  const workers = await User.find({ role: 'worker' }).select('-password').populate('assignedVehicle');

  // Compute Today's Date bounds (local midnight)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const workersWithSummary = await Promise.all(
    workers.map(async (w) => {
      const wObj = w.toObject();

      // Today's Sales strictly billed by this worker
      const todaySales = await Sale.find({
        worker: w._id,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      // Today's Credit / Udhaar Collections
      const todayCollections = await Payment.find({
        receivedBy: w._id,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      let todaySalesGross = 0;
      let todayCases = 0;
      let todaySalesCash = 0;
      let todaySalesUpi = 0;
      let todayCreditGiven = 0;

      todaySales.forEach((s) => {
        const netAmt = Number(s.netTotal !== undefined ? s.netTotal : ((Number(s.paidAmount || 0) + Number(s.dueAmount || 0)) || s.subTotal || 0));
        todaySalesGross += netAmt;
        (s.items || []).forEach(item => {
          todayCases += Number(item.quantity || 0);
        });
        todaySalesCash += Number(s.cashAmount || (s.paymentMethod === 'Cash' ? (s.paidAmount || netAmt) : 0) || 0);
        todaySalesUpi += Number(s.upiAmount || (s.paymentMethod === 'UPI' ? (s.paidAmount || netAmt) : 0) || 0);
        todayCreditGiven += Number(s.dueAmount || 0);
      });

      let todayCreditCollectedCash = 0;
      let todayCreditCollectedUpi = 0;
      let todayCreditCollectedTotal = 0;

      todayCollections.forEach((p) => {
        todayCreditCollectedCash += Number(p.cashAmount || (p.paymentMethod === 'Cash' ? p.amount : 0) || 0);
        todayCreditCollectedUpi += Number(p.upiAmount || (p.paymentMethod === 'UPI' ? p.amount : 0) || 0);
        todayCreditCollectedTotal += Number(p.amount || 0);
      });

      const todayCashInHand = todaySalesCash + todayCreditCollectedCash;
      const todayUpiDirect = todaySalesUpi + todayCreditCollectedUpi;
      const todayTotalCollected = todayCashInHand + todayUpiDirect;

      wObj.todayShiftSummary = {
        todaySalesGross,
        todayCases,
        todayCashInHand,
        todayUpiDirect,
        todayCreditCollectedCash,
        todayCreditCollectedUpi,
        todayCreditCollectedTotal,
        todayCreditGiven,
        todayTotalCollected,
        salesCount: todaySales.length,
        collectionsCount: todayCollections.length
      };

      return wObj;
    })
  );

  res.json(workersWithSummary);
};

// @desc    Create new worker
// @route   POST /api/auth/workers
const createWorker = async (req, res) => {
  const { name, email, password, phone, assignedVehicle } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ message: 'Please provide a valid worker email address' });
  }

  const userExists = await User.findOne({ email: cleanEmail });
  if (userExists) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  const worker = new User({
    name: name.trim(),
    email: cleanEmail,
    password: password.trim(),
    phone: phone ? phone.trim() : '',
    role: 'worker',
    assignedVehicle: assignedVehicle || null
  });

  await worker.save();

  if (assignedVehicle) {
    await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedWorker: worker._id });
  }

  await logActivity({ req, user: req.user, action: 'Create Worker', details: `Created worker ${name} (${cleanEmail})` });

  res.status(201).json(worker);
};

// @desc    Update worker
// @route   PUT /api/auth/workers/:id
const updateWorker = async (req, res) => {
  const worker = await User.findById(req.params.id);

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  worker.name = req.body.name ? req.body.name.trim() : worker.name;
  if (req.body.email) worker.email = req.body.email.trim().toLowerCase();
  if (req.body.phone !== undefined) worker.phone = req.body.phone ? req.body.phone.trim() : '';
  if (req.body.active !== undefined) worker.active = req.body.active;
  if (req.body.assignedVehicle !== undefined) {
    worker.assignedVehicle = req.body.assignedVehicle || null;
  }
  if (req.body.password && req.body.password.trim()) {
    worker.password = req.body.password.trim();
  }

  const updatedWorker = await worker.save();

  if (req.body.assignedVehicle) {
    await Vehicle.findByIdAndUpdate(req.body.assignedVehicle, { assignedWorker: worker._id });
  }

  await logActivity({ req, user: req.user, action: 'Update Worker', details: `Updated worker ${worker.name}` });

  res.json(updatedWorker);
};

// @desc    Get detailed worker profile with lifetime analytics & credit collections
// @route   GET /api/auth/workers/:id/profile
const getWorkerProfile = async (req, res) => {
  const worker = await User.findById(req.params.id).select('-password').populate('assignedVehicle');

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  // Authorization: Only Admin or the worker themselves can view profile
  if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id.toString()) {
    return res.status(403).json({ message: 'Not authorized to view this worker profile' });
  }

  // Compute Today's Date bounds (local midnight)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Fetch all sales made strictly by this worker
  const sales = await Sale.find({ worker: worker._id })
    .populate('customer', 'shopName ownerName phone address')
    .populate('items.product', 'name purchasePrice costPrice size currentStock')
    .sort({ createdAt: -1 });

  // Fetch all credit payments collected by this worker
  const payments = await Payment.find({ receivedBy: worker._id })
    .populate('customer', 'shopName ownerName phone address')
    .sort({ createdAt: -1 });

  let lifetimeSales = 0;
  let lifetimeProfit = 0;
  let totalCasesSold = 0;
  let lifetimeSalesCash = 0;
  let lifetimeSalesUpi = 0;
  let lifetimeCreditGiven = 0;

  let todaySalesTotal = 0;
  let todayProfitTotal = 0;
  let todayCasesSold = 0;
  let todaySalesCash = 0;
  let todaySalesUpi = 0;
  let todayCreditGiven = 0;
  const todaySalesList = [];

  sales.forEach((sale) => {
    const netAmt = Number(sale.netTotal || 0);
    lifetimeSales += netAmt;

    const sCash = Number(sale.cashAmount || (sale.paymentMethod === 'Cash' ? sale.paidAmount : 0) || 0);
    const sUpi = Number(sale.upiAmount || (sale.paymentMethod === 'UPI' ? sale.paidAmount : 0) || 0);
    const sDue = Number(sale.dueAmount || 0);

    lifetimeSalesCash += sCash;
    lifetimeSalesUpi += sUpi;
    lifetimeCreditGiven += sDue;

    let saleCost = 0;
    (sale.items || []).forEach((item) => {
      const qty = item.quantity || 0;
      totalCasesSold += qty;
      const unitCost = (item.product && (item.product.purchasePrice || item.product.costPrice)) || 0;
      saleCost += (qty * unitCost);
    });

    const saleProfit = netAmt - saleCost;
    lifetimeProfit += saleProfit;

    const saleDate = new Date(sale.createdAt);
    if (saleDate >= todayStart && saleDate <= todayEnd) {
      todaySalesTotal += netAmt;
      todayProfitTotal += saleProfit;
      todayCasesSold += (sale.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
      todaySalesCash += sCash;
      todaySalesUpi += sUpi;
      todayCreditGiven += sDue;
      todaySalesList.push(sale);
    }
  });

  let lifetimeCreditCollectedCash = 0;
  let lifetimeCreditCollectedUpi = 0;
  let lifetimeCreditCollectedTotal = 0;

  let todayCreditCollectedCash = 0;
  let todayCreditCollectedUpi = 0;
  let todayCreditCollectedTotal = 0;
  const todayCollectionsList = [];

  payments.forEach((p) => {
    const pAmt = Number(p.amount || 0);
    const pCash = Number(p.cashAmount || (p.paymentMethod === 'Cash' ? pAmt : 0) || 0);
    const pUpi = Number(p.upiAmount || (p.paymentMethod === 'UPI' ? pAmt : 0) || 0);

    lifetimeCreditCollectedCash += pCash;
    lifetimeCreditCollectedUpi += pUpi;
    lifetimeCreditCollectedTotal += pAmt;

    const pDate = new Date(p.createdAt);
    if (pDate >= todayStart && pDate <= todayEnd) {
      todayCreditCollectedCash += pCash;
      todayCreditCollectedUpi += pUpi;
      todayCreditCollectedTotal += pAmt;
      todayCollectionsList.push(p);
    }
  });

  const todayCashInHand = todaySalesCash + todayCreditCollectedCash;
  const todayUpiDirect = todaySalesUpi + todayCreditCollectedUpi;
  const todayTotalCollected = todayCashInHand + todayUpiDirect;

  const lifetimeCashCollected = lifetimeSalesCash + lifetimeCreditCollectedCash;
  const lifetimeUpiCollected = lifetimeSalesUpi + lifetimeCreditCollectedUpi;
  const lifetimeTotalCollected = lifetimeCashCollected + lifetimeUpiCollected;

  res.json({
    worker,
    todayAnalytics: {
      sales: todaySalesTotal,
      profit: todayProfitTotal,
      cases: todayCasesSold,
      invoicesCount: todaySalesList.length,
      cashInHand: todayCashInHand,
      salesCash: todaySalesCash,
      creditCash: todayCreditCollectedCash,
      upiDirect: todayUpiDirect,
      salesUpi: todaySalesUpi,
      creditUpi: todayCreditCollectedUpi,
      creditRecovered: todayCreditCollectedTotal,
      creditGiven: todayCreditGiven,
      totalCollected: todayTotalCollected,
      collectionsCount: todayCollectionsList.length
    },
    lifetimeAnalytics: {
      sales: lifetimeSales,
      salesCash: lifetimeSalesCash,
      salesUpi: lifetimeSalesUpi,
      profit: lifetimeProfit,
      cases: totalCasesSold,
      invoicesCount: sales.length,
      cashCollected: lifetimeCashCollected,
      upiCollected: lifetimeUpiCollected,
      creditRecovered: lifetimeCreditCollectedTotal,
      creditGiven: lifetimeCreditGiven,
      totalCollected: lifetimeTotalCollected,
      collectionsCount: payments.length,
      averageOrderValue: sales.length > 0 ? Math.round(lifetimeSales / sales.length) : 0,
      profitMargin: lifetimeSales > 0 ? ((lifetimeProfit / lifetimeSales) * 100).toFixed(1) : '0'
    },
    todaySales: todaySalesList,
    allSales: sales,
    todayCollections: todayCollectionsList,
    allCollections: payments
  });
};

// @desc    Toggle worker status (Block / Unblock)
// @route   PUT /api/auth/workers/:id/toggle-status
const toggleWorkerStatus = async (req, res) => {
  const worker = await User.findById(req.params.id);

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  if (worker.role === 'admin') {
    return res.status(400).json({ message: 'Cannot block administrator accounts' });
  }

  worker.active = !worker.active;
  await worker.save();

  const actionText = worker.active ? 'Unblocked Worker' : 'Blocked Worker';
  await logActivity({
    req,
    user: req.user,
    action: actionText,
    details: `${actionText}: ${worker.name} (${worker.email})`
  });

  res.json({
    message: `Worker account ${worker.active ? 'unblocked and activated' : 'blocked and deactivated'} successfully`,
    worker
  });
};

// @desc    Delete worker
// @route   DELETE /api/auth/workers/:id
const deleteWorker = async (req, res) => {
  const worker = await User.findById(req.params.id);

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  await User.findByIdAndDelete(req.params.id);
  await logActivity({ req, user: req.user, action: 'Delete Worker', details: `Deleted worker ${worker.name}` });

  res.json({ message: 'Worker removed successfully' });
};

module.exports = {
  loginUser,
  getMe,
  getWorkers,
  getWorkerProfile,
  toggleWorkerStatus,
  createWorker,
  updateWorker,
  deleteWorker,
};
