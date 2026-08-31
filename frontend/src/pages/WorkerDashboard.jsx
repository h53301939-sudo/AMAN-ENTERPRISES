import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import TargetMotivationModal from '../components/common/TargetMotivationModal';
import { 
  Truck, 
  ShoppingCart, 
  Receipt, 
  Package, 
  CornerUpLeft, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2,
  Target as TargetIcon,
  Flame,
  Clock,
  Sparkles,
  Zap,
  Banknote,
  Smartphone,
  CreditCard,
  History
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [vehicleStock, setVehicleStock] = useState(null);
  const [workerSales, setWorkerSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [targetData, setTargetData] = useState(null);
  const [showMotivationModal, setShowMotivationModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vanId = user?.assignedVehicle?._id || user?.assignedVehicle;
        const [salesRes, stockRes, prodRes, targetRes, profileRes] = await Promise.all([
          API.get('/sales').catch(() => ({ data: [] })),
          vanId ? API.get(`/vehicles/${vanId}/stock`).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
          API.get('/products').catch(() => ({ data: [] })),
          API.get('/targets/current').catch(err => {
            console.error('Error fetching worker target:', err);
            return { data: null };
          }),
          user?._id ? API.get(`/auth/workers/${user._id}/profile`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
        ]);

        const allSales = salesRes.data || [];
        const allProducts = prodRes.data || [];

        // Filter sales strictly for THIS logged-in worker
        const mySales = allSales.filter(s => {
          const wId = s.worker?._id || s.worker;
          return String(wId) === String(user?._id);
        });

        setWorkerSales(mySales);
        setProducts(allProducts);
        if (stockRes.data) setVehicleStock(stockRes.data);
        if (profileRes?.data) setProfileData(profileRes.data);

        if (targetRes?.data) {
          setTargetData(targetRes.data);
        }

        // Auto-trigger motivational popup on each fresh login
        const shouldShowOnLogin = sessionStorage.getItem('pepsi_show_target_motivation_on_login');
        if (shouldShowOnLogin === 'true' || !sessionStorage.getItem(`pepsi_worker_session_${user?._id}`)) {
          setShowMotivationModal(true);
          sessionStorage.removeItem('pepsi_show_target_motivation_on_login');
          sessionStorage.setItem(`pepsi_worker_session_${user?._id}`, 'true');
        }
      } catch (err) {
        console.error('Error loading worker dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchData();
    }
  }, [user]);

  if (loading) return <LoadingSkeleton count={4} />;

  // 1. Current Loaded Van Stock
  const vanStockItems = vehicleStock?.stocks || [];
  const totalLoadedCases = vanStockItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  // 2. Today's Date Calculation (Strict Local Midnight)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 3. Worker's Sales Made TODAY
  const todaySales = workerSales.filter(s => {
    const sDate = new Date(s.createdAt);
    return sDate >= todayStart && sDate <= todayEnd;
  });

  // Map product cost prices for profit computation
  const productCostMap = {};
  products.forEach(p => {
    productCostMap[String(p._id)] = p.purchasePrice || p.costPrice || (p.sellingPrice * 0.8);
  });

  let todaySalesTotal = 0;
  let todayProfitTotal = 0;
  let todayBoxesDelivered = 0;
  let todayHangersDelivered = 0;
  let todaySalesCash = 0;
  let todaySalesUpi = 0;

  todaySales.forEach((sale) => {
    const netAmt = sale.netTotal || 0;
    todaySalesTotal += netAmt;
    todaySalesCash += Number(sale.cashAmount || (sale.paymentMethod === 'Cash' ? (sale.paidAmount || netAmt) : 0) || 0);
    todaySalesUpi += Number(sale.upiAmount || (sale.paymentMethod === 'UPI' ? (sale.paidAmount || netAmt) : 0) || 0);

    let saleCost = 0;
    (sale.items || []).forEach((item) => {
      const qty = item.quantity || 0;
      const uType = (item.unitType || item.size || '').toLowerCase();
      if (uType === 'hanger') {
        todayHangersDelivered += qty;
      } else {
        todayBoxesDelivered += qty;
      }

      const pId = item.product?._id || item.product;
      const unitCost = productCostMap[String(pId)] || (item.product && (item.product.purchasePrice || item.product.costPrice)) || 0;
      saleCost += (qty * unitCost);
    });

    todayProfitTotal += (sale.netProfit !== undefined ? sale.netProfit : (netAmt - saleCost));
  });

  const todayVolumeDisplay = (() => {
    const parts = [];
    if (todayBoxesDelivered > 0) parts.push(`${todayBoxesDelivered} Box${todayBoxesDelivered > 1 ? 'es' : ''}`);
    if (todayHangersDelivered > 0) parts.push(`${todayHangersDelivered} Hanger${todayHangersDelivered > 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(' • ') : '0 Boxes';
  })();

  return (
    <div className="space-y-6">
      
      {/* 🌟 SALESMAN WELCOME & ROUTE HERO BANNER */}
      <div className="bg-gradient-to-r from-[#800f0f] via-blue-800 to-[#001D66] text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-700/40">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/20 inline-block">
              Salesman Route Dashboard
            </span>
            {targetData && (
              <button
                onClick={() => setShowMotivationModal(true)}
                className="inline-flex items-center space-x-1 text-[11px] font-extrabold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 px-3 py-1 rounded-full shadow hover:scale-105 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                <span>View Monthly Goal Target</span>
              </button>
            )}
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight text-white">Welcome, {user?.name}!</h1>
          <p className="text-xs text-blue-200 mt-1 flex items-center space-x-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-300" />
            <span>
              Assigned Van: <strong className="text-white underline">{user?.assignedVehicle?.vehicleNumber || 'Route Van'}</strong> ({user?.assignedVehicle?.vehicleName || 'Tata Ace'})
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <Link
            to="/returns"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 transition flex items-center space-x-1.5 text-xs"
          >
            <CornerUpLeft className="w-4 h-4 text-blue-300" />
            <span>End-Shift Return</span>
          </Link>
          <Link
            to="/pos"
            className="px-5 py-2.5 bg-white text-[#800f0f] font-black rounded-2xl shadow-lg hover:bg-slate-100 transition flex items-center space-x-2 text-xs uppercase tracking-wider active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 text-pepsi-red" />
            <span>Launch POS & Billing</span>
          </Link>
        </div>
      </div>

      {/* 🎯 1. MY MONTHLY SALES TARGET & PACING TRACKER */}
      {targetData && (
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-pepsi-blue dark:text-blue-400">
                <TargetIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Your Monthly Sales Target ({targetData.target?.month})
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-[#DC2626] dark:text-blue-300 font-bold">
                    Assigned by Manager
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track your personal monthly delivery volume and revenue milestone
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {targetData.pacingStatus === 'TARGET_ACHIEVED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Target Achieved 🎉
                </span>
              ) : targetData.pacingStatus === 'ON_TRACK' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-blue-100 text-pepsi-blue dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 mr-1" />
                  On Track 🚀
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Behind Pace ⚠️
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowMotivationModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Motivation Details</span>
              </button>
            </div>
          </div>

          {/* Progress Bars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Volume Boxes */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Volume Milestone (Boxes)</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {targetData.actualCases?.toLocaleString('en-IN')} / {targetData.target?.targetCases?.toLocaleString('en-IN')} Boxes
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#DC2626] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, targetData.casesProgressPct || 0)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>Completed: <strong className="text-[#DC2626] dark:text-blue-400">{targetData.casesProgressPct}%</strong></span>
                <span>Remaining: <strong>{targetData.remainingCasesToTarget?.toLocaleString('en-IN')} Boxes</strong></span>
              </div>
            </div>

            {/* Revenue */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Revenue Milestone (₹)</span>
                <span className="font-black text-slate-900 dark:text-white">
                  ₹{Number(targetData.actualRevenue || 0).toLocaleString('en-IN')} / ₹{Number(targetData.target?.targetRevenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, targetData.revenueProgressPct || 0)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>Collected: <strong className="text-emerald-600 dark:text-emerald-400">{targetData.revenueProgressPct}%</strong></span>
                <span>Remaining: <strong>₹{Number(targetData.remainingRevenueToTarget || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          </div>

          {/* Daily Pace Analytics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Required Daily Pace</p>
              <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {targetData.requiredDailyCasesPace || 0} Boxes / day
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Days Remaining</p>
              <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {targetData.daysRemaining || 0} Days
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 text-center col-span-2 sm:col-span-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">End-Month Projected</p>
              <p className="text-base font-black text-[#DC2626] dark:text-blue-400 mt-0.5">
                {targetData.projectedCasesEndMonth || 0} Boxes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 📊 1. PRIMARY HERO STATS: TODAY'S ROUTE SALES & PERFORMANCE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 🛒 1. Today's Sales Revenue (Hero Card) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-pepsi-blue/30 dark:border-blue-700/40 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Today's Route Sales</p>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-pepsi-blue dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-[#DC2626] dark:text-blue-400">
            ₹{todaySalesTotal.toLocaleString('en-IN')}
          </h3>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700">
            <div className="flex justify-between">
              <span>Cash:</span>
              <strong className="text-emerald-600">₹{todaySalesCash.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between">
              <span>UPI:</span>
              <strong className="text-blue-600">₹{todaySalesUpi.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* 📦 2. Today's Quantity Delivered */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Quantity Delivered</p>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {todayVolumeDisplay}
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold">Sold on Route Today</p>
        </div>

        {/* 📈 3. Today's Profit Generated */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Your Today's Profit</p>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{Math.round(todayProfitTotal).toLocaleString('en-IN')}
          </h3>
          <p className="text-[10px] text-emerald-600/80 font-bold">
            Margin: {todaySalesTotal > 0 ? ((todayProfitTotal / todaySalesTotal) * 100).toFixed(1) : 0}%
          </p>
        </div>

        {/* 🚚 4. Remaining Van Stock */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Remaining Van Stock</p>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {totalLoadedCases} Boxes
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold">{vanStockItems.length} Products Available</p>
        </div>

      </div>

      {/* 💵 2. COMPACT END-OF-SHIFT SETTLEMENT WIDGET (SUBTLE & CLEAN) */}
      <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-700 dark:text-emerald-300">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white">Shift Payment & Cash Settlement</h4>
            <p className="text-[11px] text-slate-400">Total collected today from sales and customer dues</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className="bg-white dark:bg-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-xs">
            <span className="text-[10px] text-slate-400 block font-semibold">💵 Cash In-Hand (To Handover):</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              ₹{Number(profileData?.todayAnalytics?.cashInHand || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-xs">
            <span className="text-[10px] text-slate-400 block font-semibold">📱 UPI Direct (Bank):</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
              ₹{Number(profileData?.todayAnalytics?.upiDirect || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {Number(profileData?.todayAnalytics?.creditRecovered || 0) > 0 && (
            <div className="bg-white dark:bg-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-semibold">💳 Dues Collected:</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                ₹{Number(profileData?.todayAnalytics?.creditRecovered || 0).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 🧾 1. YOUR TODAY'S ROUTE SALES HISTORY TABLE (PRIMARY FOCUS) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-pepsi-blue" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Your Route Sales Today ({todaySales.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Billed by you</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer Store</th>
                <th className="py-2.5 px-3 text-right">Cases</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Payment</th>
                <th className="py-2.5 px-3 text-center">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {todaySales.map((sale) => (
                <tr key={sale._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                  <td className="py-2.5 px-3 font-bold text-pepsi-blue">{sale.invoiceNumber}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                    {sale.customer?.shopName || 'Retail Customer'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                    {(sale.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                    ₹{sale.netTotal}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sale.paymentMethod === 'CASH'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : sale.paymentMethod === 'UPI'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {sale.paymentMethod || 'CASH'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                    {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {todaySales.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400 italic">
                    No route sales recorded today yet. Use Launch POS above to create bills.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚚 2. LIVE LOADED VAN INVENTORY TABLE */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-pepsi-blue" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Assigned Van Stock Inventory</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Ready for Route Sales</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3 text-center">Size</th>
                <th className="py-2.5 px-3 text-right">Box Price (₹)</th>
                <th className="py-2.5 px-3 text-center">Available on Van</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {vanStockItems.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                  <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">{item.product?.name}</td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[11px]">
                      {item.product?.size || 'Standard'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                    ₹{item.product?.sellingPrice} / Box
                  </td>
                  <td className="py-2.5 px-3 text-center font-extrabold text-blue-600 dark:text-blue-400">
                    {item.quantity} Boxes
                  </td>
                </tr>
              ))}
              {vanStockItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400 italic">
                    No stock currently loaded on vehicle. Visit Van Loading page to load boxes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 💳 3. RECENT CUSTOMER DUE COLLECTIONS (COMPACT SECONDARY LIST) */}
      {(profileData?.todayCollections?.length > 0) && (
        <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Customer Dues Recovered Today ({profileData.todayCollections.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Cash/UPI payments recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[9px] font-bold">
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3 text-center">Mode</th>
                  <th className="py-2 px-3 text-right">Cash ₹</th>
                  <th className="py-2 px-3 text-right">UPI ₹</th>
                  <th className="py-2 px-3 text-right">Total Amount</th>
                  <th className="py-2 px-3 text-center">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {profileData.todayCollections.map((col) => (
                  <tr key={col._id}>
                    <td className="py-2 px-3 font-semibold">
                      {col.customer?.shopName || 'Customer'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {col.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-600">
                      {Number(col.cashAmount || (col.paymentMethod === 'Cash' ? col.amount : 0)) > 0
                        ? `₹${Number(col.cashAmount || (col.paymentMethod === 'Cash' ? col.amount : 0)).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-blue-600">
                      {Number(col.upiAmount || (col.paymentMethod === 'UPI' ? col.amount : 0)) > 0
                        ? `₹${Number(col.upiAmount || (col.paymentMethod === 'UPI' ? col.amount : 0)).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                      ₹{Number(col.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400 text-[10px]">
                      {new Date(col.createdAt || col.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🚀 TARGET MOTIVATION POPUP */}
      {showMotivationModal && targetData && (
        <TargetMotivationModal
          isOpen={showMotivationModal}
          onClose={() => setShowMotivationModal(false)}
          targetData={targetData}
          userName={user?.name || 'Salesman'}
          role="worker"
        />
      )}

    </div>
  );
}
