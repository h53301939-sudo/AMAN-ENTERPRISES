import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { ArrowRightLeft, Plus, Trash2, CheckCircle, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function PurchasesPage() {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: '', purchasePrice: '' }]);

  const fetchData = async () => {
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        API.get('/purchases'),
        API.get('/suppliers'),
        API.get('/products')
      ]);
      setPurchases(purRes.data || []);
      const sups = supRes.data || [];
      setSuppliers(sups);
      setProducts(prodRes.data || []);
      if (sups.length > 0) {
        setSupplierId(sups[0]._id);
      }
    } catch (err) {
      console.error('Error fetching purchase data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { product: '', quantity: '', purchasePrice: '' }]);
  };

  const handleRemoveItemRow = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleProductSelect = (idx, prodId) => {
    const selectedProd = products.find(p => p._id === prodId);
    const newItems = [...items];
    newItems[idx].product = prodId;
    if (selectedProd) {
      newItems[idx].purchasePrice = selectedProd.purchasePrice || selectedProd.sellingPrice;
    }
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // LOCK AGAINST DOUBLE-CLICKING
    if (!supplierId) {
      toast.warning('Please select or add a supplier first', 'Supplier Required');
      return;
    }

    // Anti-Loss Inward Validation
    for (const item of items) {
      const prod = products.find(p => p._id === item.product);
      if (prod && Number(item.purchasePrice) >= Number(prod.sellingPrice)) {
        toast.error(`Inward rate for ${prod.name} (₹${item.purchasePrice}) cannot be equal to or higher than current Selling Price (₹${prod.sellingPrice})!`, 'Anti-Loss Inward Block');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await API.post('/purchases', {
        invoiceNumber,
        supplier: supplierId,
        items: items.map(item => ({
          product: item.product,
          quantity: Number(item.quantity),
          purchasePrice: Number(item.purchasePrice)
        }))
      });
      toast.success('Purchase bill saved & stock added to warehouse! 📥', 'Purchase Recorded');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase', 'Purchase Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Stock Inward Purchases
          </h1>
          
        </div>
        <button
          onClick={() => {
            setInvoiceNumber(`INV-PEP-${Date.now().toString().slice(-6)}`);
            setSupplierId(suppliers[0]?._id || '');
            setItems([{ product: products[0]?._id || '', quantity: '', purchasePrice: products[0]?.purchasePrice || '' }]);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Items Received (Boxes)</th>
                <th className="py-3 px-4 text-right">Total Shipment Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {purchases.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">{p.invoiceNumber}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.supplier?.name}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {p.items?.map((item, i) => (
                      <span key={i} className="inline-block bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-[10px] font-bold mr-1 mb-1">
                        {item.product?.name}: {item.quantity} Boxes
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                    ₹{p.totalAmount?.toLocaleString()}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400 italic">
                    No inward shipments recorded yet. Click "Record New Stock Shipment" to add stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Incoming Stock Inward Invoice (Boxes)" maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Supplier Invoice Number</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Supplier Name *</label>
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              >
                {suppliers.length === 0 ? (
                  <option value="">No suppliers found (Please add in Purchase Orders)</option>
                ) : (
                  suppliers.map(s => <option key={s._id} value={s._id}>{s.name} (Ph: {s.phone})</option>)
                )}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300">Shipment Line Items (Boxes)</label>
            {items.map((item, idx) => {
              const selectedProd = products.find(p => p._id === item.product);
              const isItemViolation = selectedProd && item.purchasePrice !== '' && Number(item.purchasePrice) >= Number(selectedProd.sellingPrice);

              return (
                <div key={idx} className="space-y-1">
                  <div className={`flex items-center space-x-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border ${
                    isItemViolation ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 dark:border-slate-600'
                  }`}>
                    <select
                      required
                      value={item.product}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="flex-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-bold"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.size})</option>)}
                    </select>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Boxes"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].quantity = e.target.value;
                        setItems(newItems);
                      }}
                      className="w-28 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-black text-center"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Price/Box (₹)"
                      value={item.purchasePrice}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].purchasePrice = e.target.value;
                        setItems(newItems);
                      }}
                      className="w-32 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-black"
                    />
                    {items.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItemRow(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isItemViolation && (
                    <p className="text-[11px] font-bold text-red-500 flex items-center space-x-1 pl-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>⛔ Inward Cost (₹{item.purchasePrice}) is equal to or higher than current Selling Price (₹{selectedProd.sellingPrice}) for {selectedProd.name}!</span>
                    </p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddItemRow}
              className="text-xs font-bold text-pepsi-blue hover:underline flex items-center space-x-1 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Item Line</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || items.some(item => {
              const p = products.find(prod => prod._id === item.product);
              return p && item.purchasePrice !== '' && Number(item.purchasePrice) >= Number(p.sellingPrice);
            })}
            className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SAVING SHIPMENT...</span>
              </>
            ) : (
              <span>Confirm Inward & Auto-Update Warehouse Stock</span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
