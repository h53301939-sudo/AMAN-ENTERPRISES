const mongoose = require('mongoose');
const Target = require('../models/Target');
const Sale = require('../models/Sale');
const User = require('../models/User');

// Helper to safely drop legacy single-field index if present
let indexSyncAttempted = false;
const ensureTargetIndexes = async () => {
  if (indexSyncAttempted) return;
  try {
    const indexes = await Target.collection.indexes();
    const oldMonthIndex = indexes.find(idx => idx.name === 'month_1' && Object.keys(idx.key).length === 1);
    if (oldMonthIndex) {
      await Target.collection.dropIndex('month_1');
      console.log('✅ Dropped legacy month_1 index on Target collection');
    }
    await Target.syncIndexes();
    indexSyncAttempted = true;
  } catch (e) {
    indexSyncAttempted = true;
  }
};

// @desc    Get Current Month Target vs Actual Achievement Progress (For Agency or Specific Worker)
// @route   GET /api/targets/current
const getCurrentTarget = async (req, res) => {
  try {
    await ensureTargetIndexes();

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;

    // Determine whether this request is for a specific worker or overall agency
    let targetWorkerId = null;
    let workerInfo = null;

    if (req.user && req.user.role === 'worker') {
      targetWorkerId = req.user._id;
      workerInfo = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email
      };
    } else if (req.query.workerId && req.query.workerId !== 'null' && req.query.workerId !== 'undefined') {
      const qId = String(req.query.workerId);
      if (mongoose.Types.ObjectId.isValid(qId)) {
        targetWorkerId = qId;
        const workerUser = await User.findById(targetWorkerId).select('name email');
        if (workerUser) {
          workerInfo = {
            _id: workerUser._id,
            name: workerUser.name,
            email: workerUser.email
          };
        }
      }
    }

    // Atomic find-or-create for current month
    const defaultCases = targetWorkerId ? 1000 : 5000;
    const defaultRevenue = targetWorkerId ? 500000 : 2500000;

    let target = await Target.findOne({
      month: monthStr,
      worker: targetWorkerId || null
    });

    if (!target) {
      try {
        target = await Target.findOneAndUpdate(
          {
            month: monthStr,
            worker: targetWorkerId || null
          },
          {
            $setOnInsert: {
              month: monthStr,
              worker: targetWorkerId || null,
              targetCases: defaultCases,
              targetRevenue: defaultRevenue
            }
          },
          { new: true, upsert: true }
        );
      } catch (upsertErr) {
        // Fallback find if duplicate race condition
        target = await Target.findOne({
          month: monthStr,
          worker: targetWorkerId || null
        });
      }
    }

    if (!target) {
      target = {
        month: monthStr,
        worker: targetWorkerId || null,
        targetCases: defaultCases,
        targetRevenue: defaultRevenue
      };
    }

    // Month Date Boundaries (Local midnight)
    const monthStart = new Date(year, now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const salesFilter = {
      createdAt: { $gte: monthStart, $lte: monthEnd }
    };
    if (targetWorkerId) {
      salesFilter.worker = targetWorkerId;
    }

    const sales = await Sale.find(salesFilter);

    let actualCases = 0;
    let actualRevenue = 0;

    sales.forEach((sale) => {
      actualRevenue += (sale.netTotal || 0);
      (sale.items || []).forEach((item) => {
        actualCases += (item.quantity || 0);
      });
    });

    const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
    const todayDate = now.getDate();
    const daysElapsed = Math.max(1, todayDate);
    const daysRemaining = Math.max(1, daysInMonth - todayDate + 1);

    const targetCasesVal = Number(target.targetCases) || defaultCases;
    const targetRevenueVal = Number(target.targetRevenue) || defaultRevenue;

    const casesProgressPct = targetCasesVal > 0
      ? Math.round((actualCases / targetCasesVal) * 100)
      : 0;

    const revenueProgressPct = targetRevenueVal > 0
      ? Math.round((actualRevenue / targetRevenueVal) * 100)
      : 0;

    const currentDailyCasesAvg = actualCases / daysElapsed;
    const targetDailyCasesPace = targetCasesVal / daysInMonth;
    const remainingCasesToTarget = Math.max(0, targetCasesVal - actualCases);
    const remainingRevenueToTarget = Math.max(0, targetRevenueVal - actualRevenue);
    const requiredDailyCasesPace = remainingCasesToTarget > 0 ? (remainingCasesToTarget / daysRemaining) : 0;
    const projectedCasesEndMonth = Math.round(currentDailyCasesAvg * daysInMonth);

    let pacingStatus = 'ON_TRACK';
    if (actualCases >= targetCasesVal || actualRevenue >= targetRevenueVal) {
      pacingStatus = 'TARGET_ACHIEVED';
    } else if (currentDailyCasesAvg >= targetDailyCasesPace) {
      pacingStatus = 'ON_TRACK';
    } else {
      pacingStatus = 'BEHIND_TARGET';
    }

    res.json({
      target,
      workerInfo,
      isWorkerTarget: Boolean(targetWorkerId),
      actualCases,
      actualRevenue,
      casesProgressPct,
      revenueProgressPct,
      remainingCasesToTarget,
      remainingRevenueToTarget,
      daysInMonth,
      daysElapsed,
      daysRemaining,
      currentDailyCasesAvg: Math.round(currentDailyCasesAvg * 10) / 10,
      requiredDailyCasesPace: Math.round(requiredDailyCasesPace * 10) / 10,
      projectedCasesEndMonth,
      pacingStatus
    });
  } catch (err) {
    console.error('Error fetching target stats:', err);
    res.status(500).json({ message: 'Failed to fetch target progress' });
  }
};

