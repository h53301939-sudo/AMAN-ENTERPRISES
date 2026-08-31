import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import InvoiceModal from '../invoice/InvoiceModal';
import TargetModal from '../target/TargetModal';
import API from '../../services/api';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Receipt, 
  Truck, 
  Phone, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  FileText,
  Search,
  Calendar,
  Clock,
  Target as TargetIcon,
  Edit3,
  Flame,
  Sparkles,
  Banknote,
  Smartphone,
  CreditCard,
  History
} from 'lucide-react';

export default function WorkerProfileModal({ isOpen, onClose, workerId, onWorkerUpdated }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');

  // Tab & Search states: 'today_sales' | 'all_sales' | 'today_collections' | 'all_collections'
  const [activeTab, setActiveTab] = useState('today_sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null);

  // Worker Monthly Target states
  const [targetData, setTargetData] = useState(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const fetchProfile = async () => {
    if (!workerId) return;
    setLoading(true);
    setError('');

    try {
      const [profileRes, targetRes] = await Promise.all([
        API.get(`/auth/workers/${workerId}/profile`).catch(err => {
          console.error('Error fetching worker profile:', err);
          return { data: null };
        }),
        API.get(`/targets/current?workerId=${workerId}`).catch(err => {
          console.error('Error fetching worker target:', err);
          return { data: null };
        })
      ]);

      if (!profileRes?.data || !profileRes?.data?.worker) {
        setError('Worker record not found.');
        setLoading(false);
        return;
      }

      setProfileData(profileRes.data);
      if (targetRes?.data) {
        setTargetData(targetRes.data);
      }
    } catch (err) {
      console.error('Error loading worker profile:', err);
      setError(err.response?.data?.message || 'Failed to load worker profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workerId) {
      fetchProfile();
      setActiveTab('today_sales');
      setSearchQuery('');
    } else {
      setProfileData(null);
    }
  }, [isOpen, workerId]);

  const handleToggleStatus = async () => {
    if (!profileData?.worker) return;
    const isCurrentlyActive = profileData.worker.active !== false;
    const confirmMsg = isCurrentlyActive
      ? `Are you sure you want to BLOCK ${profileData.worker.name}? They will be unable to log in or make sales.`
      : `Unblock and activate ${profileData.worker.name}'s account?`;

    if (!window.confirm(confirmMsg)) return;

    setToggling(true);
    try {
      const res = await API.put(`/auth/workers/${workerId}`, { active: !isCurrentlyActive });
      setProfileData(prev => ({
        ...prev,
        worker: res.data || { ...prev.worker, active: !isCurrentlyActive }
      }));
      if (onWorkerUpdated) onWorkerUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update worker status');
    } finally {
      setToggling(false);
    }
  };

  if (!isOpen) return null;

  const worker = profileData?.worker;
  const todayAnalytics = profileData?.todayAnalytics || {
    sales: 0, profit: 0, cases: 0, invoicesCount: 0,
    cashInHand: 0, salesCash: 0, creditCash: 0,
    upiDirect: 0, salesUpi: 0, creditUpi: 0,
    creditRecovered: 0, creditGiven: 0, totalCollected: 0, collectionsCount: 0
  };
  const lifetimeAnalytics = profileData?.lifetimeAnalytics || {
    sales: 0, profit: 0, cases: 0, invoicesCount: 0,
    cashCollected: 0, upiCollected: 0, creditRecovered: 0, creditGiven: 0,
    totalCollected: 0, collectionsCount: 0, averageOrderValue: 0, profitMargin: '0'
  };
  const todaySales = profileData?.todaySales || [];
  const allSales = profileData?.allSales || [];
  const todayCollections = profileData?.todayCollections || [];
  const allCollections = profileData?.allCollections || [];
  const isActive = worker ? worker.active !== false : true;

  // Filtered Collections List
  const rawCollections = activeTab === 'today_collections' ? todayCollections : allCollections;
  const displayedCollections = rawCollections.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const shop = (c.customer?.shopName || '').toLowerCase();
    const owner = (c.customer?.ownerName || '').toLowerCase();
    const method = (c.paymentMethod || '').toLowerCase();
    const note = (c.remarks || '').toLowerCase();
    return shop.includes(q) || owner.includes(q) || method.includes(q) || note.includes(q);
  });

  // Filtered Sales List
  const rawSales = activeTab === 'today_sales' ? todaySales : allSales;
  const displayedSales = rawSales.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const invNum = (s.invoiceNumber || '').toLowerCase();
    const shop = (s.customer?.shopName || '').toLowerCase();
    const owner = (s.customer?.ownerName || '').toLowerCase();
    return invNum.includes(q) || shop.includes(q) || owner.includes(q);
  });

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={worker ? `Worker 360° Profile & Settlement: ${worker.name}` : 'Worker Performance Profile'}
        maxWidth="max-w-5xl"
      >
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-pepsi-blue animate-spin" />
            <p className="text-sm font-bold text-slate-500">Loading worker shift collections, cash handover & sales...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        ) : worker ? (
          <div className="space-y-6">
            
            {/* 👤 WORKER HEADER & PROFILE CARD */}
            <div className="bg-gradient-to-br from-slate-900 via-[#001D66] to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-blue-900/40 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Left: Avatar + Details */}
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-inner shrink-0">
                    {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{worker.name}</h2>
                      {isActive ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Salesman</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Blocked Account</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{worker.email}</span>
                      </div>
                      {worker.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{worker.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-blue-300" />
                        <span className="font-bold text-white">
                          Assigned Van: {worker.assignedVehicle?.vehicleNumber || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Block / Unblock Toggle Switch Container */}
                <div className="shrink-0 flex items-center bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2.5 rounded-2xl space-x-3">
                  <div className="text-right">
                    <span className="text-[11px] block font-bold text-slate-300">Account Access:</span>
                    <span className={`text-xs font-black ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isActive ? 'Active (Allowed)' : 'Blocked (No Access)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    disabled={toggling}
                    onClick={handleToggleStatus}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${
                      isActive ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                    title={isActive ? 'Click to Block Account' : 'Click to Unblock Account'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>
            </div>

            {/* 📊 SECTION 1: TODAY (EXACTLY AS PER SKETCH) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Today's Performance</span>
                </h3>
                <span className="text-[11px] font-bold text-pepsi-blue bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {todayAnalytics.invoicesCount} Invoices Today
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* 🛒 BOX 1: TODAY'S SALE TOTAL (WITH CASH - & UPI - BREAKDOWN) */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-pepsi-blue/40 dark:border-blue-700/60 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#DC2626] dark:text-blue-300 uppercase tracking-wider">
                      Today's Sale Total
                    </span>
                    <div className="p-1.5 rounded-xl bg-[#DC2626] text-white shadow">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-[#DC2626] dark:text-blue-300">
                    ₹{Number(todayAnalytics.sales || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between">
                      <span>Cash:</span>
                      <strong className="text-emerald-600">₹{Number(todayAnalytics.salesCash || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>UPI:</span>
                      <strong className="text-blue-600">₹{Number(todayAnalytics.salesUpi || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    {Number(todayAnalytics.creditGiven || 0) > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>New Due:</span>
                        <strong>₹{Number(todayAnalytics.creditGiven || 0).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* 📈 BOX 2: TODAY'S PROFIT */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      Today's Profit
                    </span>
                    <div className="p-1.5 rounded-xl bg-emerald-500 text-white shadow">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Number(Math.round(todayAnalytics.profit || 0)).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between">
                      <span>Margin:</span>
                      <strong className="text-emerald-600">
                        {todayAnalytics.sales > 0 ? ((todayAnalytics.profit / todayAnalytics.sales) * 100).toFixed(1) : 0}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Invoices:</span>
                      <strong>{todayAnalytics.invoicesCount || 0} Orders</strong>
                    </div>
                  </div>
                </div>

                {/* 📦 BOX 3: TODAY'S CASES */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Today's Cases
                    </span>
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {Number(todayAnalytics.cases || 0).toLocaleString('en-IN')} Cases
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                    <span>Delivered:</span>
                    <strong>Route Stock</strong>
                  </div>
                </div>

                {/* 💳 BOX 4: TODAY'S COLLECTED DUES (CASH - / UPI -) */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Today's Collected Dues
                    </span>
                    <div className="p-1.5 rounded-xl bg-purple-600 text-white shadow">
                      <Banknote className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    ₹{Number(todayAnalytics.creditRecovered || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between">
                      <span>Cash:</span>
                      <strong className="text-emerald-600">₹{Number(todayAnalytics.creditCash || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>UPI:</span>
                      <strong className="text-blue-600">₹{Number(todayAnalytics.creditUpi || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* 💵 TOTAL CASH TO BE COLLECTED & UPI SETTLEMENT SUMMARY BOX */}
              <div className="bg-gradient-to-r from-emerald-50/80 via-slate-50 to-blue-50/80 dark:from-emerald-950/30 dark:via-slate-800 dark:to-blue-950/30 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Total Today's Cash & Payment Handover
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Combined settlement from today's sales & customer dues collected
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-wrap gap-2">
                  {/* Total Physical Cash to Collect */}
                  <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700/80 shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wider">
                      💵 Total Cash To Collect from Worker:
                    </span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{Number(todayAnalytics.cashInHand || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Total UPI in Bank */}
                  <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-blue-300 dark:border-blue-700/80 shadow-xs">
                    <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 block uppercase tracking-wider">
                      📱 Total UPI Received in Bank:
                    </span>
                    <span className="text-lg font-black text-pepsi-blue dark:text-blue-400">
                      ₹{Number(todayAnalytics.upiDirect || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* ─── HORIZONTAL DIVIDER LINE (AS DRAWN IN SKETCH) ─── */}
            <hr className="border-t-2 border-slate-200 dark:border-slate-700" />

            {/* SECTION 2: 🏆 LIFETIME PERFORMANCE & FINANCIAL TOTALS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Lifetime Worker Performance</h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">All-Time Totals</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 💳 BOX 1: LIFETIME SALES */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Lifetime Sales
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#DC2626] dark:text-blue-400">
                    ₹{Number(lifetimeAnalytics.sales || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">{lifetimeAnalytics.invoicesCount || 0} Total Orders</p>
                </div>

                {/* 📈 BOX 2: LIFETIME PROFIT */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Lifetime Profit Generated
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Math.round(lifetimeAnalytics.profit || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-emerald-600/80 font-semibold">
                    Avg Margin: {lifetimeAnalytics.sales > 0 ? ((lifetimeAnalytics.profit / lifetimeAnalytics.sales) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                {/* 📦 BOX 3: LIFETIME BOXES */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Lifetime Boxes
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {Number(lifetimeAnalytics.cases || 0).toLocaleString('en-IN')} Boxes
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">Total Delivered Volume</p>
                </div>
              </div>
            </div>

            {/* 📜 4. INTERACTIVE TABS: CREDIT COLLECTIONS & SALES INVOICES */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm space-y-3 p-4 sm:p-5">
              
              {/* Header: Tab Buttons + Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                
                {/* 4 Multi-View Tabs (Sales First) */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('today_sales')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === 'today_sales'
                        ? 'bg-pepsi-blue text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Today's Sales ({todaySales.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('all_sales')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === 'all_sales'
                        ? 'bg-pepsi-blue text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>All Invoices ({allSales.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('today_collections')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === 'today_collections'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Today's Collections ({todayCollections.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('all_collections')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === 'all_collections'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>All Collections ({allCollections.length})</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search shop, owner, method..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 📑 VIEW 1 & 2: CREDIT / UDHAAR COLLECTIONS TABLE */}
              {(activeTab === 'today_collections' || activeTab === 'all_collections') && (
                <div>
                  {displayedCollections.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs italic">
                      {activeTab === 'today_collections'
                        ? 'No credit/udhaar payments collected by this worker today.'
                        : 'No collection history recorded for this worker.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-700 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-4">Date & Time</th>
                            <th className="py-2.5 px-4">Customer Shop</th>
                            <th className="py-2.5 px-4 text-center">Method</th>
                            <th className="py-2.5 px-4 text-right">Cash (₹)</th>
                            <th className="py-2.5 px-4 text-right">UPI (₹)</th>
                            <th className="py-2.5 px-4 text-right">Total (₹)</th>
                            <th className="py-2.5 px-4">Remarks / Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {displayedCollections.map((c) => (
                            <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                              
                              {/* Date & Time */}
                              <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                                {new Date(c.createdAt || c.paymentDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short'
                                })} • {new Date(c.createdAt || c.paymentDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </td>

                              {/* Customer Shop */}
                              <td className="py-2.5 px-4">
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {c.customer?.shopName || 'Customer'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {c.customer?.ownerName || c.customer?.phone || ''}
                                </span>
                              </td>

                              {/* Payment Method Badge */}
                              <td className="py-2.5 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] inline-block ${
                                  c.paymentMethod === 'Cash'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : c.paymentMethod === 'UPI'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                }`}>
                                  {c.paymentMethod}
                                </span>
                              </td>

                              {/* Cash Amount */}
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {Number(c.cashAmount || (c.paymentMethod === 'Cash' ? c.amount : 0) || 0) > 0
                                  ? `₹${Number(c.cashAmount || (c.paymentMethod === 'Cash' ? c.amount : 0)).toLocaleString('en-IN')}`
                                  : '—'}
                              </td>

                              {/* UPI Amount */}
                              <td className="py-2.5 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                                {Number(c.upiAmount || (c.paymentMethod === 'UPI' ? c.amount : 0) || 0) > 0
                                  ? `₹${Number(c.upiAmount || (c.paymentMethod === 'UPI' ? c.amount : 0)).toLocaleString('en-IN')}`
                                  : '—'}
                              </td>

                              {/* Total Collected */}
                              <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                                ₹{Number(c.amount || 0).toLocaleString('en-IN')}
                              </td>

                              {/* Remarks */}
                              <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-[160px] truncate" title={c.remarks}>
                                {c.remarks || 'Credit Payment Collection'}
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 📑 VIEW 3 & 4: SALES INVOICES TABLE */}
              {(activeTab === 'today_sales' || activeTab === 'all_sales') && (
                <div>
                  {displayedSales.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs italic">
                      {activeTab === 'today_sales'
                        ? 'No sales billed by this worker today.'
                        : 'No sales records found for this worker.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-700 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-4">Invoice #</th>
                            <th className="py-2.5 px-4">Customer Shop</th>
                            <th className="py-2.5 px-4 text-center">Boxes</th>
                            <th className="py-2.5 px-4 text-right">Net Amount</th>
                            <th className="py-2.5 px-4 text-right">Paid (Cash/UPI)</th>
                            <th className="py-2.5 px-4 text-right">Udhaar Due</th>
                            <th className="py-2.5 px-4 text-center">Status</th>
                            <th className="py-2.5 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {displayedSales.map((sale) => {
                            const totalCases = (sale.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                            return (
                              <tr key={sale._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                                
                                {/* Invoice Number */}
                                <td className="py-2.5 px-4 font-bold text-pepsi-blue dark:text-blue-400">
                                  {sale.invoiceNumber}
                                </td>

                                {/* Customer Shop */}
                                <td className="py-2.5 px-4">
                                  <span className="font-bold text-slate-900 dark:text-white block">
                                    {sale.customer?.shopName || 'Retail Customer'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {sale.customer?.ownerName || sale.customer?.phone || ''}
                                  </span>
                                </td>

                                {/* Total Cases */}
                                <td className="py-2.5 px-4 text-center font-bold text-slate-700 dark:text-slate-200">
                                  {totalCases} cs
                                </td>

                                {/* Net Total */}
                                <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                                  ₹{Number(sale.netTotal || 0).toLocaleString('en-IN')}
                                </td>

                                {/* Paid Amount */}
                                <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{Number(sale.paidAmount || 0).toLocaleString('en-IN')}
                                </td>

                                {/* Due Amount */}
                                <td className="py-2.5 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                                  {Number(sale.dueAmount || 0) > 0 ? `₹${Number(sale.dueAmount).toLocaleString('en-IN')}` : '₹0'}
                                </td>

                                {/* Status Badge */}
                                <td className="py-2.5 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    sale.status === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : sale.status === 'Partial'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                      : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                  }`}>
                                    {sale.status}
                                  </span>
                                </td>

                                {/* View / Print Bill Button */}
                                <td className="py-2.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInvoiceForModal(sale)}
                                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#800f0f] dark:text-blue-300 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1 transition cursor-pointer"
                                    title="View & Print Full Bill Invoice"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </button>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        ) : null}
      </Modal>

      {/* 📄 FULL INVOICE MODAL (FOR VIEWING & PRINTING SELECTED BILL) */}
      {selectedInvoiceForModal && (
        <InvoiceModal
          isOpen={Boolean(selectedInvoiceForModal)}
          onClose={() => setSelectedInvoiceForModal(null)}
          sale={selectedInvoiceForModal}
        />
      )}

      {/* 🎯 TARGET MODAL (FOR SETTING / EDITING WORKER TARGET) */}
      {isTargetModalOpen && (
        <TargetModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          currentTarget={targetData?.target}
          workerId={workerId}
          workerName={profileData?.worker?.name || workerId}
          onTargetSaved={fetchProfile}
        />
      )}
    </>
  );
}
