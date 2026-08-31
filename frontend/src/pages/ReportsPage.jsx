import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import InvoiceModal from '../components/invoice/InvoiceModal';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  CreditCard,
  Download,
  Users,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

export default function ReportsPage() {
  const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [preset, setPreset] = useState('today'); // 'today', 'yesterday', '7days', 'thisMonth', 'custom'
  const [startDate, setStartDate] = useState(() => getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedSale, setSelectedSale] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const fetchHistoricalData = async (sDate, eDate) => {
    setLoading(true);
    try {
      const res = await API.get(`/reports/historical?startDate=${sDate}&endDate=${eDate}`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching historical analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (selectedPreset) => {
    setPreset(selectedPreset);
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (selectedPreset === 'today') {
      s = now;
      e = now;
    } else if (selectedPreset === 'yesterday') {
      s.setDate(now.getDate() - 1);
      e.setDate(now.getDate() - 1);
    } else if (selectedPreset === '7days') {
      s.setDate(now.getDate() - 6);
      e = now;
    } else if (selectedPreset === 'thisMonth') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = now;
    }

    const sStr = getLocalDateString(s);
    const eStr = getLocalDateString(e);

    setStartDate(sStr);
    setEndDate(eStr);

    if (selectedPreset !== 'custom') {
      fetchHistoricalData(sStr, eStr);
    }
  };

  useEffect(() => {
    handlePresetChange('today');
  }, []);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    fetchHistoricalData(startDate, endDate);
  };

  const handleExportExcel = async (reportType) => {
    try {
      const res = await API.get(`/reports/export-excel?reportType=${reportType}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pepsi_${reportType}_report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download Excel report');
    }
  };

  const handleViewInvoice = (sale) => {
    setSelectedSale(sale);
    setIsInvoiceOpen(true);
  };

  const kpis = analytics?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Header & Excel Export Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Reports, Profit Analytics & History
          </h1>
         
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleExportExcel('sales')}
            className="flex items-center space-x-2 px-3 py-2 bg-emerald-600 text-white rounded-xl font-extrabold text-xs shadow hover:bg-emerald-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Sales (.XLSX)</span>
          </button>
          <button
            onClick={() => handleExportExcel('ledger')}
            className="flex items-center space-x-2 px-3 py-2 bg-pepsi-blue text-white rounded-xl font-extrabold text-xs shadow hover:bg-blue-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Ledger (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Time Period:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'custom', label: 'Custom Date Range' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  preset === p.id
                    ? 'bg-pepsi-blue text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <form onSubmit={handleCustomSearch} className="flex items-center space-x-2">
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-pepsi-blue text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Apply
              </button>
            </form>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={4} />
      ) : (
        <div className="space-y-6">
          {/* KPI Summary Cards for Selected Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Revenue</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{kpis.totalRevenue?.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">From {kpis.totalInvoices || 0} Sales Invoices</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Profit</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{kpis.totalProfit?.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Gross Profit (Boxes & Hangers) minus Discounts</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quantity Sold</span>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {kpis.totalSoldDisplay || `${kpis.totalBoxesSold || 0} Boxes`}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Delivered to retail shops & customers</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Breakdown</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex justify-between"><span>Cash:</span> <span className="text-slate-900 dark:text-white">₹{kpis.cashRevenue?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>UPI:</span> <span className="text-slate-900 dark:text-white">₹{kpis.upiRevenue?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Credit Due:</span> <span className="text-red-500">₹{kpis.creditRevenue?.toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          {/* Product Sales & Profit Breakdown Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm space-y-3 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Package className="w-4 h-4 text-pepsi-blue" />
                <span>Product Sales & Net Profit Breakdown</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">Total Sold (Boxes & Hangers)</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net Profit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {analytics?.productBreakdown?.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                        <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                          {prod.name}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue rounded-full font-black text-xs">
                            {prod.formattedQty || `${prod.boxes || 0} Boxes`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                          ₹{prod.revenue?.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          +₹{prod.profit?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {(!analytics?.productBreakdown || analytics.productBreakdown.length === 0) && (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400 italic">
                          No sales recorded in selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Salesman Distribution Performance */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Salesman Distribution Performance</span>
              </h3>

              <div className="space-y-3">
                {analytics?.salesmanBreakdown?.map((sm, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white">{sm.name}</p>
                      <span className="text-[10px] text-slate-400">{sm.invoices} Invoices Generated</span>
                    </div>
                    <span className="font-black text-pepsi-blue dark:text-blue-400 text-sm">
                      ₹{sm.revenue?.toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!analytics?.salesmanBreakdown || analytics.salesmanBreakdown.length === 0) && (
                  <p className="py-8 text-center text-slate-400 italic text-xs">No worker sales in period.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sales Invoices List for Selected Period */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-pepsi-blue" />
              <span>Sales Invoices in Selected Period ({analytics?.salesList?.length || 0})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer Shop</th>
                    <th className="py-2.5 px-3">Salesman</th>
                    <th className="py-2.5 px-3 text-center">Payment Mode</th>
                    <th className="py-2.5 px-3 text-right">Net Total (₹)</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {analytics?.salesList?.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">#{s.invoiceNumber}</td>
                      <td className="py-3 px-3 text-slate-500 font-semibold">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{s.customer?.shopName}</td>
                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">{s.worker?.name}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 uppercase">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                        ₹{s.netTotal?.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleViewInvoice(s)}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-lg text-xs font-bold transition ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Invoice</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!analytics?.salesList || analytics.salesList.length === 0) && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                        No sales invoices found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        sale={selectedSale}
      />
    </div>
  );
}
