import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { useToast } from '../context/ToastContext';
import { Tag, Save, CheckCircle, AlertTriangle, Package } from 'lucide-react';

export default function VanSellingPricesPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceInputs, setPriceInputs] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await API.get('/products');
      const list = res.data || [];
      setProducts(list);

      const initialMap = {};
      list.forEach(p => {
        initialMap[p._id] = p.sellingPrice || '';
      });
      setPriceInputs(initialMap);
    } catch (err) {
      console.error('Error fetching products for selling price setup:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handlePriceChange = (prodId, val) => {
    setPriceInputs({
      ...priceInputs,
      [prodId]: val
    });
  };

  const handleSavePrice = async (prod) => {
    const newPrice = Number(priceInputs[prod._id]);
    if (!newPrice || newPrice <= 0) {
      toast.warning('Please enter a valid selling price greater than 0', 'Invalid Price');
      return;
    }

    setSavingId(prod._id);
    try {
      await API.put(`/products/${prod._id}`, {
        ...prod,
        sellingPrice: newPrice
      });
      toast.success(`Selling price for "${prod.name}" updated to ₹${newPrice}/Box! 💰`, 'Price Updated');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update selling price', 'Update Error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Van Selling Price Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set and approve Selling Price per Box (₹) for van distribution. Unpriced items cannot be loaded or sold.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4 text-center">Size</th>
                <th className="py-3 px-4 text-right">Wholesale Cost Price (₹)</th>
                <th className="py-3 px-4 text-center">Van Selling Price Status</th>
                <th className="py-3 px-4 text-right">Set Van Selling Price (₹/Box)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {products.map((prod) => {
                const currentPrice = Number(priceInputs[prod._id]);
                const isConfigured = currentPrice && currentPrice > 0;

                return (
                  <tr key={prod._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue rounded-lg">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm">{prod.name}</p>
                          <span className="text-[10px] text-slate-400">SKU: {prod.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-pepsi-blue dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {prod.size || 'Standard'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                      ₹{prod.purchasePrice?.toFixed(2) || '0.00'} <span className="text-[10px] text-slate-400">/ Box</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isConfigured ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Ready for Selling (₹{currentPrice})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Price Not Set (Cannot Load/Sell)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Set Selling Price (₹)"
                        value={priceInputs[prod._id] || ''}
                        onChange={(e) => handlePriceChange(prod._id, e.target.value)}
                        className="w-36 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black text-sm text-right"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSavePrice(prod)}
                        disabled={savingId === prod._id}
                        className="px-4 py-2 bg-pepsi-blue text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow"
                      >
                        {savingId === prod._id ? 'Saving...' : 'Save Price'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                    No products found in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
