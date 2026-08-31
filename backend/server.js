const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { securityHeaders } = require('./middleware/securityHeaders');

dotenv.config();

const app = express();

// Apply security HTTP headers (XSS, Clickjacking, MIME sniff defense)
app.use(securityHeaders);

// Connect to Database (with zero-setup MemoryServer fallback)
connectDB().then(async () => {
  // Ensure Admin user always exists so you are never locked out
  const User = require('./models/User');
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount === 0) {
    console.log('No Admin user found! Auto-creating default Admin account...');
    await User.create({
      name: 'Rajesh Sharma (Admin)',
      email: 'admin@pepsi.com',
      password: 'admin123',
      role: 'admin',
      active: true
    });
    console.log('✅ Admin account restored: admin@pepsi.com / admin123');
  }
});

// Configure CORS using FRONTEND_URL env variable
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'https://pepsi-flame.vercel.app'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman or server-to-server) or listed origins
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV === 'development'
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/warehouse', require('./routes/warehouseRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/loading', require('./routes/loadingRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/returns', require('./routes/returnRoutes'));
app.use('/api/damages', require('./routes/damageRoutes'));
app.use('/api/ledger', require('./routes/ledgerRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/activity-logs', require('./routes/activityLogRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/targets', require('./routes/targetRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/customer-orders', require('./routes/customerOrderRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', system: 'Pepsi Warehouse & Van Sales Management API', time: new Date() });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Pepsi Distribution Server running on port ${PORT}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
