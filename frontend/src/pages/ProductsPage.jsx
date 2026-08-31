import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle, AlertTriangle, TrendingUp, Loader2, Lock } from 'lucide-react';

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCategories = ['Namkeen', 'Sev', 'Wafer / Chips', 'Bhuja / Mixture', 'Gathiya', 'Snacks', 'Other'];
  const [categoriesList, setCategoriesList] = useState(defaultCategories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Namkeen',
    purchasePrice: '', // Cost price per box
    boxPrice: '', // Selling price per box
    hangersPerBox: 24,
    sellFullBox: true,
    sellIndividualHanger: true,
    sealedBoxStock: '10',
    looseHangerStock: '0'
  });

  const fetchProducts = async () => {
    try {
      const res = await API.get(`/products?search=${search}`);
      const fetchedProds = res.data || [];
      setProducts(fetchedProds);

      // Merge dynamic categories from fetched products
      const dbCategories = Array.from(new Set(fetchedProds.map(p => p.category).filter(Boolean)));
      setCategoriesList(prev => Array.from(new Set([...defaultCategories, ...dbCategories, ...prev])));
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormError('');
    setIsAddingCategory(false);
    setNewCategoryName('');
    setFormData({
      name: '',
      category: categoriesList[0] || 'Namkeen',
      purchasePrice: '',
      boxPrice: '',
      hangersPerBox: 24,
      sellFullBox: true,
      sellIndividualHanger: true,
      sealedBoxStock: '10',
      looseHangerStock: '0'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormError('');
    setIsAddingCategory(false);
    setNewCategoryName('');
    setFormData({
      name: prod.name || '',
      category: prod.category || 'Namkeen',
      purchasePrice: prod.purchasePrice !== undefined ? prod.purchasePrice : '',
      boxPrice: prod.boxPrice !== undefined ? prod.boxPrice : (prod.sellingPrice || ''),
      hangersPerBox: prod.hangersPerBox || 24,
      sellFullBox: prod.sellFullBox !== undefined ? prod.sellFullBox : true,
      sellIndividualHanger: prod.sellIndividualHanger !== undefined ? prod.sellIndividualHanger : true,
      sealedBoxStock: prod.sealedBoxStock !== undefined ? prod.sealedBoxStock : (prod.warehouseStock || 0),
      looseHangerStock: prod.looseHangerStock || 0
    });
    setIsModalOpen(true);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName || !newCategoryName.trim()) return;
    const cleanCat = newCategoryName.trim();
    if (!categoriesList.includes(cleanCat)) {
      setCategoriesList(prev => [...prev, cleanCat]);
    }
    setFormData(prev => ({ ...prev, category: cleanCat }));
    setNewCategoryName('');
    setIsAddingCategory(false);
    toast.success(`Category "${cleanCat}" created & selected! 🏷️`, 'Category Created');
  };

  const baseHangerPrice = (Number(formData.boxPrice || 0) > 0 && Number(formData.hangersPerBox || 0) > 0)
    ? Math.ceil(Number(formData.boxPrice) / Number(formData.hangersPerBox))
    : 0;

  const calculatedHangerPrice = baseHangerPrice > 0
    ? (baseHangerPrice + 1).toFixed(2)
    : '0.00';

  const calculatedBoxMargin = (Number(formData.boxPrice || 0) > 0 && Number(formData.purchasePrice || 0) > 0)
    ? (Number(formData.boxPrice) - Number(formData.purchasePrice)).toFixed(2)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!formData.name || !formData.name.trim()) {
      setFormError('Product Name is required');
      return;
    }
    if (!formData.category) {
      setFormError('Category is required');
      return;
    }
    if (!formData.boxPrice || Number(formData.boxPrice) <= 0) {
      setFormError('Box Selling Price must be greater than 0');
      return;
    }

    const costP = Number(formData.purchasePrice || 0);
    const boxP = Number(formData.boxPrice || 0);

    // 🔴 PRICE VALIDATION: Selling Price must be strictly greater than Cost Price
    if (costP > 0 && boxP <= costP) {
      const errMsg = `⛔ Box Selling Price (₹${boxP.toFixed(2)}) cannot be less than or equal to Cost Price (₹${costP.toFixed(2)}). Selling price must be strictly greater than cost price!`;
      setFormError(errMsg);
      toast.error(`Selling Price (₹${boxP}) must be greater than Cost Price (₹${costP})`, 'Invalid Pricing');
      return;
    }

    if (!formData.hangersPerBox || Number(formData.hangersPerBox) <= 0) {
      setFormError('Hangers in 1 Box must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        purchasePrice: costP,
        boxPrice: boxP,
        sellingPrice: boxP,
        hangersPerBox: Number(formData.hangersPerBox),
        sellFullBox: Boolean(formData.sellFullBox),
        sellIndividualHanger: Boolean(formData.sellIndividualHanger),
        sealedBoxStock: Number(formData.sealedBoxStock || 0),
        warehouseStock: Number(formData.sealedBoxStock || 0),
        looseHangerStock: Number(formData.looseHangerStock || 0)
      };

      if (editingProduct) {
        await API.put(`/products/${editingProduct._id}`, payload);
        toast.success(`Item "${formData.name}" updated successfully! ✏️`, 'Item Updated');
      } else {
        await API.post('/products', payload);
        toast.success(`Item "${formData.name}" added to catalog! 📦`, 'Item Added');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save product';
      setFormError(msg);
      toast.error(msg, 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await API.delete(`/products/${id}`);
        toast.success('Product removed from catalog.', 'Item Deleted');
        fetchProducts();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete product', 'Delete Error');
      }
    }
  };

  const handleClearAllItems = async () => {
    if (window.confirm('⚠️ WARNING: Delete ALL items from warehouse catalog to start completely clean?')) {
      try {
        await API.delete('/products/clear-all');
        toast.success('All items cleared from catalog.', 'Catalog Cleared');
        fetchProducts();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to clear products', 'Error');
      }
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Balaji Namkeen Products Catalog
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Manage Namkeen inventory, Box & Hanger selling prices and stock
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleClearAllItems}
            className="flex items-center space-x-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold text-xs hover:bg-red-100 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove All Items</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs shadow hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search product by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pepsi-blue dark:text-white"
          />
        </div>
      </div>

      {/* Products Catalog Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Category</th>
                <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                <th className="py-3 px-4 text-right">Box Selling Price (₹)</th>
                <th className="py-3 px-4 text-center">Hangers / Box</th>
                <th className="py-3 px-4 text-right">Hanger Price (₹)</th>
                <th className="py-3 px-4 text-center">Stock Available</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {products.map((prod) => {
                const cPrice = prod.purchasePrice || 0;
                const bPrice = prod.boxPrice !== undefined ? prod.boxPrice : (prod.sellingPrice || 0);
                const hBox = prod.hangersPerBox || 24;
                const hPrice = prod.hangerPrice || (hBox > 0 ? (bPrice / hBox).toFixed(2) : 0);
                const sealed = prod.sealedBoxStock !== undefined ? prod.sealedBoxStock : (prod.warehouseStock || 0);
                const loose = prod.looseHangerStock || 0;

                return (
                  <tr key={prod._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue rounded-lg">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm">{prod.name}</p>
                          <span className="text-[10px] text-slate-400">Balaji Namkeen</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-pepsi-blue dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {prod.category || 'Namkeen'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-600 dark:text-slate-300 text-xs">
                      ₹{Number(cPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white text-sm">
                      ₹{Number(bPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {hBox} Hangers
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{Number(hPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full font-black text-xs bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        <span>{sealed} Boxes</span>
                        {loose > 0 && <span className="text-amber-600 dark:text-amber-400">• {loose} Loose</span>}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod._id)}
                        className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 italic">
                    No products in catalog. Click "+ Add Product" to add items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product Details' : 'Add New Balaji Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Product Information Section */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-700/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-pepsi-blue">
              Product Information
            </h4>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Balaji Ratlami Sev, Balaji Aloo Bhujia"
                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Category *</label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="text-[11px] font-black text-pepsi-blue hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Category</span>
                  </button>
                )}
              </div>

              {isAddingCategory ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter category name (e.g. Chivda, Farsan)..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    className="flex-1 p-2.5 bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-600 rounded-xl text-slate-900 dark:text-white font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3.5 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition shrink-0"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="px-2.5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-300 transition shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setIsAddingCategory(true);
                    } else {
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-extrabold text-pepsi-blue bg-blue-50 dark:bg-blue-950">
                    + Create New Category...
                  </option>
                </select>
              )}
            </div>
          </div>

          {/* Pricing & Box Information Section */}
          <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50">
            <h4 className="font-extrabold text-blue-900 dark:text-blue-300 text-xs uppercase tracking-wider">
              Pricing & Box Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cost Price (₹/Box)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="e.g. 90"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Box Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.boxPrice}
                  onChange={(e) => setFormData({ ...formData, boxPrice: e.target.value })}
                  placeholder="e.g. 120"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hangers in 1 Box *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.hangersPerBox}
                  onChange={(e) => setFormData({ ...formData, hangersPerBox: e.target.value })}
                  placeholder="e.g. 24"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-sm"
                />
              </div>
            </div>

            {/* Clear Calculation Display Box */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-1 font-mono text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>COST PRICE (BOX)</span>
                <span className="font-bold">₹{formData.purchasePrice ? Number(formData.purchasePrice).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>BOX SELLING PRICE</span>
                <span className="font-bold">₹{formData.boxPrice ? Number(formData.boxPrice).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>HANGERS IN 1 BOX</span>
                <span className="font-bold">{formData.hangersPerBox || 0}</span>
              </div>
              {calculatedBoxMargin !== null && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold">
                  <span>PROFIT MARGIN (PER BOX)</span>
                  <span>+₹{calculatedBoxMargin}</span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 my-1 pt-1 flex justify-between font-black text-emerald-600 dark:text-emerald-400 text-sm">
                <span>1 HANGER SELLING PRICE</span>
                <span>
                  ₹{calculatedHangerPrice}{' '}
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    (BASE ₹{baseHangerPrice} + ₹1 LOOSE BOX SURCHARGE)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Selling Options */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-700/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              Selling Options
            </h4>
            <div className="flex items-center space-x-6 pt-1">
              <label className="flex items-center space-x-2 font-bold cursor-pointer text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.sellFullBox}
                  onChange={(e) => setFormData({ ...formData, sellFullBox: e.target.checked })}
                  className="w-4 h-4 text-pepsi-blue rounded"
                />
                <span>Sell Full Box</span>
              </label>

              <label className="flex items-center space-x-2 font-bold cursor-pointer text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.sellIndividualHanger}
                  onChange={(e) => setFormData({ ...formData, sellIndividualHanger: e.target.checked })}
                  className="w-4 h-4 text-pepsi-blue rounded"
                />
                <span>Sell Individual Hanger</span>
              </label>
            </div>
          </div>

          {/* Stock Section */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-700/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sealed Boxes</label>
              <input
                type="number"
                required
                min="0"
                value={formData.sealedBoxStock}
                onChange={(e) => setFormData({ ...formData, sealedBoxStock: e.target.value })}
                placeholder="e.g. 10"
                className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Loose Hangers</label>
              <input
                type="number"
                required
                min="0"
                value={formData.looseHangerStock}
                onChange={(e) => setFormData({ ...formData, looseHangerStock: e.target.value })}
                placeholder="e.g. 0"
                className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-1/3 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-3 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition text-xs shadow-md flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <Lock className="w-3.5 h-3.5 text-white/80" />
                  <span>SAVING ITEM...</span>
                </>
              ) : (
                <span>Save Item</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
