const express = require('express');
const router = express.Router();
const { getLedgerTransactions } = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getLedgerTransactions);

module.exports = router;
