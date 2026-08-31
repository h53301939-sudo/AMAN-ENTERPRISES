import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import InvoiceModal from '../components/invoice/InvoiceModal';
import CustomerDetailsModal from '../components/customer/CustomerDetailsModal';
import CollectionPaymentModal from '../components/customer/CollectionPaymentModal';
import ManualDueModal from '../components/customer/ManualDueModal';
import CustomerAvatar from '../components/common/CustomerAvatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { playSaleSuccessSound } from '../utils/audio';
import {
  Users,
  Plus,
  PlusCircle,
  CreditCard,
  DollarSign,
  Search,
  CheckCircle,
  Edit2,
  AlertCircle,
  Trash2,
  Tag,
  Loader2,
  FileText,
  Eye,
  Phone,
  MapPin,
  Receipt,
  Lock
} from 'lucide-react';

export default function CustomersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Customer 360° Profile & Invoice Details Modal State
  const [selectedCustDetails, setSelectedCustDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Payment Modal State
  const [selectedCust, setSelectedCust] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Manual Due Modal State
  const [selectedCustForDue, setSelectedCustForDue] = useState(null);
  const [isManualDueModalOpen, setIsManualDueModalOpen] = useState(false);
  const [isManualDueSubmitting, setIsManualDueSubmitting] = useState(false);

  // Edit / Add Customer Modal State
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [custForm, setCustForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    creditLimit: '5000',
    discountPercentage: '0',
    openingBalance: '0'
  });
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await API.get(`/customers?search=${search}`);
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  // Open 360 Customer Details Modal
  const handleOpenCustomerDetails = (cust) => {
    setSelectedCustDetails(cust);
    setIsDetailsModalOpen(true);
  };

  // Open Invoice Modal from Customer Details
  const handleOpenInvoiceFromDetails = (sale) => {
    setActiveInvoice(sale);
    setIsInvoiceModalOpen(true);
  };

  // Handle Payment Modal
  const handleOpenPayment = (cust) => {
    setSelectedCust(cust);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmCollection = async (collectionData) => {
    if (isPaymentSubmitting) return; // LOCK AGAINST DOUBLE CLICKING
    setIsPaymentSubmitting(true);
    try {
      await API.post(`/customers/${selectedCust._id}/payments`, {
        amount: Number(collectionData.amount),
        paymentMethod: collectionData.paymentMethod,
        cashAmount: Number(collectionData.cashAmount || 0),
        upiAmount: Number(collectionData.upiAmount || 0),
        remarks: collectionData.remarks || ''
      });
      playSaleSuccessSound();
      toast.success(
        `Payment of ₹${Number(collectionData.amount).toLocaleString('en-IN')} (${collectionData.paymentMethod}) recorded for ${selectedCust.shopName}! 💰`,
        'Payment Recorded'
      );
      setIsPaymentModalOpen(false);
      setSelectedCust(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment', 'Payment Failed');
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  // Handle Manual Due Addition Modal
  const handleOpenManualDue = (cust) => {
    setSelectedCustForDue(cust);
    setIsManualDueModalOpen(true);
  };

  const handleConfirmManualDue = async ({ amount, reason }) => {
    if (isManualDueSubmitting) return; // LOCK AGAINST DOUBLE CLICKING
    setIsManualDueSubmitting(true);
    try {
      await API.post(`/customers/${selectedCustForDue._id}/manual-due`, {
        amount: Number(amount),
        reason
      });
      playSaleSuccessSound();
      toast.success(
        `Added manual due of ₹${Number(amount).toLocaleString('en-IN')} to ${selectedCustForDue.shopName}! 📝`,
        'Due Added'
      );
      setIsManualDueModalOpen(false);
      setSelectedCustForDue(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add manual due', 'Error');
    } finally {
      setIsManualDueSubmitting(false);
    }
  };

  // Handle Add / Edit Customer Modal
  const handleOpenAddCustomer = () => {
    setEditingCust(null);
    setFormError('');
    setCustForm({
      shopName: '',
      ownerName: '',
      phone: '',
      address: '',
      creditLimit: 5000,
      discountPercentage: 0,
      openingBalance: 0
    });
    setIsCustModalOpen(true);
  };

  const handleOpenEditCustomer = (c) => {
    setEditingCust(c);
    setFormError('');
    setCustForm({
      shopName: c.shopName || '',
      ownerName: c.ownerName || '',
      phone: c.phone || '',
      address: c.address || '',
      creditLimit: c.creditLimit || 5000,
      discountPercentage: c.discountPercentage || 0,
      openingBalance: 0
    });
    setIsCustModalOpen(true);
  };

  const handleCustSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // LOCK AGAINST DOUBLE CLICKING
    setFormError('');

    if (!custForm.shopName || !custForm.ownerName || !custForm.phone) {
      setFormError('Shop Name, Owner Name, and Phone are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        shopName: custForm.shopName,
        ownerName: custForm.ownerName,
        phone: custForm.phone,
        address: custForm.address,
        ...(isAdmin && {
          creditLimit: Number(custForm.creditLimit || 5000),
          discountPercentage: Number(custForm.discountPercentage || 0),
          openingBalance: Number(custForm.openingBalance || 0)
        })
      };

      if (editingCust) {
        await API.put(`/customers/${editingCust._id}`, payload);
        toast.success(`Customer "${custForm.shopName}" profile updated! 👤`, 'Customer Updated');
      } else {
        await API.post('/customers', payload);
        toast.success(`Customer "${custForm.shopName}" registered successfully! 👤`, 'Customer Added');
      }

      setIsCustModalOpen(false);
      fetchCustomers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save customer';
      setFormError(msg);
      toast.error(msg, 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCust = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer shop?')) {
      try {
        await API.delete(`/customers/${id}`);
        toast.success('Customer shop deleted successfully.', 'Customer Removed');
        fetchCustomers();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete customer', 'Delete Error');
      }
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span className="w-1.5 h-6 bg-[#DC2626] rounded-full inline-block mr-1" />
            <span>Customer Directory & Credit Accounts</span>
          </h1>
          
        </div>
        <button
          onClick={handleOpenAddCustomer}
          className="flex items-center space-x-2 px-4 py-2.5 bg-[#DC2626] hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Customer Shop</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop name, owner name, or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#DC2626] dark:text-white"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {customers.map((c) => (
          <div
            key={c._id}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-[#DC2626]/40 transition space-y-4 flex flex-col justify-between group"
          >
            <div>
              {/* Header with Title & Action Buttons */}
              <div className="flex items-start justify-between gap-3">
                <div 
                  onClick={() => handleOpenCustomerDetails(c)}
                  className="cursor-pointer hover:text-[#DC2626] transition flex items-center space-x-3 flex-1 min-w-0"
                >
                  <CustomerAvatar name={c.shopName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-[#DC2626] transition truncate">
                        {c.shopName}
                      </h3>
                      {c.discountPercentage > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] rounded-full flex items-center space-x-1 shrink-0">
                          <Tag className="w-3 h-3" />
                          <span>{c.discountPercentage}% OFF</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{c.ownerName} ({c.phone})</p>
                  </div>
                </div>

                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleOpenCustomerDetails(c)}
                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#DC2626] dark:text-blue-300 hover:bg-blue-100 transition"
                    title="View 360° Profile & All Invoices"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenManualDue(c)}
                    className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition"
                    title="Add Manual Due / Past Balance"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditCustomer(c)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    title="Edit Customer & Discount"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCust(c._id)}
                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                    title="Delete Shop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{c.address || 'Address not set'}</span>
              </p>
            </div>

            {/* Financial Ledger Summary */}
            <div className="border-t border-b py-2.5 border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Credit Limit:</span>
                <span className="font-extrabold text-[#DC2626] dark:text-blue-400 text-sm">
                  ₹{c.creditLimit?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-medium">Outstanding Due:</span>
                  <button
                    onClick={() => handleOpenManualDue(c)}
                    className="text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-0.5 cursor-pointer"
                    title="Add Manual Due / Past Udhaar"
                  >
                    <span>+ Add Due</span>
                  </button>
                </div>
                <span className={`font-black ${c.outstandingBalance > 0 ? 'text-red-600 text-sm' : 'text-emerald-600 text-sm'}`}>
                  ₹{c.outstandingBalance?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions: View Invoices & Collect Payment */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleOpenCustomerDetails(c)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
              >
                <Receipt className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>All Invoices</span>
              </button>

              <button
                onClick={() => handleOpenPayment(c)}
                disabled={c.outstandingBalance <= 0}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition flex items-center justify-center space-x-1 shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Collect Due</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 📜 CUSTOMER 360° PROFILE & INVOICES MODAL */}
      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        customerId={selectedCustDetails?._id}
        initialCustomer={selectedCustDetails}
        onOpenInvoice={handleOpenInvoiceFromDetails}
      />

      {/* 🖨️ DETAILED INVOICE MODAL (FOR PRINTING OR VIEWING BILL PDF) */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        sale={activeInvoice}
      />

      {/* 💳 SIGNATURE PAYMENT COLLECTION WIZARD MODAL (NO CREDIT OPTION) */}
      <CollectionPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedCust(null);
        }}
        onConfirmCollection={handleConfirmCollection}
        customer={selectedCust}
        isSubmitting={isPaymentSubmitting}
      />

      {/* ➕ MANUAL DUE / OPENING BALANCE MODAL */}
      <ManualDueModal
        isOpen={isManualDueModalOpen}
        onClose={() => {
          setIsManualDueModalOpen(false);
          setSelectedCustForDue(null);
        }}
        onConfirmManualDue={handleConfirmManualDue}
        customer={selectedCustForDue}
        isSubmitting={isManualDueSubmitting}
      />

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isCustModalOpen}
        onClose={() => setIsCustModalOpen(false)}
        title={editingCust ? `Edit Customer - ${editingCust.shopName}` : 'Add New Customer Shop'}
      >
        <form onSubmit={handleCustSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop / Business Name *</label>
            <input
              type="text"
              required
              value={custForm.shopName}
              onChange={(e) => setCustForm({ ...custForm, shopName: e.target.value })}
              placeholder="e.g. Krishna General Store & Cold Drinks"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name *</label>
              <input
                type="text"
                required
                value={custForm.ownerName}
                onChange={(e) => setCustForm({ ...custForm, ownerName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={custForm.phone}
                onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Credit Limit (₹)</span>
                {isAdmin ? (
                  <span className="text-pepsi-blue text-[10px] font-black">(Editable)</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center space-x-1">
                    <Lock className="w-3 h-3 inline" />
                    <span>Admin Only</span>
                  </span>
                )}
              </label>
              <input
                type="number"
                required
                disabled={!isAdmin}
                value={custForm.creditLimit}
                onChange={(e) => setCustForm({ ...custForm, creditLimit: e.target.value })}
                placeholder="5000"
                className={`w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black transition ${
                  !isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80 text-slate-500' : ''
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Special Discount (%)</span>
                {isAdmin ? (
                  <span className="text-emerald-600 text-[10px] font-black">(Rate %)</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center space-x-1">
                    <Lock className="w-3 h-3 inline" />
                    <span>Admin Only</span>
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                disabled={!isAdmin}
                value={custForm.discountPercentage}
                onChange={(e) => setCustForm({ ...custForm, discountPercentage: e.target.value })}
                placeholder="0"
                className={`w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold transition ${
                  !isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80 text-slate-500' : ''
                }`}
              />
            </div>
          </div>

          {/* Initial Opening / Past Due Balance (Admin only on new customer registration) */}
          {!editingCust && isAdmin && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Initial Past Due / Opening Balance (₹)</span>
                <span className="text-amber-600 font-bold text-[10px]">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={custForm.openingBalance}
                onChange={(e) => setCustForm({ ...custForm, openingBalance: e.target.value })}
                placeholder="e.g. 5000"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-amber-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">If this customer already has past udhaar from your old register, enter it here.</p>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Address</label>
            <input
              type="text"
              value={custForm.address}
              onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
              placeholder="Shop address..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#DC2626] text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm shadow-md flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SAVING CUSTOMER...</span>
              </>
            ) : (
              <span>{editingCust ? 'Save Customer Changes' : 'Create Customer Shop'}</span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