// @desc    Set or Update Target for a Month (Agency or Worker)
// @route   POST /api/targets
const setMonthTarget = async (req, res) => {
  try {
    await ensureTargetIndexes();
    const { month, workerId, targetCases, targetRevenue, notes } = req.body;

    const now = new Date();
    const defaultMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = month || defaultMonthStr;
    const targetWorker = (workerId && workerId !== 'null' && workerId !== 'undefined' && mongoose.Types.ObjectId.isValid(workerId))
      ? workerId
      : null;

    const updatedTarget = await Target.findOneAndUpdate(
      {
        month: targetMonth,
        worker: targetWorker
      },
      {
        $set: {
          targetCases: Number(targetCases) || (targetWorker ? 1000 : 5000),
          targetRevenue: Number(targetRevenue) || (targetWorker ? 500000 : 2500000),
          notes: notes || ''
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: targetWorker ? 'Worker sales target saved successfully!' : 'Agency monthly sales target saved successfully!',
      target: updatedTarget
    });
  } catch (err) {
    console.error('Error saving target:', err);
    res.status(500).json({ message: 'Failed to save sales target' });
  }
};

// @desc    Get Target Summary for All Workers (Admin Overview)
// @route   GET /api/targets/workers-summary
const getWorkersTargetSummary = async (req, res) => {
  try {
    await ensureTargetIndexes();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;

    const monthStart = new Date(year, now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const workers = await User.find({ role: 'worker' }).select('name email phone active assignedVehicle');
    const workerTargets = await Target.find({ month: monthStr, worker: { $ne: null } });
    const monthSales = await Sale.find({ createdAt: { $gte: monthStart, $lte: monthEnd } });

    const summary = workers.map(worker => {
      const wTarget = workerTargets.find(t => String(t.worker) === String(worker._id)) || {
        targetCases: 1000,
        targetRevenue: 500000
      };

      const wSales = monthSales.filter(s => {
        const wId = s.worker?._id || s.worker;
        return String(wId) === String(worker._id);
      });

      let actualCases = 0;
      let actualRevenue = 0;
      wSales.forEach(sale => {
        actualRevenue += (sale.netTotal || 0);
        (sale.items || []).forEach(item => {
          actualCases += (item.quantity || 0);
        });
      });

      const casesProgressPct = wTarget.targetCases > 0 ? Math.round((actualCases / wTarget.targetCases) * 100) : 0;
      const revenueProgressPct = wTarget.targetRevenue > 0 ? Math.round((actualRevenue / wTarget.targetRevenue) * 100) : 0;

      return {
        worker,
        target: wTarget,
        actualCases,
        actualRevenue,
        casesProgressPct,
        revenueProgressPct,
        pacingStatus: actualCases >= wTarget.targetCases ? 'TARGET_ACHIEVED' : casesProgressPct >= 50 ? 'ON_TRACK' : 'BEHIND_TARGET'
      };
    });

    res.json(summary);
  } catch (err) {
    console.error('Error fetching workers target summary:', err);
    res.status(500).json({ message: 'Failed to fetch workers target summary' });
  }
};

module.exports = {
  getCurrentTarget,
  setMonthTarget,
  getWorkersTargetSummary
};
