const StockTransaction = require('../models/StockTransaction');

// @desc    Get Stock Transaction Ledger (Filterable & Searchable)
// @route   GET /api/ledger
const getLedgerTransactions = async (req, res) => {
  const { productId, transactionType, sourceType, destType, startDate, endDate, search } = req.query;
  let query = {};

  if (productId) query.product = productId;
  if (transactionType) query.transactionType = transactionType;
  if (sourceType) query.sourceType = sourceType;
  if (destType) query.destType = destType;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  if (search) {
    query.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { remarks: { $regex: search, $options: 'i' } }
    ];
  }

  const transactions = await StockTransaction.find(query)
    .populate('product', 'name sku unit crateQuantity purchasePrice sellingPrice')
    .populate('user', 'name role')
    .populate('sourceId')
    .populate('destId')
    .sort({ createdAt: -1 });

  res.json(transactions);
};

module.exports = { getLedgerTransactions };
