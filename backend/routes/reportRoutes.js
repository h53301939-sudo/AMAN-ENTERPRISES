const express = require('express');
const router = express.Router();
const { getDashboardStats, getHistoricalAnalytics, getAnalyticsCharts, exportToExcel } = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/historical', protect, admin, getHistoricalAnalytics);
router.get('/analytics', protect, getAnalyticsCharts);
router.get('/export-excel', protect, admin, exportToExcel);

module.exports = router;
