import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import InvoiceModal from '../components/invoice/InvoiceModal';
import { Receipt, Eye, Search, CheckCircle, Clock } from 'lucide-react';

export default function InvoicesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const fetchSales = async () => {
    try {
      const res = await API.get(`/sales?search=${search}`);
      setSales(res.data || []);
    } catch (err) {
      console.error('Error fetching sales invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [search]);

  const handleViewInvoice = async (id) => {
    try {
      const res = await API.get(`/sales/${id}`);
      setSelectedSale(res.data);
      setIsInvoiceOpen(true);
    } catch (err) {
      alert('Failed to load invoice details');
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Sales Invoices Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View, print, and download PDF sales invoices for all retail customer deliveries
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number (e.g. PEP-2026...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pepsi-blue dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Shop</th>
                <th className="py-3 px-4">Salesman</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Net Total (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {sales.map((sale) => (
                <tr key={sale._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="py-3 px-4 font-bold text-pepsi-blue dark:text-blue-400">{sale.invoiceNumber}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">{sale.customer?.shopName}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{sale.worker?.name}</td>
                  <td className="py-3 px-4">
                    {sale.paymentMethod === 'Split' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" title={`Cash: ₹${sale.cashAmount || 0}, UPI: ₹${sale.upiAmount || 0}`}>
                        Split (₹{sale.cashAmount || 0} + ₹{sale.upiAmount || 0})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {sale.paymentMethod}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                    ₹{sale.netTotal}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sale.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleViewInvoice(sale._id)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-200 transition flex items-center space-x-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5 text-pepsi-blue" />
                      <span>View PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        sale={selectedSale}
      />
    </div>
  );
}
