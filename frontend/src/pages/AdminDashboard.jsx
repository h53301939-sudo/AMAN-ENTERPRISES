import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import TargetModal from '../components/target/TargetModal';
import TargetMotivationModal from '../components/common/TargetMotivationModal';
import {
  Warehouse,
  IndianRupee,
  Truck,
  ShoppingCart,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  Users,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Target as TargetIcon,
  Flame,
  Clock,
  Edit3,
  PackagePlus,
  ChevronDown,
  ChevronUp,
  Zap,
  Sparkles
} from 'lucide-react';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [targetData, setTargetData] = useState(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [showMotivationModal, setShowMotivationModal] = useState(false);
  const [showLowStockDetails, setShowLowStockDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTargetData = async () => {
    try {
      const res = await API.get('/targets/current');
      setTargetData(res.data);

      if (res.data) {
        // Auto-trigger motivational popup on each fresh login
        const shouldShowOnLogin = sessionStorage.getItem('pepsi_show_target_motivation_on_login');
        if (shouldShowOnLogin === 'true' || !sessionStorage.getItem(`pepsi_admin_session_${user?._id || 'admin'}`)) {
          setShowMotivationModal(true);
          sessionStorage.removeItem('pepsi_show_target_motivation_on_login');
          sessionStorage.setItem(`pepsi_admin_session_${user?._id || 'admin'}`, 'true');
        }
      }
    } catch (err) {
      console.error('Error fetching sales target:', err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const [dashRes, analyticRes] = await Promise.all([
        API.get('/reports/dashboard'),
        API.get('/reports/analytics')
      ]);
      setData(dashRes.data);
      setAnalytics(analyticRes.data);
      if (dashRes.data?.lowStockItems?.length > 0) {
        setShowLowStockDetails(true); // Auto-expand if low stock items exist
      }
      await fetchTargetData();
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSkeleton count={6} />;

  const kpis = data?.kpis || {};
  const lowStockItems = data?.lowStockItems || [];
  const targetInfo = targetData?.target || {};

  // Sales Trend Chart Config
  const salesChartData = {
    labels: analytics?.salesTrend?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Daily Revenue (₹)',
        data: analytics?.salesTrend?.map(d => d.revenue) || [],
        borderColor: '#DC2626',
        backgroundColor: 'rgba(0, 81, 165, 0.1)',
        fill: true,
        tension: 0.3,
      }
    ]
  };

  // Top Products Bar Chart Config with Distinct Vibrant Colors per Product
  const barPalette = [
    '#0051A5', // 1. Royal Blue
    '#E31E24', // 2. Crimson Red
    '#F59E0B', // 3. Amber Gold
    '#10B981', // 4. Emerald Green
    '#8B5CF6', // 5. Vibrant Purple
    '#06B6D4', // 6. Cyan Blue
    '#F97316', // 7. Deep Orange
    '#EC4899', // 8. Rose Pink
    '#6366F1', // 9. Indigo
    '#14B8A6'  // 10. Teal
  ];

  const topProductsChartData = {
    labels: analytics?.topProducts?.map(p => p.name) || [],
    datasets: [
      {
        label: 'Boxes Sold',
        data: analytics?.topProducts?.map(p => p.quantity) || [],
        backgroundColor: (analytics?.topProducts || []).map((_, idx) => barPalette[idx % barPalette.length]),
        borderColor: (analytics?.topProducts || []).map((_, idx) => barPalette[idx % barPalette.length]),
        borderWidth: 1,
        borderRadius: 8,
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Distribution Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time warehouse stock, van loading, customer credit & daily profit in Boxes & Hangers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
            Live Ledger Sync Active
          </span> */}
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Warehouse Stock"
          value={kpis.warehouseStockDisplay || `${kpis.totalWarehouseStock?.toLocaleString() || 0} Boxes`}
          subtitle={`Value: ₹${kpis.totalWarehouseValue?.toLocaleString() || 0}`}
          icon={Warehouse}
          color="blue"
        />
        <StatCard
          title="Vehicle Stock"
          value={kpis.vehicleStockDisplay || `${kpis.totalVehicleStock?.toLocaleString() || 0} Boxes`}
          subtitle={`Value: ₹${kpis.totalVehicleValue?.toLocaleString() || 0}`}
          icon={Truck}
          color="purple"
        />
        <StatCard
          title="Today's Sales"
          value={`₹${kpis.todaySalesTotal?.toLocaleString() || 0}`}
          subtitle={kpis.todaySalesVolumeDisplay ? `Sold: ${kpis.todaySalesVolumeDisplay}` : "POS Sales"}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Outstanding Dues"
          value={`₹${(kpis.totalOutstandingDues ?? kpis.pendingCreditAmount ?? 0).toLocaleString()}`}
          subtitle="Customer Balance"
          icon={CreditCard}
          color="red"
        />
        <div 
          onClick={() => setShowLowStockDetails(!showLowStockDetails)} 
          className="cursor-pointer transition transform hover:scale-[1.02] active:scale-95"
        >
          <StatCard
            title="Low Stock Items"
            value={`${kpis.lowStockCount || lowStockItems.length || 0} Products`}
            subtitle="Click to view list"
            icon={AlertTriangle}
            color="amber"
          />
        </div>
      </div>

      {/* 🚨 LOW STOCK ITEMIZED WARNING BANNER & LIST */}
      {lowStockItems.length > 0 && showLowStockDetails && (
        <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/60 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/40 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Warehouse Re-Order Required ({lowStockItems.length} Low Items)</span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => navigate('/purchases')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-pepsi-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow transition"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Inward Stock (Purchases)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {lowStockItems.map((item) => (
              <div
                key={item._id}
                className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-xs shadow-sm flex items-center justify-between"
              >
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">
                    {item.name} <span className="text-[11px] font-semibold text-slate-500">({item.size || 'Standard'})</span>
                  </h4>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    Warehouse Stock: <strong className="text-red-600 dark:text-red-400 font-black">{item.warehouseStock} Boxes</strong>
                  </p>
                  <p className="text-[10px] text-slate-400">Re-order Limit: {item.minStock} Boxes</p>
                </div>
                <button
                  onClick={() => navigate('/purchases')}
                  className="px-3 py-1.5 bg-red-600 text-white font-black text-[11px] rounded-lg hover:bg-red-700 shadow-sm transition"
                >
                  Restock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎯 CLEAN NATIVE SALES TARGET VS ACHIEVEMENT CARD */}
      {targetData && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <TargetIcon className="w-5 h-5 text-pepsi-blue dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Monthly Sales Goal (Target vs Actual)</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    {targetInfo.month}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track monthly box volume and revenue performance
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              {/* Pacing Badge */}
              {targetData.pacingStatus === 'TARGET_ACHIEVED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Goal Achieved 🎉
                </span>
              ) : targetData.pacingStatus === 'ON_TRACK' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-blue-100 text-pepsi-blue dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 mr-1 text-pepsi-blue" />
                  On Track 🚀
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Behind Daily Pace ⚠️
                </span>
              )}

              <button
                onClick={() => setShowMotivationModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 text-xs font-black rounded-xl shadow-sm transition"
                title="View Goal Motivation & Leadership Status"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pacing Status</span>
              </button>

              <button
                onClick={() => setIsTargetModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Goal</span>
              </button>
            </div>
          </div>

          {/* Progress Bars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Boxes Volume Progress */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Volume Goal (Boxes)</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {targetData.actualCases?.toLocaleString()} / {targetInfo.targetCases?.toLocaleString()} Boxes
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-pepsi-blue h-full rounded-full transition-all duration-500"
                  style={{ width: `${targetData.casesProgressPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>Completed: <strong className="text-pepsi-blue dark:text-blue-400">{targetData.casesProgressPct}%</strong></span>
                <span>Remaining: <strong>{Math.max(0, targetInfo.targetCases - targetData.actualCases)?.toLocaleString()} Boxes</strong></span>
              </div>
            </div>

            {/* Revenue Progress */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Revenue Goal (₹)</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  ₹{targetData.actualRevenue?.toLocaleString()} / ₹{targetInfo.targetRevenue?.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${targetData.revenueProgressPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>Collected: <strong className="text-emerald-600 dark:text-emerald-400">{targetData.revenueProgressPct}%</strong></span>
                <span>Remaining: <strong>₹{Math.max(0, targetInfo.targetRevenue - targetData.actualRevenue)?.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Key Pacing Analytics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Required Daily Pace</p>
              <p className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {targetData.requiredDailyCasesPace} <span className="text-xs font-semibold">Boxes/Day</span>
              </p>
              <p className="text-[10px] text-slate-400">Needed to hit target</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Current Daily Avg</p>
              <p className="text-base font-extrabold text-pepsi-blue dark:text-blue-400 mt-0.5">
                {targetData.currentDailyCasesAvg} <span className="text-xs font-semibold">Boxes/Day</span>
              </p>
              <p className="text-[10px] text-slate-400">Based on last {targetData.daysElapsed} days</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Days Remaining</p>
              <p className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {targetData.daysRemaining} <span className="text-xs font-semibold">Days Left</span>
              </p>
              <p className="text-[10px] text-slate-400">In {targetInfo.month}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Estimated Total</p>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {targetData.projectedCasesEndMonth?.toLocaleString()} <span className="text-xs font-semibold">Boxes</span>
              </p>
              <p className="text-[10px] text-slate-400">Estimated month-end</p>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal */}
      <TargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        currentTarget={targetInfo}
        onTargetSaved={fetchTargetData}
      />

      {/* Target Motivation Modal */}
      {showMotivationModal && targetData && (
        <TargetMotivationModal
          isOpen={showMotivationModal}
          onClose={() => setShowMotivationModal(false)}
          targetData={targetData}
          userName={user?.name || 'Administrator'}
          role="admin"
        />
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-pepsi-blue" />
              Daily Revenue Trend
            </h3>
          </div>
          <div className="h-64">
            <Line data={salesChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2 text-emerald-600" />
              Top Selling Products (Boxes)
            </h3>
          </div>
          <div className="h-64">
            <Bar data={topProductsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
}
