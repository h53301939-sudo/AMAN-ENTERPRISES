const StockTransaction = require('../models/StockTransaction');
const Product = require('../models/Product');
const VehicleStock = require('../models/VehicleStock');

/**
 * Record a stock transaction in the immutable Stock Ledger and adjust inventory balances atomically.
 */
const recordLedgerTransaction = async ({
  product,
  quantity,
  unitType = 'Box',
  sourceType,
  sourceId = null,
  sourceRefModel = null,
  destType,
  destId = null,
  destRefModel = null,
  transactionType,
  unitPrice = 0,
  user,
  remarks = ''
}) => {
  const numericQty = Number(quantity || 0);
  if (!product || isNaN(numericQty) || numericQty === 0) {
    throw new Error('Invalid product or quantity for stock transaction');
  }
  if (transactionType !== 'Stock_Adjustment' && numericQty < 0) {
    throw new Error('Quantity must be greater than 0');
  }

  const transactionId = 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const totalValue = numericQty * Number(unitPrice || 0);

  // 1. Create StockTransaction Ledger Entry
  const transaction = new StockTransaction({
    transactionId,
    product,
    quantity: numericQty,
    sourceType,
    sourceId,
    sourceRefModel,
    destType,
    destId,
    destRefModel,
    transactionType,
    unitPrice: Number(unitPrice || 0),
    totalValue,
    user,
    remarks: `${remarks}${unitType ? ` [Unit: ${unitType}]` : ''}`
  });

  await transaction.save();

  // 2. Adjust Stock Balances atomically
  const targetProduct = await Product.findById(product);
  if (!targetProduct) {
    throw new Error(`Product not found: ${product}`);
  }

  const normalizedUnit = (unitType || 'Box').toLowerCase();

  switch (transactionType) {
    case 'Supplier_Inward':
      // Increase Warehouse Sealed Box Stock
      targetProduct.sealedBoxStock = Number(targetProduct.sealedBoxStock || 0) + numericQty;
      targetProduct.warehouseStock = targetProduct.sealedBoxStock;
      await targetProduct.save();
      break;

    case 'Warehouse_To_Vehicle':
      // Check available warehouse stock
      if (Number(targetProduct.sealedBoxStock || 0) < numericQty) {
        throw new Error(`Insufficient warehouse stock for ${targetProduct.name}. Available: ${targetProduct.sealedBoxStock} Boxes, Requested: ${numericQty}`);
      }
      targetProduct.sealedBoxStock = Number(targetProduct.sealedBoxStock || 0) - numericQty;
      targetProduct.warehouseStock = targetProduct.sealedBoxStock;
      await targetProduct.save();

      // Atomic Increase of Vehicle Stock in MongoDB
      if (destId) {
        await VehicleStock.findOneAndUpdate(
          { vehicle: destId, product: targetProduct._id },
          { $inc: { quantity: numericQty } },
          { new: true, upsert: true }
        );
      }
      break;

    case 'Warehouse_To_Customer':
      if (normalizedUnit === 'hanger') {
        // Selling Hangers
        const hangersPerBox = Number(targetProduct.hangersPerBox || 24);
        let currentLoose = Number(targetProduct.looseHangerStock || 0);
        let currentSealed = Number(targetProduct.sealedBoxStock || 0);

        // Auto-open sealed boxes if loose hangers are insufficient
        while (currentLoose < numericQty) {
          if (currentSealed <= 0) {
            throw new Error(`Insufficient stock for ${targetProduct.name}. Cannot fulfill ${numericQty} Hangers.`);
          }
          currentSealed -= 1;
          currentLoose += hangersPerBox;
        }

        currentLoose -= numericQty;
        targetProduct.sealedBoxStock = currentSealed;
        targetProduct.warehouseStock = currentSealed;
        targetProduct.looseHangerStock = currentLoose;
        await targetProduct.save();
      } else {
        // Selling Complete Box
        let currentSealed = Number(targetProduct.sealedBoxStock || 0);
        if (currentSealed < numericQty) {
          throw new Error(`Insufficient sealed boxes for ${targetProduct.name}. Available: ${currentSealed} Boxes, Requested: ${numericQty} Boxes`);
        }
        currentSealed -= numericQty;
        targetProduct.sealedBoxStock = currentSealed;
        targetProduct.warehouseStock = currentSealed;
        await targetProduct.save();
      }
      break;

    case 'Vehicle_To_Customer':
      // Atomic Decrease of Vehicle Stock
      if (sourceId) {
        const vStock = await VehicleStock.findOne({ vehicle: sourceId, product: targetProduct._id });
        const currentQty = vStock ? Number(vStock.quantity || 0) : 0;
        if (!vStock || currentQty < numericQty) {
          throw new Error(`Insufficient vehicle stock for ${targetProduct.name}. Available on Van: ${currentQty}, Requested: ${numericQty}`);
        }
        await VehicleStock.findOneAndUpdate(
          { vehicle: sourceId, product: targetProduct._id },
          { $inc: { quantity: -numericQty } },
          { new: true }
        );
      }
      break;

    case 'Vehicle_To_Warehouse':
      // Decrease Vehicle Stock, Increase Warehouse Stock
      if (sourceId) {
        const vStock = await VehicleStock.findOne({ vehicle: sourceId, product: targetProduct._id });
        const currentQty = vStock ? Number(vStock.quantity || 0) : 0;
        if (!vStock || currentQty < numericQty) {
          throw new Error(`Insufficient vehicle stock to return for ${targetProduct.name}. Available: ${currentQty}, Attempted Return: ${numericQty}`);
        }
        await VehicleStock.findOneAndUpdate(
          { vehicle: sourceId, product: targetProduct._id },
          { $inc: { quantity: -numericQty } },
          { new: true }
        );
      }
      targetProduct.sealedBoxStock = Number(targetProduct.sealedBoxStock || 0) + numericQty;
      targetProduct.warehouseStock = targetProduct.sealedBoxStock;
      await targetProduct.save();
      break;

    case 'Warehouse_Damage':
      if (Number(targetProduct.sealedBoxStock || 0) < numericQty) {
        throw new Error(`Insufficient warehouse stock for damage log on ${targetProduct.name}. Available: ${targetProduct.sealedBoxStock}`);
      }
      targetProduct.sealedBoxStock = Number(targetProduct.sealedBoxStock || 0) - numericQty;
      targetProduct.warehouseStock = targetProduct.sealedBoxStock;
      await targetProduct.save();
      break;

    case 'Vehicle_Damage':
      if (sourceId) {
        const vStock = await VehicleStock.findOne({ vehicle: sourceId, product: targetProduct._id });
        const currentQty = vStock ? Number(vStock.quantity || 0) : 0;
        if (!vStock || currentQty < numericQty) {
          throw new Error(`Insufficient vehicle stock for damage log on ${targetProduct.name}. Available: ${currentQty}`);
        }
        await VehicleStock.findOneAndUpdate(
          { vehicle: sourceId, product: targetProduct._id },
          { $inc: { quantity: -numericQty } },
          { new: true }
        );
      }
      break;

    case 'Stock_Adjustment':
      targetProduct.sealedBoxStock = Number(targetProduct.sealedBoxStock || 0) + numericQty;
      targetProduct.warehouseStock = targetProduct.sealedBoxStock;
      await targetProduct.save();
      break;

    default:
      break;
  }

  return transaction;
};

module.exports = { recordLedgerTransaction };
