import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { Warehouse, AlertTriangle, ArrowRightLeft, ShieldAlert, Plus, Package } from 'lucide-react';

export default function WarehousePage() {
  const { toast } = useToast();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [adjustQty, setAdjustQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [damageForm, setDamageForm] = useState({
    productId: '',
    quantity: '',
    reason: 'Broken Bottle',
    source: 'Warehouse',
    remarks: ''
  });

  const fetchWarehouseStock = async () => {
    try {
      const res = await API.get('/warehouse/stock');
      setStockData(res.data);
    } catch (err) {
      console.error('Error loading warehouse stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouseStock();
  }, []);

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustQty('');
    setRemarks('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/warehouse/adjust', {
        productId: selectedProduct._id,
        adjustmentQty: Number(adjustQty),
        remarks
      });
      toast.success(`Warehouse stock adjusted for ${selectedProduct.name}! 📦`, 'Stock Adjusted');
      setIsAdjustModalOpen(false);
      fetchWarehouseStock();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock', 'Error');
    }
  };

  const handleDamageSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/damages', damageForm);
      toast.success('Damaged/broken stock logged & deducted successfully! ⚠️', 'Damage Recorded');
      setIsDamageModalOpen(false);
      fetchWarehouseStock();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log damage', 'Error');
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  const summary = stockData?.summary || {};
  const products = stockData?.products || [];

  // Extract all unique categories dynamically
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Filtered products list by Search & Category (with null safeguards)
  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const prodName = p.name ? String(p.name).toLowerCase() : '';
    const prodSku = p.sku ? String(p.sku).toLowerCase() : '';
    const sQuery = (searchQuery || '').toLowerCase();
    const matchesSearch = !searchQuery || prodName.includes(sQuery) || prodSku.includes(sQuery);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Central Warehouse Stock & Valuation (Boxes & Hangers)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Single Source Inventory Ledger measured strictly in Boxes and Hanger Pricing
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsDamageModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl shadow hover:bg-red-700 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Log Damaged Stock (Boxes)</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase">Total Warehouse Stock</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary.totalStockQty?.toLocaleString()} Boxes
          </h3>
          <p className="text-[11px] text-slate-500">{summary.totalProducts} Product SKUs</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase">Total Stock Valuation</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">
            ₹{summary.totalStockValue?.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-500">Based on Box & Hanger Pricing</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase">Ledger Protection</p>
          <h3 className="text-lg font-black text-blue-600 mt-1">Immutable Audit</h3>
          <p className="text-[11px] text-slate-500">Every Movement Logged</p>
        </div>
      </div>

      {/* 🏷️ CATEGORY FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2">
            <Package className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search warehouse items..."
              className="w-full text-xs bg-transparent focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#0051A5] text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Category</th>
                <th className="py-3 px-4 text-center">Hangers / Box</th>
                <th className="py-3 px-4 text-right">Box Selling Price (₹)</th>
                <th className="py-3 px-4 text-center">Warehouse Stock (Boxes)</th>
                <th className="py-3 px-4 text-right">Total Valuation (₹)</th>
                <th className="py-3 px-4 text-right">Adjust Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredProducts.map((p) => {
                const val = p.warehouseStock * (p.sellingPrice || 0);

                return (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                      <div>
                        <p className="font-extrabold text-sm">{p.name}</p>
                        {p.sku && <span className="text-[10px] text-slate-400 font-normal">SKU: {p.sku}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {p.category || 'Namkeen'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-pepsi-blue dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {p.size || 'Standard'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black">₹{p.sellingPrice} / Box</td>
                    <td className="py-3 px-4 text-center font-extrabold">
                      <span className="px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {p.warehouseStock} Boxes
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                      ₹{val.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(p)}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue dark:text-blue-300 font-bold rounded-lg hover:bg-blue-100 transition"
                      >
                        Adjust Boxes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Stock Adjustment - ${selectedProduct?.name} (${selectedProduct?.size || ''})`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Current Warehouse Stock: <span className="font-bold text-slate-900 dark:text-white">{selectedProduct?.warehouseStock} Boxes</span>
          </p>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Quantity in Boxes (+ to increase, - to decrease)
            </label>
            <input
              type="number"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. +10 or -5 Boxes"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Remarks</label>
            <textarea
              required
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Audit recount"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <button type="submit" className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 transition">
            Commit Box Stock Adjustment
          </button>
        </form>
      </Modal>

      {/* Damage Log Modal */}
      <Modal
        isOpen={isDamageModalOpen}
        onClose={() => setIsDamageModalOpen(false)}
        title="Record Damaged Stock (Boxes)"
      >
        <form onSubmit={handleDamageSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Product</label>
            <select
              required
              value={damageForm.productId}
              onChange={(e) => setDamageForm({ ...damageForm, productId: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="">-- Select Product --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name} ({p.size}) - Stock: {p.warehouseStock} Boxes</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Damaged Quantity (Boxes)</label>
              <input
                type="number"
                required
                min="1"
                value={damageForm.quantity}
                onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
              <select
                value={damageForm.reason}
                onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="Broken Bottle">Broken Box</option>
                <option value="Leakage">Cap Leakage</option>
                <option value="Expired">Expired Product</option>
                <option value="Transport Damage">Transport Damage</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition">
            Deduct & Record Damage
          </button>
        </form>
      </Modal>
    </div>
  );
}
