import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import PurchaseOrderModal from '../components/purchase/PurchaseOrderModal';
import { useToast } from '../context/ToastContext';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit2,
  Users,
  AlertTriangle, 
  Package, 
  Send, 
  MessageSquare, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  ArrowRightLeft, 
  Loader2, 
  Building2, 
  Search, 
  Calendar, 
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoForModal, setSelectedPoForModal] = useState(null);
  const [isSuretyModalOpen, setIsSuretyModalOpen] = useState(false);

  // Supplier Management states
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isSupplierDirectoryModalOpen, setIsSupplierDirectoryModalOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: ''
  });

  // Order Builder state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product: '', quantity: '' }
  ]);

  const fetchData = async () => {
    try {
      const [poRes, supRes, prodRes] = await Promise.all([
        API.get('/purchase-orders').catch(() => ({ data: [] })),
        API.get('/suppliers').catch(() => ({ data: [] })),
        API.get('/products').catch(() => ({ data: [] }))
      ]);

      setPurchaseOrders(poRes.data || []);
      const sups = supRes.data || [];
      setSuppliers(sups);
      setProducts(prodRes.data || []);

      if (sups.length > 0) {
        if (!selectedSupplierId || !sups.some(s => s._id === selectedSupplierId)) {
          setSelectedSupplierId(sups[0]._id);
        }
      } else {
        setSelectedSupplierId('');
      }
    } catch (err) {
      console.error('Error fetching PO data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚨 Low Stock Items calculation with smart variant deduplication/aggregation
  const lowStockItems = (() => {
    // Group products by normalized name & size
    const groupMap = new Map();

    products.forEach(p => {
      const key = `${(p.name || '').trim().toLowerCase()}__${(p.size || '').trim().toLowerCase()}`;
      const stock = Number(p.warehouseStock !== undefined ? p.warehouseStock : (p.currentStock || 0));
      const minThresh = Number(p.minStock !== undefined ? p.minStock : (p.minStockAlert !== undefined ? p.minStockAlert : 10));

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          _id: p._id,
          name: p.name,
          size: p.size,
          totalWarehouseStock: stock,
          minStock: minThresh,
          representativeProduct: p
        });
      } else {
        const existing = groupMap.get(key);
        existing.totalWarehouseStock += stock;
        if (stock > 0 && (existing.representativeProduct.warehouseStock || 0) === 0) {
          existing.representativeProduct = p;
          existing._id = p._id;
        }
      }
    });

    // Filter groups where combined warehouse stock <= minStock
    return Array.from(groupMap.values())
      .filter(item => item.totalWarehouseStock <= item.minStock)
      .map(item => ({
        ...item.representativeProduct,
        _id: item._id,
        name: item.name,
        size: item.size,
        warehouseStock: item.totalWarehouseStock,
        minStock: item.minStock
      }));
  })();

  // Quick Add Low Stock Item to Order (Appends new item line with empty quantity for admin input)
  const handleQuickAddLowStock = (product) => {
    // If first row is empty, fill it; otherwise append new item line
    if (orderItems.length === 1 && !orderItems[0].product) {
      setOrderItems([{ product: product._id, quantity: '' }]);
    } else {
      setOrderItems([...orderItems, { product: product._id, quantity: '' }]);
    }
    toast.success(`Added ${product.name} (${product.size || '-'}) to Purchase Order! Enter quantity. 📦`, 'Item Added');
    
    // Smooth scroll to builder
    const builderEl = document.getElementById('po-builder-card');
    if (builderEl) {
      builderEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Add Item Row in Order Builder
  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { product: '', quantity: '' }]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (index) => {
    if (orderItems.length === 1) {
      setOrderItems([{ product: '', quantity: '' }]);
      return;
    }
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Update item field
  const handleUpdateItem = (index, field, value) => {
    const updated = [...orderItems];
    updated[index][field] = value;
    setOrderItems(updated);
  };

  // Total Cases calculation for active builder
  const totalOrderCases = orderItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  // Save / Generate PO
  const handleCreatePo = async (autoSendWhatsApp = false) => {
    if (isSubmitting) return;

    if (!selectedSupplierId) {
      toast.warning('Please select a supplier for the purchase order', 'Supplier Required');
      return;
    }

    const validItems = orderItems.filter(i => i.product && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      toast.warning('Please select at least one item with valid quantity', 'Items Required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/purchase-orders', {
        supplierId: selectedSupplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: poNotes.trim() || undefined,
        items: validItems.map(i => {
          const prod = products.find(p => p._id === i.product);
          return {
            product: i.product,
            productName: prod?.name || 'Item',
            size: prod?.size || '',
            quantity: Number(i.quantity)
          };
        })
      });

      const newPo = res.data;
      toast.success(`Purchase Order #${newPo.poNumber} generated successfully! 📋`, 'PO Created');

      // Reset Builder
      setOrderItems([{ product: '', quantity: '' }]);
      setPoNotes('');
      setExpectedDeliveryDate('');
      await fetchData();

      // Open Modal or auto dispatch WhatsApp
      setSelectedPoForModal(newPo);

      if (autoSendWhatsApp) {
        try {
          const waRes = await API.post(`/purchase-orders/${newPo._id}/send-whatsapp`, {
            phone: newPo.supplierPhone || newPo.supplier?.phone
          });
          toast.success(waRes.data?.message || 'PO PDF sent directly to supplier WhatsApp! 🚀', 'WhatsApp Delivered');
        } catch (waErr) {
          console.error('WhatsApp send error:', waErr);
          toast.error(waErr.response?.data?.message || 'Failed to send PO PDF via WhatsApp Gateway', 'WhatsApp Error');
        }
      }
    } catch (err) {
      console.error('Error creating PO:', err);
      toast.error(err.response?.data?.message || 'Failed to generate Purchase Order', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🛡️ Initiate PO creation by showing the Surety Confirmation Popup
  const handleInitiatePoCreation = () => {
    if (!selectedSupplierId) {
      toast.warning('Please select a supplier for the purchase order', 'Supplier Required');
      return;
    }

    const validItems = orderItems.filter(i => i.product && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      toast.warning('Please select at least one item with valid quantity', 'Items Required');
      return;
    }

    setIsSuretyModalOpen(true);
  };

  const handleConfirmExecutePo = async () => {
    setIsSuretyModalOpen(false);
    await handleCreatePo(true);
  };

  // Open Add Supplier Modal
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: ''
    });
    setIsSupplierModalOpen(true);
  };

  // Open Edit Supplier Modal
  const handleOpenEditSupplier = (supplier) => {
    if (!supplier) return;
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || ''
    });
    setIsSupplierModalOpen(true);
  };

  // Save Supplier Form Submit (Create or Update)
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.name || !supplierFormData.phone) {
      toast.warning('Supplier name and phone are required', 'Incomplete Form');
      return;
    }

    try {
      if (editingSupplier) {
        const res = await API.put(`/suppliers/${editingSupplier._id}`, supplierFormData);
        setSuppliers(suppliers.map(s => s._id === editingSupplier._id ? res.data : s));
        setIsSupplierModalOpen(false);
        setEditingSupplier(null);
        toast.success(`Supplier "${res.data.name}" updated successfully! ✏️`, 'Supplier Updated');
      } else {
        const res = await API.post('/suppliers', supplierFormData);
        setSuppliers([...suppliers, res.data]);
        setSelectedSupplierId(res.data._id);
        setIsSupplierModalOpen(false);
        setSupplierFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '' });
        toast.success(`Supplier "${res.data.name}" added successfully! 🏢`, 'Supplier Ready');
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      toast.error(err.response?.data?.message || 'Failed to save supplier', 'Error');
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      return;
    }

    try {
      await API.delete(`/suppliers/${id}`);
      const updated = suppliers.filter(s => s._id !== id);
      setSuppliers(updated);
      if (selectedSupplierId === id) {
        setSelectedSupplierId(updated[0]?._id || '');
      }
      toast.success(`Supplier "${name}" removed.`, 'Supplier Deleted');
    } catch (err) {
      console.error('Error deleting supplier:', err);
      toast.error(err.response?.data?.message || 'Failed to delete supplier', 'Delete Error');
    }
  };

  // Filtered Suppliers Directory
  const filteredSuppliersDirectory = suppliers.filter(s => {
    const q = supplierSearchQuery.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSkeleton count={4} />;

  // Filtered PO history
  const filteredOrders = purchaseOrders.filter(po => {
    const q = searchQuery.toLowerCase();
    return (
      (po.poNumber || '').toLowerCase().includes(q) ||
      (po.supplierName || '').toLowerCase().includes(q) ||
      (po.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6 select-none pb-12 sm:pb-0">
      
      {/* 🏷️ HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#001D66] to-[#DC2626] p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-lg border border-blue-900/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-md shrink-0">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                Purchase Orders (PO)
              </h1>
              <p className="text-[11px] sm:text-xs text-blue-100 font-medium">
                Create official Purchase Orders, view low-stock alerts & send direct PDF via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl font-bold text-xs border border-white/20 transition backdrop-blur-md"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 🚨 1. DIRECT LOW STOCK ALERT SECTION */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center space-x-1.5 sm:space-x-2">
                <span>Warehouse Low-Stock Reorder Alerts</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  {lowStockItems.length} Low
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Products currently running low in main warehouse inventory
              </p>
            </div>
          </div>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl sm:rounded-2xl border border-emerald-100 dark:border-emerald-900/40 flex items-center space-x-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">All products have healthy inventory! No immediate low-stock reorders required.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {lowStockItems.map(prod => (
              <div 
                key={prod._id}
                className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-600/60 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                    {prod.name}
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Size: {prod.size || '-'}</span>
                    <span>•</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      Available Stock: {prod.warehouseStock !== undefined ? prod.warehouseStock : (prod.currentStock || 0)} Cases
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📦 2. PURCHASE ORDER BUILDER CARD */}
      <div id="po-builder-card" className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-pepsi-blue dark:text-blue-400 shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Create New Purchase Order
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Select supplier, pick products with size & specify case quantities
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenAddSupplier}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#DC2626] dark:text-blue-300 rounded-xl font-bold text-xs transition border border-blue-200 dark:border-blue-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Supplier</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSupplierDirectoryModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-bold text-xs transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Directory ({suppliers.length})</span>
            </button>
          </div>
        </div>

        {/* Supplier & Delivery Date Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Select Supplier / Bottling Plant *
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleOpenAddSupplier}
                  className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#DC2626] dark:text-blue-300 rounded-lg font-bold text-[10px] sm:text-[11px] transition border border-blue-200 dark:border-blue-800 flex items-center space-x-1"
                  title="Add New Supplier"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
                {selectedSupplierId && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEditSupplier(suppliers.find(s => s._id === selectedSupplierId))}
                      className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-lg font-bold text-[10px] sm:text-[11px] transition border border-amber-200 dark:border-amber-800 flex items-center space-x-1"
                      title="Edit Selected Supplier"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sup = suppliers.find(s => s._id === selectedSupplierId);
                        if (sup) handleDeleteSupplier(sup._id, sup.name);
                      }}
                      className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-300 rounded-lg font-bold text-[10px] sm:text-[11px] transition border border-red-200 dark:border-red-800 flex items-center space-x-1"
                      title="Delete Selected Supplier"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-pepsi-blue"
            >
              {suppliers.length === 0 ? (
                <option value="">No suppliers found. Click '+ Add Supplier'</option>
              ) : (
                suppliers.map(sup => (
                  <option key={sup._id} value={sup._id}>
                    {sup.name} (Contact: {sup.contactPerson || 'Sales'} • Ph: {sup.phone})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Expected Delivery Date (Optional)
            </label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-pepsi-blue"
            />
          </div>
        </div>

        {/* Dynamic Item Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Beverage Items & Sizes to Order *
            </span>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center space-x-1 text-xs font-extrabold text-[#DC2626] dark:text-blue-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Another Item</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {orderItems.map((item, idx) => (
              <div 
                key={idx}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <div className="flex-1">
                  <select
                    value={item.product}
                    onChange={(e) => handleUpdateItem(idx, 'product', e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-pepsi-blue"
                  >
                    <option value="">-- Choose Beverage Item & Size --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.size ? `[${p.size}]` : ''} {p.sellingPrice ? `(₹${p.sellingPrice}/Box)` : ''} — (Stock: {p.warehouseStock !== undefined ? p.warehouseStock : (p.currentStock || 0)} Boxes)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-48 flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter Boxes"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-black text-slate-900 dark:text-white pr-12 focus:ring-2 focus:ring-pepsi-blue"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-extrabold text-slate-400 uppercase pointer-events-none">
                      Boxes
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center"
                    title="Remove Item Row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Special Instructions Notes */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
            Special Instructions / Delivery Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Please deliver by morning 8:00 AM in refrigerated vehicle"
            value={poNotes}
            onChange={(e) => setPoNotes(e.target.value)}
            className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-pepsi-blue"
          />
        </div>

        {/* Action Buttons & Order Summary */}
        <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start space-x-2 text-xs p-2.5 sm:p-0 bg-slate-50 sm:bg-transparent dark:bg-slate-700/40 sm:dark:bg-transparent rounded-xl">
            <span className="text-slate-500 font-bold">Total Volume:</span>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-[#DC2626] dark:text-blue-300 rounded-xl font-black text-xs sm:text-sm border border-blue-200 dark:border-blue-800">
              {totalOrderCases} Boxes
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <button
              type="button"
              onClick={handleInitiatePoCreation}
              disabled={isSubmitting || totalOrderCases === 0 || !selectedSupplierId}
              className={`w-full sm:w-auto px-5 sm:px-6 py-3 font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-2xl flex items-center justify-center space-x-2 transition min-h-[44px] ${
                isSubmitting || totalOrderCases === 0 || !selectedSupplierId
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-600 shadow-none'
                  : 'bg-[#DC2626] hover:bg-blue-700 active:scale-95 text-white shadow-lg shadow-blue-500/25 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              <span>
                {!selectedSupplierId 
                  ? 'Select Supplier First' 
                  : totalOrderCases === 0 
                  ? 'Add Items to Order' 
                  : 'Generate & Send Supplier WhatsApp 🚀'}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* 📋 3. PURCHASE ORDER HISTORY */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Purchase Orders History</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-100 text-[#DC2626] dark:bg-blue-900/60 dark:text-blue-300">
                {filteredOrders.length} Orders
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Track past purchase orders sent to suppliers
            </p>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" />
            <input
              type="text"
              placeholder="Search PO # or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-pepsi-blue"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 sm:py-10 text-slate-400 text-xs font-semibold">
            No purchase orders found matching your search.
          </div>
        ) : (
          <>
            {/* 📱 MOBILE CARD VIEW (< md screens) */}
            <div className="md:hidden space-y-3">
              {filteredOrders.map(po => (
                <div 
                  key={po._id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-[#DC2626] dark:text-blue-400">
                      #{po.poNumber}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-[#DC2626] dark:text-blue-300">
                      <Clock className="w-3 h-3 mr-1" />
                      Sent to Supplier
                    </span>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p className="font-extrabold text-slate-900 dark:text-white">{po.supplierName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Date: {new Date(po.orderDate || po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Volume: <span className="font-black text-slate-900 dark:text-white">{po.totalCases || 0} Cases</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPoForModal(po)}
                    className="w-full py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#DC2626] dark:text-blue-300 rounded-xl font-extrabold text-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View / WhatsApp Order</span>
                  </button>
                </div>
              ))}
            </div>

            {/* 💻 DESKTOP TABLE VIEW (>= md screens) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Order Date</th>
                    <th className="px-4 py-3 text-center">Volume</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredOrders.map(po => (
                    <tr key={po._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3.5 font-extrabold text-[#DC2626] dark:text-blue-400">
                        #{po.poNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-extrabold text-slate-900 dark:text-white">{po.supplierName}</p>
                        <p className="text-[10px] text-slate-400">Ph: {po.supplierPhone || '-'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-semibold">
                        {new Date(po.orderDate || po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-black text-slate-900 dark:text-white">
                          {po.totalCases || 0} Cases
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-[#DC2626] dark:text-blue-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Sent to Supplier
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPoForModal(po)}
                            className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#DC2626] dark:text-blue-300 rounded-xl font-extrabold text-xs transition flex items-center space-x-1"
                            title="View / Print / WhatsApp PO"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View PO</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 👤 ADD / EDIT SUPPLIER MODAL */}
      <Modal 
        isOpen={isSupplierModalOpen} 
        onClose={() => {
          setIsSupplierModalOpen(false);
          setEditingSupplier(null);
        }} 
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : "Add New Supplier / Bottling Plant"}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Supplier / Company Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PepsiCo India Central Bottling Plant"
              value={supplierFormData.name}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Sales Manager"
                value={supplierFormData.contactPerson}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Phone / WhatsApp Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 9876543210"
                value={supplierFormData.phone}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. orders@pepsico.com"
                value={supplierFormData.email}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                GSTIN Number
              </label>
              <input
                type="text"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={supplierFormData.gstNumber}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, gstNumber: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Plant / Warehouse Address
            </label>
            <input
              type="text"
              placeholder="e.g. Industrial Area Phase 2, Plant No. 4"
              value={supplierFormData.address}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsSupplierModalOpen(false);
                setEditingSupplier(null);
              }}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#DC2626] hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md"
            >
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 📋 SUPPLIERS DIRECTORY MODAL */}
      <Modal
        isOpen={isSupplierDirectoryModalOpen}
        onClose={() => setIsSupplierDirectoryModalOpen(false)}
        title="Suppliers & Bottling Plants Directory"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search supplier by name, contact, phone..."
                value={supplierSearchQuery}
                onChange={(e) => setSupplierSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-900 dark:text-white text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSupplierDirectoryModalOpen(false);
                handleOpenAddSupplier();
              }}
              className="px-3.5 py-2 bg-[#DC2626] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Supplier</span>
            </button>
          </div>

          {filteredSuppliersDirectory.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-semibold">
              No suppliers found. Click "+ Add New Supplier" to create one.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 rounded-2xl border border-slate-200 dark:border-slate-700 p-2">
              {filteredSuppliersDirectory.map(sup => (
                <div 
                  key={sup._id}
                  className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:border-blue-400 transition"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate flex items-center space-x-1.5">
                      <span>{sup.name}</span>
                      {selectedSupplierId === sup._id && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-[#DC2626] dark:text-blue-300 text-[9px] font-black">
                          Selected
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Contact: <span className="font-semibold">{sup.contactPerson || '-'}</span> • Phone: <span className="font-bold text-emerald-600 dark:text-emerald-400">{sup.phone}</span>
                    </p>
                    {sup.address && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Address: {sup.address} {sup.gstNumber ? `• GSTIN: ${sup.gstNumber}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplierId(sup._id);
                        setIsSupplierDirectoryModalOpen(false);
                        toast.info(`Selected supplier: ${sup.name}`, 'Supplier Selected');
                      }}
                      className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#DC2626] dark:text-blue-300 rounded-lg font-extrabold text-[11px]"
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSupplierDirectoryModalOpen(false);
                        handleOpenEditSupplier(sup);
                      }}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSupplier(sup._id, sup.name)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* 📄 PURCHASE ORDER PREVIEW MODAL */}
      <PurchaseOrderModal
        isOpen={Boolean(selectedPoForModal)}
        onClose={() => setSelectedPoForModal(null)}
        po={selectedPoForModal}
        onPoUpdated={fetchData}
      />

      {/* 🛡️ ULTRA-MINIMAL SURETY CONFIRMATION MODAL FOR PO */}
      {isSuretyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col transform transition-all animate-slide-up p-6 text-center space-y-4">
            
            {/* Top Pepsi Dual Color Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex z-10">
              <div className="w-1/2 bg-[#DC2626]" />
              <div className="w-1/2 bg-[#E32934]" />
            </div>

            {/* Top "Message from System" Pill Badge */}
            <div className="flex items-center justify-center pt-1">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 text-[10px] font-black uppercase tracking-widest text-[#DC2626] dark:text-blue-300 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Message from System</span>
              </span>
            </div>

            {/* Minimal Icon Badge */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-[#DC2626] dark:text-blue-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
            </div>

            {/* Title & Volume Hero */}
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Confirm & Dispatch PO?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[280px] mx-auto">
                {suppliers.find(s => s._id === selectedSupplierId)?.name || 'Selected Supplier'}
                {suppliers.find(s => s._id === selectedSupplierId)?.phone ? ` • Ph: ${suppliers.find(s => s._id === selectedSupplierId).phone}` : ''}
              </p>
              <div className="text-3xl font-black text-[#DC2626] dark:text-blue-400 pt-1">
                {totalOrderCases} Cases
              </div>
            </div>

            {/* Minimal Items Breakdown Pill */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto space-y-1 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block pb-1 border-b border-slate-200 dark:border-slate-700">
                Order Items Summary
              </span>
              {orderItems.filter(i => i.product && Number(i.quantity) > 0).map((item, idx) => {
                const prod = products.find(p => p._id === item.product);
                return (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold py-0.5">
                    <span className="truncate max-w-[200px] text-slate-800 dark:text-slate-200">
                      {prod?.name || 'Item'} {prod?.size ? `(${prod.size})` : ''}
                    </span>
                    <span className="font-black text-[#DC2626] dark:text-blue-400 shrink-0">
                      {item.quantity} Cases
                    </span>
                  </div>
                );
              })}
              {expectedDeliveryDate && (
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 font-medium flex justify-between">
                  <span>Expected Delivery:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {new Date(expectedDeliveryDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* 2 Action Buttons: Cancel vs Confirm & Send */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsSuretyModalOpen(false)}
                disabled={isSubmitting}
                className="py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-xl transition active:scale-95 text-xs flex items-center justify-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmExecutePo}
                disabled={isSubmitting}
                className="py-3 px-3 bg-[#DC2626] hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-xl transition shadow-lg shadow-blue-600/25 active:scale-95 text-xs flex items-center justify-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>✓ Confirm & Send PO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
