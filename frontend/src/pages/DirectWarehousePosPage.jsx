import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import InvoiceModal from '../components/invoice/InvoiceModal';
import SaleSuccessModal from '../components/pos/SaleSuccessModal';
import SaleConfirmModal from '../components/pos/SaleConfirmModal';
import PaymentWizardModal from '../components/pos/PaymentWizardModal';
import CustomerAvatar from '../components/common/CustomerAvatar';
import Modal from '../components/common/Modal';
import { playCartBeep, playSaleSuccessSound } from '../utils/audio';
import { ShoppingCart, Plus, Minus, Trash2, Search, UserPlus, CheckCircle, AlertTriangle, Package, Loader2, Store, Tag, ChevronRight } from 'lucide-react';

export default function DirectWarehousePosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPaymentWizardOpen, setIsPaymentWizardOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [mobileTab, setMobileTab] = useState('items'); // 'items' or 'cart'

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustSubmitting, setIsCustSubmitting] = useState(false);

  const userId = user?._id || 'guest';
  const cartKeyName = `balaji_direct_pos_cart_${userId}`;

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`balaji_direct_pos_cart_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitUpiAmount, setSplitUpiAmount] = useState('');
  const [creditCashAmount, setCreditCashAmount] = useState('');
  const [creditUpiAmount, setCreditUpiAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');

  const [loading, setLoading] = useState(true);
  const [generatedSale, setGeneratedSale] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: ''
  });

  // Save cart to user-isolated localStorage whenever cart or user changes
  useEffect(() => {
    if (user?._id) {
      localStorage.setItem(`balaji_direct_pos_cart_${user._id}`, JSON.stringify(cart));
    }
  }, [cart, user?._id]);

  // Sync cart state if logged-in user changes (e.g. switching accounts)
  useEffect(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`balaji_direct_pos_cart_${user._id}`);
        setCart(saved ? JSON.parse(saved) : []);
        // Clean up legacy global shared cart key
        localStorage.removeItem('pepsi_direct_pos_cart');
      } catch (e) {
        setCart([]);
      }
    }
  }, [user?._id]);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        API.get('/products'),
        API.get('/customers')
      ]);
      setProducts(pRes.data || []);
      const cList = cRes.data || [];
      setCustomers(cList);
    } catch (err) {
      console.error('Error fetching Direct Warehouse POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = (productObj, unitType = 'Box') => {
    if (!selectedCustomerId) {
      toast.warning('Please select a customer first', 'Customer Required');
      return;
    }

    const product = productObj.product || productObj;
    const hangersPerBox = Number(product.hangersPerBox || 24);
    const boxPrice = Number(product.boxPrice !== undefined ? product.boxPrice : (product.sellingPrice || 0));
    const hangerPrice = Number(product.hangerPrice || (hangersPerBox > 0 ? (Math.ceil(boxPrice / hangersPerBox) + 1) : 0));
    const unitPrice = unitType === 'Hanger' ? hangerPrice : boxPrice;

    // Calculate total available hangers in warehouse
    const sealedBoxes = Number(product.sealedBoxStock !== undefined ? product.sealedBoxStock : (product.warehouseStock || 0));
    const looseHangers = Number(product.looseHangerStock || 0);
    const availHangers = (sealedBoxes * hangersPerBox) + looseHangers;

    // Calculate current requested hangers in cart for this product
    let currentCartHangers = 0;
    cart.forEach(item => {
      if (item.product._id === product._id) {
        const itemHangers = item.unitType === 'Hanger' ? item.quantity : (item.quantity * hangersPerBox);
        currentCartHangers += itemHangers;
      }
    });

    const additionalHangers = unitType === 'Hanger' ? 1 : hangersPerBox;
    const newTotalRequestedHangers = currentCartHangers + additionalHangers;

    // ⛔ BLOCK ADDING TO CART IF INSUFFICIENT WAREHOUSE STOCK
    if (newTotalRequestedHangers > availHangers) {
      toast.warning(
        `⛔ Insufficient Warehouse Stock for "${product.name}"! Available: ${sealedBoxes} Boxes (${looseHangers} Loose Hangers). Cannot add more ${unitType}s.`,
        'Stock Limit Reached'
      );
      return;
    }
    
    const cartKey = `${product._id}_${unitType}`;
    const existingIndex = cart.findIndex(c => c.cartKey === cartKey || (c.product._id === product._id && c.unitType === unitType));

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        cartKey,
        product,
        unitType, // 'Box' or 'Hanger'
        quantity: 1,
        unitPrice: Number(unitPrice.toFixed(2))
      }]);
    }
    playCartBeep();
  };

  const updateCartQty = (cartKey, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter(c => (c.cartKey ? c.cartKey !== cartKey : `${c.product._id}_${c.unitType || 'Box'}` !== cartKey)));
      return;
    }
    const existingIndex = cart.findIndex(c => (c.cartKey ? c.cartKey === cartKey : `${c.product._id}_${c.unitType || 'Box'}` === cartKey));
    if (existingIndex > -1) {
      const targetItem = cart[existingIndex];
      const product = targetItem.product;
      const hangersPerBox = Number(product.hangersPerBox || 24);

      // Calculate total available hangers in warehouse
      const sealedBoxes = Number(product.sealedBoxStock !== undefined ? product.sealedBoxStock : (product.warehouseStock || 0));
      const looseHangers = Number(product.looseHangerStock || 0);
      const availHangers = (sealedBoxes * hangersPerBox) + looseHangers;

      // Calculate new total requested hangers if quantity changes
      let otherHangers = 0;
      cart.forEach(item => {
        if (item.product._id === product._id && item.cartKey !== cartKey && `${item.product._id}_${item.unitType || 'Box'}` !== cartKey) {
          otherHangers += (item.unitType === 'Hanger' ? item.quantity : (item.quantity * hangersPerBox));
        }
      });
      const newTargetHangers = targetItem.unitType === 'Hanger' ? newQty : (newQty * hangersPerBox);
      const totalNewHangers = otherHangers + newTargetHangers;

      if (totalNewHangers > availHangers) {
        toast.warning(
          `⛔ Stock Limit Exceeded! Only ${sealedBoxes} Boxes (${looseHangers} Loose Hangers) available in Warehouse for "${product.name}".`,
          'Stock Limit Reached'
        );
        return;
      }

      if (newQty > targetItem.quantity) {
        playCartBeep();
      }
      const updated = [...cart];
      updated[existingIndex].quantity = newQty;
      setCart(updated);
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all items from warehouse sale cart?')) {
      setCart([]);
      if (user?._id) {
        localStorage.removeItem(`balaji_direct_pos_cart_${user._id}`);
      }
      localStorage.removeItem('pepsi_direct_pos_cart');
    }
  };

  let subTotal = 0;
  let totalCases = 0;
  cart.forEach(item => {
    subTotal += item.quantity * item.unitPrice;
    totalCases += (Number(item.quantity) || 0);
  });

  const selectedCustomerObj = customers.find(c => c._id === selectedCustomerId);

  useEffect(() => {
    if (selectedCustomerObj?.discountPercentage > 0 && subTotal > 0) {
      const calculatedDisc = Math.round((subTotal * selectedCustomerObj.discountPercentage) / 100);
      setDiscountAmount(calculatedDisc.toString());
    }
  }, [selectedCustomerId, selectedCustomerObj?.discountPercentage, subTotal]);

  const numericDisc = Math.min(subTotal, Math.max(0, Number(discountAmount || 0)));
  const netTotal = Math.max(0, Math.round(subTotal - numericDisc));

  let actualPaidAmount = netTotal;
  if (paymentMethod === 'Credit') {
    actualPaidAmount = Number(creditCashAmount || 0) + Number(creditUpiAmount || 0);
  } else if (paymentMethod === 'Split') {
    actualPaidAmount = Number(splitCashAmount || 0) + Number(splitUpiAmount || 0);
  }
  const prospectiveDue = Math.max(0, netTotal - actualPaidAmount);

  const isCreditExceeded = (paymentMethod === 'Credit' || paymentMethod === 'Split') && 
    prospectiveDue > 0 && 
    selectedCustomerObj?.creditLimit > 0 && 
    ((selectedCustomerObj.outstandingBalance || 0) + prospectiveDue) > selectedCustomerObj.creditLimit;

  const handleProcessSale = () => {
    if (isSubmitting) return;
    if (!selectedCustomerId) {
      toast.warning('Please select a customer first', 'Customer Required');
      return;
    }
    if (cart.length === 0) {
      toast.warning('Your cart is empty', 'Empty Cart');
      return;
    }

    // Open multi-step Payment Wizard Modal
    setIsPaymentWizardOpen(true);
  };

  const handleExecuteSaleWithData = async (paymentData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const salePayload = {
        vehicleId: 'warehouse_direct',
        customerId: selectedCustomerId,
        items: cart.map(c => ({
          product: c.product._id,
          unitType: c.unitType || 'Box',
          quantity: c.quantity,
          unitPrice: c.unitPrice
        })),
        discount: numericDisc,
        paymentMethod: paymentData.paymentMethod,
        paidAmount: paymentData.paidAmount,
        cashAmount: paymentData.cashAmount,
        upiAmount: paymentData.upiAmount
      };

      const res = await API.post('/sales', salePayload);
      
      playSaleSuccessSound();

      setGeneratedSale(res.data);
      setIsPaymentWizardOpen(false);
      setIsSuccessModalOpen(true);
      
      setCart([]);
      setDiscountAmount('');
      setSplitCashAmount('');
      setSplitUpiAmount('');
      setCreditCashAmount('');
      setCreditUpiAmount('');
      setPaidAmount('');
      if (user?._id) {
        localStorage.removeItem(`balaji_direct_pos_cart_${user._id}`);
      }
      localStorage.removeItem('pepsi_direct_pos_cart');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Direct Warehouse POS Sale failed', 'Sale Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (isCustSubmitting) return;
    setIsCustSubmitting(true);
    try {
      const res = await API.post('/customers', newCustomer);
      setCustomers([...customers, res.data]);
      setSelectedCustomerId(res.data._id);
      setIsNewCustModalOpen(false);
      setNewCustomer({ shopName: '', ownerName: '', phone: '', address: '' });
      toast.success(`Customer "${res.data?.shopName}" registered successfully! 👤`, 'Customer Added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer', 'Error');
    } finally {
      setIsCustSubmitting(false);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('All');

  // Extract all unique categories dynamically
  const directCategories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const prodCategory = p.category || 'Namkeen';
    const matchesCat = selectedCategory === 'All' || prodCategory === selectedCategory;
    const prodName = p.name ? String(p.name).toLowerCase() : '';
    const sTerm = (searchProduct || '').toLowerCase();
    const matchesSearch = !searchProduct || prodName.includes(sTerm) || prodCategory.toLowerCase().includes(sTerm);
    return matchesCat && matchesSearch;
  });

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0051A5] via-blue-800 to-[#002B66] text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-[#E31E24]">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
            <Store className="w-6 h-6 text-[#FFC72C]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center space-x-2">
              <span>Direct Warehouse Counter</span>
              <span className="px-2 py-0.5 bg-[#FFC72C] text-slate-950 rounded-md text-[10px] font-black uppercase">Balaji Wafers</span>
            </h1>
            <p className="text-xs text-blue-100 font-semibold">
              Sell Namkeen Boxes & Loose Hangers directly to visiting retail customers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewCustModalOpen(true)}
          className="flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs border border-white/20 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Customer Selection Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              Select Customer Shop *
            </label>
            <div className="flex items-center space-x-2">
              {selectedCustomerObj && (
                <CustomerAvatar name={selectedCustomerObj.shopName} size="sm" />
              )}
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className={`w-full p-2.5 rounded-xl font-extrabold text-xs focus:ring-2 focus:ring-pepsi-blue transition-all cursor-pointer ${
                  !selectedCustomerId
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 text-slate-900 dark:text-amber-200'
                    : 'bg-white dark:bg-slate-800 border-2 border-pepsi-blue dark:border-blue-500 text-slate-900 dark:text-white'
                }`}
              >
                <option value="" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white font-black">
                  -- Select Customer --
                </option>
                {customers.map((c) => (
                  <option
                    key={c._id}
                    value={c._id}
                    className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white font-extrabold py-1"
                  >
                    {c.shopName} ({c.ownerName}) - Limit: ₹{c.creditLimit?.toLocaleString()} | Bal: ₹{c.outstandingBalance?.toLocaleString()}
                    {c.discountPercentage > 0 ? ` [${c.discountPercentage}% OFF]` : ''}
                  </option>
                ))}
              </select>
            </div>
            {!selectedCustomerId && (
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1.5 flex items-center space-x-1">
                <span>⚠️ First select the customer to add items to sale cart</span>
              </p>
            )}
          </div>

          {selectedCustomerObj && (
            <div className="flex items-center space-x-3 text-xs bg-slate-50 dark:bg-slate-700/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Credit Limit</span>
                <span className="font-extrabold text-pepsi-blue dark:text-blue-400">₹{selectedCustomerObj.creditLimit?.toLocaleString()}</span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-600 pl-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Balance</span>
                <span className={`font-black ${selectedCustomerObj.outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  ₹{selectedCustomerObj.outstandingBalance?.toLocaleString()}
                </span>
              </div>
              {selectedCustomerObj.discountPercentage > 0 && (
                <div className="border-l border-slate-200 dark:border-slate-600 pl-3">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Special Discount</span>
                  <span className="font-black text-emerald-600 flex items-center space-x-0.5">
                    <Tag className="w-3 h-3" />
                    <span>{selectedCustomerObj.discountPercentage}%</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tab Toggle Switcher */}
      <div className="grid grid-cols-2 lg:hidden bg-slate-200 dark:bg-slate-700/80 p-1.5 rounded-2xl gap-2 font-black text-xs shadow-inner">
        <button
          type="button"
          onClick={() => setMobileTab('items')}
          className={`py-3 rounded-xl flex items-center justify-center space-x-2 transition ${
            mobileTab === 'items'
              ? 'bg-pepsi-blue text-white shadow-md'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>1. Select Items ({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`py-3 rounded-xl flex items-center justify-center space-x-2 transition relative ${
            mobileTab === 'cart'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>2. View Cart ({cart.length}) {netTotal > 0 ? `• ₹${netTotal}` : ''}</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow animate-bounce">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Catalog Selection (7 cols) */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'items' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <Package className="w-4 h-4 text-pepsi-blue" />
                <span>Balaji Products ({filteredProducts.length} Items)</span>
              </h3>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter item..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* 🏷️ Category Filter Pills Bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {directCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#0051A5] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map((prod) => {
                const bPrice = Number(prod.boxPrice !== undefined ? prod.boxPrice : (prod.sellingPrice || 0));
                const hBox = Number(prod.hangersPerBox || 24);
                const hPrice = Number(prod.hangerPrice || (hBox > 0 ? (bPrice / hBox).toFixed(2) : 0));
                const sealedStock = prod.sealedBoxStock !== undefined ? prod.sealedBoxStock : (prod.warehouseStock || 0);

                const boxCartItem = cart.find(c => c.product._id === prod._id && (c.unitType || 'Box') === 'Box');
                const hangerCartItem = cart.find(c => c.product._id === prod._id && c.unitType === 'Hanger');

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
                          {!boxCartItem ? (
                            <button
                              type="button"
                              onClick={() => addToCart(prod, 'Box')}
                              className="w-full py-2 px-2 rounded-xl text-xs font-black bg-blue-50 dark:bg-blue-950/40 text-pepsi-blue border border-blue-200 dark:border-blue-800 hover:bg-pepsi-blue hover:text-white transition flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Box</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between bg-pepsi-blue text-white rounded-xl p-1 shadow">
                              <button
                                type="button"
                                onClick={() => updateCartQty(boxCartItem.cartKey || `${prod._id}_Box`, boxCartItem.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-sm flex items-center justify-center transition active:scale-95 cursor-pointer"
                                title="Decrease Box Quantity"
                              >
                                -
                              </button>
                              <span className="text-xs font-black px-1 truncate max-w-[65px] text-center">
                                {boxCartItem.quantity} Box{boxCartItem.quantity > 1 ? 'es' : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(boxCartItem.cartKey || `${prod._id}_Box`, boxCartItem.quantity + 1)}
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
                          {!hangerCartItem ? (
                            <button
                              type="button"
                              onClick={() => addToCart(prod, 'Hanger')}
                              className="w-full py-2 px-2 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white transition flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Hanger</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl p-1 shadow">
                              <button
                                type="button"
                                onClick={() => updateCartQty(hangerCartItem.cartKey || `${prod._id}_Hanger`, hangerCartItem.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-sm flex items-center justify-center transition active:scale-95 cursor-pointer"
                                title="Decrease Hanger Quantity"
                              >
                                -
                              </button>
                              <span className="text-xs font-black px-1 truncate max-w-[65px] text-center">
                                {hangerCartItem.quantity} Hgr{hangerCartItem.quantity > 1 ? 's' : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(hangerCartItem.cartKey || `${prod._id}_Hanger`, hangerCartItem.quantity + 1)}
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
              {filteredProducts.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400 italic text-xs space-y-1">
                  <p className="font-bold text-slate-600 dark:text-slate-300">No products in catalog.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart & Billing Panel (5 cols) */}
        <div className={`lg:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4 ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Customer Cart Items</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-bold">{cart.length} Items</span>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[10px] font-bold text-red-500 hover:underline px-1.5 py-0.5 bg-red-50 dark:bg-red-950/40 rounded"
                  >
                    Clear Cart
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[280px] overflow-y-auto my-2 pr-1">
              {cart.map((c, idx) => {
                const cartKey = c.cartKey || `${c.product._id}_${c.unitType || 'Box'}`;
                const unitType = c.unitType || 'Box';
                const lineTotal = (c.quantity * c.unitPrice).toFixed(2);

                return (
                  <div key={cartKey || idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {c.product.name}
                        </p>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                          unitType === 'Hanger' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {unitType}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">₹{c.unitPrice} / {unitType} • Total: ₹{lineTotal}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button onClick={() => updateCartQty(cartKey, c.quantity - 1)} className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-red-100 text-slate-700 dark:text-slate-300 hover:text-red-600 transition">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-black px-1.5 text-sm text-slate-900 dark:text-white">{c.quantity}</span>
                      <button onClick={() => updateCartQty(cartKey, c.quantity + 1)} className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 text-slate-700 dark:text-slate-300 hover:text-blue-600 transition">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => updateCartQty(cartKey, 0)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {cart.length === 0 && (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  Cart is empty. Click "+ Add Box" or "+ Add Hanger" to add items to customer bill.
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-xl space-y-3 text-xs border border-slate-200 dark:border-slate-600">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span>Sub Total:</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center space-x-1">
                  <span>Discount (₹):</span>
                  {selectedCustomerObj?.discountPercentage > 0 && (
                    <span className="text-[10px] text-emerald-600 font-black">({selectedCustomerObj.discountPercentage}% Auto)</span>
                  )}
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-right font-bold text-xs text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div className="flex justify-between items-center text-base font-black text-slate-900 dark:text-white border-t pt-2 border-slate-200 dark:border-slate-600">
                <span>Net Total:</span>
                <span className="text-pepsi-blue dark:text-blue-400 text-lg">₹{netTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Big Proceed to Payment Button (Triggers Multi-Step Payment Wizard) */}
            <button
              type="button"
              onClick={handleProcessSale}
              disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              className={`w-full py-4 font-black text-sm rounded-2xl transition flex items-center justify-center space-x-2 mt-2 ${
                cart.length === 0 || !selectedCustomerId || isSubmitting
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none opacity-60'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xl shadow-emerald-500/25 active:scale-95 cursor-pointer'
              }`}
            >
              <span>
                {!selectedCustomerId 
                  ? 'Select Customer First' 
                  : cart.length === 0 
                  ? 'Cart is Empty (Add Items)' 
                  : `Proceed to Payment (₹${netTotal.toLocaleString()})`}
              </span>
              {cart.length > 0 && selectedCustomerId && (
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Sticky Checkout Banner (When items are in cart) */}
      {mobileTab === 'items' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-400/40 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-xs">{cart.length} Item(s) Selected</p>
              <p className="font-black text-sm text-emerald-200">Net Total: ₹{netTotal}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileTab('cart')}
            className="px-4 py-2 bg-white text-emerald-800 font-black text-xs rounded-xl shadow hover:bg-emerald-50 transition active:scale-95 flex items-center space-x-1"
          >
            <span>View Cart & Bill</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* 🚀 MULTI-STEP PAYMENT WIZARD MODAL (Choose Method -> Split / Credit Details -> Confirm) */}
      <PaymentWizardModal
        isOpen={isPaymentWizardOpen}
        onClose={() => setIsPaymentWizardOpen(false)}
        onConfirmSale={handleExecuteSaleWithData}
        customerName={selectedCustomerObj?.shopName || 'Selected Customer'}
        totalAmount={netTotal}
        totalCases={totalCases}
        isCreditExceeded={isCreditExceeded}
        creditLimit={selectedCustomerObj?.creditLimit || 0}
        currentDue={selectedCustomerObj?.outstandingBalance || 0}
        isSubmitting={isSubmitting}
      />

      {/* 🌟 1. SALE COMPLETED SUCCESS MODAL (MATCHING IMAGE EXACTLY) */}
      <SaleSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onViewBill={() => {
          setIsSuccessModalOpen(false);
          setIsInvoiceOpen(true);
        }}
        sale={generatedSale}
      />

      {/* 📄 2. Detailed Invoice Modal (Opened via 'View Bill') */}
      {generatedSale && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          sale={generatedSale}
          isNewSale={true}
        />
      )}

      {/* Add New Customer Modal */}
      <Modal isOpen={isNewCustModalOpen} onClose={() => setIsNewCustModalOpen(false)} title="Quick Add Customer Shop">
        <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Cold Drink Corner"
              value={newCustomer.shopName}
              onChange={(e) => setNewCustomer({ ...newCustomer, shopName: e.target.value })}
              className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={newCustomer.ownerName}
                onChange={(e) => setNewCustomer({ ...newCustomer, ownerName: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Address / Route Location</label>
            <input
              type="text"
              placeholder="e.g. Near Bus Stand, Main Market"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isCustSubmitting}
            className="w-full py-2.5 bg-[#DC2626] text-white font-bold rounded-lg hover:bg-blue-700 transition"
          >
            {isCustSubmitting ? 'Saving Customer...' : 'Save & Select Customer'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
