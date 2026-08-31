import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { BookOpen, Search, Download, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LedgerPage() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState('');

  const fetchLedger = async () => {
    try {
      const res = await API.get(`/ledger?search=${search}&transactionType=${transactionType}`);
      setLedger(res.data || []);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [search, transactionType]);

  const handleExportExcel = () => {
    window.open('/api/reports/export-excel?reportType=ledger', '_blank');
  };

  if (loading) return <LoadingSkeleton count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Stock Transaction Ledger
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-pepsi-blue text-[10px] font-extrabold uppercase">
              Single Source of Truth
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable inventory movement audit log (Supplier $\rightarrow$ Warehouse $\rightarrow$ Van $\rightarrow$ Customer $\rightarrow$ Damage)
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow hover:bg-emerald-700 transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Ledger to Excel</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by transaction ID or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pepsi-blue dark:text-white"
          />
        </div>

        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="p-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="">All Movement Types</option>
          <option value="Supplier_Inward">Supplier Inward</option>
          <option value="Warehouse_To_Vehicle">Warehouse $\rightarrow$ Van</option>
          <option value="Vehicle_To_Customer">Van POS Sale</option>
          <option value="Vehicle_To_Warehouse">Van Return</option>
          <option value="Warehouse_Damage">Damage Log</option>
          <option value="Stock_Adjustment">Stock Adjustment</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Transaction Type</th>
                <th className="py-3 px-4 text-center">Movement Flow</th>
                <th className="py-3 px-4 text-center">Qty (Pcs)</th>
                <th className="py-3 px-4 text-right">Value (₹)</th>
                <th className="py-3 px-4">User / Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {ledger.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{t.transactionId}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.product?.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      {t.transactionType?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-300">
                    {t.sourceType} $\rightarrow$ {t.destType}
                  </td>
                  <td className="py-3 px-4 text-center font-black text-pepsi-blue dark:text-blue-400">
                    {t.quantity}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold">₹{t.totalValue?.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-500">{t.user?.name || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
