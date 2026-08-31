import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import CustomerAvatar from '../components/common/CustomerAvatar';
import Modal from '../components/common/Modal';
import { playCartBeep, playSaleSuccessSound } from '../utils/audio';
import {
  ClipboardList,
  Plus,
  Minus,
  Trash2,
  Search,
  UserPlus,
  CheckCircle,
  Truck,
  Package,
  Calendar,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  FileText,
  Check,
  X,
  Layers,
  ShoppingBag,
  ExternalLink,
  Store,
  ChevronRight
} from 'lucide-react';

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('list'); // 'list', 'book', 'demand'
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [demandSummary, setDemandSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters for Order List
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // 📝 Visual Booking State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [bookProductSearch, setBookProductSearch] = useState('');
  const [bookMobileTab, setBookMobileTab] = useState('items'); // 'items' or 'summary'
  const [selectedProductQuantities, setSelectedProductQuantities] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Customer Modal
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ shopName: '', ownerName: '', phone: '', address: '' });
  const [isCustSubmitting, setIsCustSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [oRes, cRes, pRes, vRes, dRes] = await Promise.all([
        API.get('/customer-orders'),
        API.get('/customers'),
        API.get('/products'),
        API.get('/vehicles'),
        API.get('/customer-orders/demand-summary')
      ]);

      setOrders(oRes.data || []);
      setCustomers(cRes.data || []);
      setProducts(pRes.data || []);
      setVehicles(vRes.data || []);
      setDemandSummary(dRes.data || null);

      if (cRes.data?.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(cRes.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🛒 Visual Card Click Handlers
  const addToBookCart = (product, unitType = 'Box') => {
    const key = `${product._id}_${unitType}`;
    setSelectedProductQuantities(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
    playCartBeep();
  };

  const updateBookCartQty = (productId, unitType, delta) => {
    const key = `${productId}_${unitType}`;
    setSelectedProductQuantities(prev => {
      const current = prev[key] || 0;
      const nextVal = current + delta;
      if (nextVal <= 0) {
        const nextMap = { ...prev };
        delete nextMap[key];
        return nextMap;
      }
      return { ...prev, [key]: nextVal };
    });
    playCartBeep();
  };

  const handleRemoveItemFromOrder = (key) => {
    setSelectedProductQuantities(prev => {
      const nextMap = { ...prev };
      delete nextMap[key];
      return nextMap;
    });
  };

  // Convert selected quantities into item array
  const activeSelectedItems = Object.entries(selectedProductQuantities)
    .filter(([_, qty]) => Number(qty) > 0)
    .map(([key, qty]) => {
      const parts = key.split('_');
      const prodId = parts[0];
      const unitType = parts[1] || 'Box';

      const prod = products.find(p => p._id === prodId) || {};
      const bPrice = Number(prod.boxPrice !== undefined ? prod.boxPrice : (prod.sellingPrice || 0));
      const hBox = Number(prod.hangersPerBox || 24);
      const hPrice = Number(prod.hangerPrice || (hBox > 0 ? (bPrice / hBox).toFixed(2) : 0));

      const unitPrice = unitType === 'Hanger' ? hPrice : bPrice;

      return {
        key,
        product: prodId,
        productObj: prod,
        unitType,
        quantity: Number(qty),
        unitPrice,
        totalAmount: Number(qty) * unitPrice
      };
    });

  const totalBookCases = activeSelectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalBookAmount = activeSelectedItems.reduce((sum, item) => sum + item.totalAmount, 0);

  // 📝 Submit Advance Order Booking
  const handleBookOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedCustomerId) {
      toast.warning('Please select a customer to book the order for', 'Customer Required');
      return;
    }

    if (!activeSelectedItems.length) {
      toast.warning('Please select at least one product case to book', 'Items Required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        deliveryDate,
        assignedVehicle: assignedVehicleId || null,
        remarks,
        items: activeSelectedItems.map(i => ({
          product: i.product,
          unitType: i.unitType,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      };

      const res = await API.post('/customer-orders', payload);
      playSaleSuccessSound();
      toast.success(res.data?.message || 'Advance order booked successfully! 📋', 'Order Booked');

      // Reset form
      setSelectedProductQuantities({});
      setRemarks('');
      setActiveTab('list');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book order', 'Booking Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚚 1-Click Deliver & Bill via POS
  const handleDeliverAndBill = (order) => {
    const preloadedCart = (order.items || []).map(item => {
      const prod = item.product || {};
      return {
        _id: prod._id || item.product,
        name: prod.name || item.productName,
        size: prod.size || item.size,
        sellingPrice: Number(item.unitPrice || prod.sellingPrice || 0),
        quantity: Number(item.quantity || 1),
        maxStock: 9999
      };
    });

    navigate('/pos', {
      state: {
        preloadedCustomer: order.customer?._id || order.customer,
        preloadedCart,
        linkedOrderId: order._id,
        orderNumber: order.orderNumber
      }
    });
  };

  // ❌ Cancel Order
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this advance order?')) return;
    try {
      await API.put(`/customer-orders/${orderId}/cancel`, { remarks: 'Cancelled by user' });
      toast.info('Order has been cancelled', 'Order Cancelled');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order', 'Cancellation Failed');
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (isCustSubmitting) return;

    setIsCustSubmitting(true);
    try {
      const res = await API.post('/customers', newCustomer);
      const created = res.data;
      setCustomers(prev => [...prev, created]);
      setSelectedCustomerId(created._id);
      setIsNewCustModalOpen(false);
      setNewCustomer({ shopName: '', ownerName: '', phone: '', address: '' });
      toast.success(`Customer "${created.shopName}" added!`, 'Customer Created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer', 'Error');
    } finally {
      setIsCustSubmitting(false);
    }
  };

  const selectedCustObj = customers.find(c => c._id === selectedCustomerId);

  // Filtered Products for Booking Tab
  const filteredBookProducts = products.filter(p =>
    p.name?.toLowerCase().includes(bookProductSearch.toLowerCase()) ||
    p.size?.toLowerCase().includes(bookProductSearch.toLowerCase())
  );

  // Filtered Orders for List Tab
  const filteredOrders = orders.filter(o => {
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchQuery = !q ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customer?.shopName?.toLowerCase().includes(q) ||
      o.customer?.phone?.includes(q) ||
      o.bookedBy?.name?.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      {/* Top Header & Adaptive Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 sm:w-7 sm:h-7 text-[#DC2626] dark:text-blue-400 shrink-0" />
            <span className="truncate">Orders & Bookings</span>
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Book customer field orders, consolidate warehouse demand, and deliver with 1-click billing.
          </p>
        </div>

        {/* Responsive Segmented Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`py-2 px-2.5 rounded-lg font-black text-xs transition flex items-center justify-center space-x-1 cursor-pointer truncate ${
              activeTab === 'book'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
            <span className="truncate">Book Order</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-2 px-2.5 rounded-lg font-black text-xs transition flex items-center justify-center space-x-1 cursor-pointer truncate ${
              activeTab === 'list'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('demand')}
            className={`py-2 px-2.5 rounded-lg font-black text-xs transition flex items-center justify-center space-x-1 cursor-pointer truncate ${
              activeTab === 'demand'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline truncate">Demand ({demandSummary?.totalBookedCases || 0})</span>
            <span className="sm:hidden truncate">Demand</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 📝 VISUAL PRODUCT GRID BOOKING */}
      {/* ========================================================================= */}
      {activeTab === 'book' && (
        <div className="space-y-3 sm:space-y-4 animate-fade-in">
          {/* Mobile Step Switcher Bar (Sticky on Mobile) */}
          <div className="grid grid-cols-2 lg:hidden bg-slate-200 dark:bg-slate-700/80 p-1 rounded-xl gap-1.5 font-black text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setBookMobileTab('items')}
              className={`py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                bookMobileTab === 'items'
                  ? 'bg-[#DC2626] text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>1. Products ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setBookMobileTab('summary')}
              className={`py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition relative ${
                bookMobileTab === 'summary'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>2. Summary ({totalBookCases} Cases)</span>
              {totalBookCases > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping ml-1" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Left Column: Interactive Visual Product Grid (7 cols) */}
            <div className={`lg:col-span-7 space-y-3 sm:space-y-4 ${bookMobileTab === 'items' ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 sm:space-y-4">
                
                {/* Search & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <Package className="w-4 h-4 text-pepsi-blue" />
                    <span>Product Catalog ({filteredBookProducts.length} Items)</span>
                  </h3>

                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search product, size..."
                      value={bookProductSearch}
                      onChange={(e) => setBookProductSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Visual Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBookProducts.map((prod) => {
                    const bPrice = Number(prod.boxPrice !== undefined ? prod.boxPrice : (prod.sellingPrice || 0));
                    const hBox = Number(prod.hangersPerBox || 24);
                    const hPrice = Number(prod.hangerPrice || (hBox > 0 ? (bPrice / hBox).toFixed(2) : 0));
                    const sealedStock = prod.sealedBoxStock !== undefined ? prod.sealedBoxStock : (prod.warehouseStock || 0);

                    const boxQty = selectedProductQuantities[`${prod._id}_Box`] || 0;
                    const hangerQty = selectedProductQuantities[`${prod._id}_Hanger`] || 0;

                    return (
                      <div
                        key={prod._id}
                        className="p-3.5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-black text-sm text-slate-900 dark:text-white capitalize truncate pr-1">
                              {prod.name}
                            </h4>
                            <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-md shrink-0">
                              {prod.category || 'Namkeen'}
                            </span>
                          </div>

                          {/* Box & Hanger Rates Info */}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <div>
                              <span className="text-slate-500 font-semibold block text-[10px]">Box: ₹{bPrice}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">1 Hanger: ₹{hPrice.toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-medium block">{hBox} Hangers = 1 Box</span>
                              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">{sealedStock} Boxes Stock</span>
                            </div>
                          </div>
                        </div>

                        {/* Dual Selling Unit Controls: Box & Hanger Steppers */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          {prod.sellFullBox !== false && (
                            <div>
                              {boxQty === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => addToBookCart(prod, 'Box')}
                                  className="w-full py-2 px-2 rounded-xl text-xs font-black bg-blue-50 dark:bg-blue-950/40 text-pepsi-blue border border-blue-200 dark:border-blue-800 hover:bg-pepsi-blue hover:text-white transition flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Add Box</span>
                                </button>
                              ) : (
                                <div className="flex items-center justify-between bg-pepsi-blue text-white rounded-xl p-1 shadow">
                                  <button
                                    type="button"
                                    onClick={() => updateBookCartQty(prod._id, 'Box', -1)}
                                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-sm flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    title="Decrease Box Quantity"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black px-1 truncate max-w-[65px] text-center">
                                    {boxQty} Box{boxQty > 1 ? 'es' : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateBookCartQty(prod._id, 'Box', 1)}
                                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-sm flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    title="Increase Box Quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {prod.sellIndividualHanger !== false && (
                            <div>
                              {hangerQty === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => addToBookCart(prod, 'Hanger')}
                                  className="w-full py-2 px-2 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white transition flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Add Hanger</span>
                                </button>
                              ) : (
                                <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl p-1 shadow">
                                  <button
                                    type="button"
                                    onClick={() => updateBookCartQty(prod._id, 'Hanger', -1)}
                                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-sm flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    title="Decrease Hanger Quantity"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black px-1 truncate max-w-[65px] text-center">
                                    {hangerQty} Hgr{hangerQty > 1 ? 's' : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateBookCartQty(prod._id, 'Hanger', 1)}
                                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-sm flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    title="Increase Hanger Quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredBookProducts.length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic text-xs">
                    No products matching search.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Booking Summary & Form (5 cols) */}
            <div className={`lg:col-span-5 space-y-3 sm:space-y-4 ${bookMobileTab === 'summary' ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 sm:space-y-4">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700/80">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <ClipboardList className="w-4 h-4 text-pepsi-blue" />
                    <span>Booking Details</span>
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold truncate max-w-[140px]">
                    By: {user?.name}
                  </span>
                </div>

                <form onSubmit={handleBookOrder} className="space-y-3 sm:space-y-3.5 text-xs">
                  {/* Customer Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Customer Shop *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsNewCustModalOpen(true)}
                        className="text-pepsi-blue dark:text-blue-400 font-extrabold hover:underline flex items-center space-x-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Customer</span>
                      </button>
                    </div>

                    <select
                      required
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">-- Choose Retail Customer --</option>
                      {customers.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.shopName} ({c.ownerName}) - Ph: {c.phone || 'No Phone'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Date & Van Route */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Delivery Date
                      </label>
                      <input
                        type="date"
                        required
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 truncate">
                        Route Van (Opt.)
                      </label>
                      <select
                        value={assignedVehicleId}
                        onChange={(e) => setAssignedVehicleId(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-900 dark:text-white text-xs truncate"
                      >
                        <option value="">Any Route Van</option>
                        {vehicles.map(v => (
                          <option key={v._id} value={v._id}>
                            {v.vehicleNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Selected Items Breakdown List */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Selected Products ({activeSelectedItems.length})
                      </span>
                      {activeSelectedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedProductQuantities({})}
                          className="text-[10px] text-red-500 hover:underline font-bold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 p-1.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700">
                      {activeSelectedItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex justify-between items-center text-xs font-semibold p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 gap-2"
                        >
                          <div className="truncate flex-1">
                            <span className="font-bold text-slate-900 dark:text-white block truncate text-[11px] sm:text-xs">
                              {item.productObj?.name} ({item.unitType})
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              ₹{item.unitPrice}/{item.unitType === 'Hanger' ? 'hanger' : 'box'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className="font-black text-[#DC2626] dark:text-blue-400 text-xs">
                              {item.quantity} {item.unitType === 'Hanger' ? 'Hgr' : 'Box'} (₹{item.totalAmount})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromOrder(item.key)}
                              className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {activeSelectedItems.length === 0 && (
                        <div className="py-6 text-center text-slate-400 italic text-xs">
                          👈 Select products to add to advance booking
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Notes */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Delivery Instructions
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. Subah 10 baje delivery, counter ke paas"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  {/* Summary Totals */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Total Demand:</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">{totalBookCases} Boxes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Estimated Total:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">₹{totalBookAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || activeSelectedItems.length === 0}
                    className="w-full py-3 bg-[#DC2626] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Booking Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm & Book Order ({totalBookCases} Boxes)</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Sticky Mobile Quick Navigation Action Bar */}
          {bookMobileTab === 'items' && totalBookCases > 0 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Selected Demand</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {totalBookCases} Boxes • <span className="text-emerald-600 dark:text-emerald-400">₹{totalBookAmount.toLocaleString('en-IN')}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBookMobileTab('summary')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center space-x-1 shadow-md shadow-emerald-600/30 active:scale-95 cursor-pointer"
              >
                <span>Review & Book ➔</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 🚚 ORDERS & DELIVERIES LIST */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-3 sm:space-y-4 animate-fade-in">
          {/* Responsive Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            {/* Status Pills with smooth scroll */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {['All', 'Booked', 'Loaded_In_Van', 'Delivered', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] sm:text-xs transition shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#DC2626] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st === 'Booked' ? '🟡 Booked' : st === 'Loaded_In_Van' ? '🚚 In Van' : st === 'Delivered' ? '🟢 Delivered' : st === 'Cancelled' ? '❌ Cancelled' : 'All Orders'}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shop, phone, order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredOrders.map((order) => {
              const isDelivered = order.status === 'Delivered';
              const isCancelled = order.status === 'Cancelled';
              const isLoaded = order.status === 'Loaded_In_Van';

              return (
                <div
                  key={order._id}
                  className="bg-white dark:bg-slate-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Order # & Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 dark:text-white tracking-wide">
                        {order.orderNumber}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : isCancelled
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                          : isLoaded
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}>
                        {order.status === 'Booked' ? '🟡 Booked' : order.status === 'Loaded_In_Van' ? '🚚 In Van' : order.status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-start space-x-2.5">
                      <CustomerAvatar name={order.customer?.shopName || 'C'} size="w-8 h-8 text-xs shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white block truncate">
                          {order.customer?.shopName}
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
                          <span>{order.customer?.ownerName}</span>
                          {order.customer?.phone && (
                            <>
                              <span>•</span>
                              <a href={`tel:${order.customer.phone}`} className="text-pepsi-blue hover:underline">
                                {order.customer.phone}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Items Breakdown */}
                    <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] sm:text-[11px]">
                          <span className="truncate text-slate-700 dark:text-slate-300 max-w-[180px]">
                            {item.productName || item.product?.name} ({item.size || item.product?.size || 'Standard'})
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            {item.quantity} Boxes
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Date & Worker Meta */}
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
                      <span>Del: {new Date(order.deliveryDate).toLocaleDateString('en-IN')}</span>
                      <span>By: {order.bookedBy?.name || 'Worker'}</span>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Total:</span>
                      <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                        {order.totalCases} Boxes • ₹{order.totalAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {!isDelivered && !isCancelled && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order._id)}
                          className="py-2 px-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-xl font-bold text-xs transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeliverAndBill(order)}
                          className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <span>Deliver & Bill ➔</span>
                        </button>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-center text-[10px] sm:text-[11px] font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-center space-x-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Delivered & Billed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <ClipboardList className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Orders Found</p>
                <p className="text-xs text-slate-400 mt-1">Book advance orders to see them listed here.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className="mt-3 px-4 py-2 bg-[#DC2626] hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow transition cursor-pointer"
                >
                  + Book First Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 📊 WAREHOUSE DEMAND SUMMARY */}
      {/* ========================================================================= */}
      {activeTab === 'demand' && (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 sm:space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3 sm:pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-pepsi-blue" />
                <span>Consolidated Route Demand Sheet</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Cases required to fulfill all active pending booked orders in the warehouse.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase">Pending Orders</span>
                <span className="font-black text-sm sm:text-lg text-[#DC2626] dark:text-blue-300">{demandSummary?.totalBookedOrdersCount || 0}</span>
              </div>
              <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold block uppercase">Total Cases</span>
                <span className="font-black text-sm sm:text-lg text-emerald-600 dark:text-emerald-400">{demandSummary?.totalBookedCases || 0}</span>
              </div>
            </div>
          </div>

          {/* Demand Table with responsive wrapper */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap sm:whitespace-normal">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5 sm:p-3">Product Name & Size</th>
                  <th className="p-2.5 sm:p-3 text-center">Orders Count</th>
                  <th className="p-2.5 sm:p-3 text-center">Cases Required</th>
                  <th className="p-2.5 sm:p-3 text-right">Warehouse Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {(demandSummary?.demandList || []).map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-2.5 sm:p-3 font-extrabold text-slate-900 dark:text-white">
                      {d.productName || d.product?.name} ({d.size || d.product?.size || 'Std'})
                    </td>
                    <td className="p-2.5 sm:p-3 text-center font-bold text-slate-600 dark:text-slate-300">
                      {d.ordersCount} Shops
                    </td>
                    <td className="p-2.5 sm:p-3 text-center font-black text-sm sm:text-lg text-[#DC2626] dark:text-blue-400">
                      {d.totalQuantity} Cases
                    </td>
                    <td className="p-2.5 sm:p-3 text-right font-bold">
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-black ${
                        (d.product?.warehouseStock || 0) >= d.totalQuantity
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                      }`}>
                        {d.product?.warehouseStock || 0} Cases in WH
                      </span>
                    </td>
                  </tr>
                ))}

                {(demandSummary?.demandList || []).length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-400 italic">
                      No active pending booked orders right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => navigate('/loading')}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#DC2626] hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-blue-600/25 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Go to Van Loading Page ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👤 QUICK NEW CUSTOMER CREATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewCustModalOpen}
        onClose={() => setIsNewCustModalOpen(false)}
        title="Add New Customer Shop"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 sm:space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sharma Cold Drinks"
              value={newCustomer.shopName}
              onChange={(e) => setNewCustomer({ ...newCustomer, shopName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Sharma"
              value={newCustomer.ownerName}
              onChange={(e) => setNewCustomer({ ...newCustomer, ownerName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Address / Landmark</label>
            <input
              type="text"
              placeholder="e.g. Near Main Market Crossing"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isCustSubmitting}
            className="w-full py-3 bg-[#DC2626] hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow transition disabled:opacity-50 cursor-pointer"
          >
            {isCustSubmitting ? 'Adding Customer...' : 'Save & Select Customer'}
          </button>
        </form>
      </Modal>

    </div>
  );
}
