import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import Modal from '../common/Modal';
import CustomerAvatar from '../common/CustomerAvatar';
import {
  Store,
  Phone,
  MapPin,
  Receipt,
  DollarSign,
  Package,
  Calendar,
  Truck,
  Printer,
  CreditCard,
  MessageCircle,
  Loader2,
  Tag
} from 'lucide-react';

export default function CustomerDetailsModal({ isOpen, onClose, customerId, initialCustomer, onOpenInvoice }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'payments'

  const fetchCustomerDetails = async (idToFetch) => {
    if (!idToFetch) return;
    setLoading(true);
    try {
      const res = await API.get(`/customers/${idToFetch}/details`);
      setDetails(res.data);
    } catch (err) {
      console.error('Error fetching customer profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      setDetails(null); // Reset previous customer details immediately
      setActiveTab('invoices');
      fetchCustomerDetails(customerId);
    } else {
      setDetails(null);
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  // Strict isolation: Ensure details match the exact customer requested
  const isDataForThisCustomer = details && details.customer && (details.customer._id === customerId || details.customer._id?.toString() === customerId?.toString());
  const customer = (isDataForThisCustomer ? details.customer : null) || initialCustomer || {};
  const summary = (isDataForThisCustomer ? details.summary : null) || {
    totalLifetimePurchases: 0,
    totalCasesPurchased: 0,
    totalAmountPaid: 0,
    outstandingBalance: customer.outstandingBalance || 0,
    totalInvoices: 0
  };
  const sales = (isDataForThisCustomer ? details.sales : []) || [];
  const payments = (isDataForThisCustomer ? details.payments : []) || [];
  const dueAdjustments = (isDataForThisCustomer ? (details.dueAdjustments || customer.dueAdjustments) : (initialCustomer?.dueAdjustments || [])) || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Customer 360° Profile - ${customer.shopName || 'Retailer Account'}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-slate-900 dark:text-white">
        
        {/* 🏪 TOP CUSTOMER SHOP PROFILE CARD */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <CustomerAvatar name={customer.shopName} size="lg" />
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {customer.shopName || 'Customer Shop'}
                </h2>
                {customer.discountPercentage > 0 && (
                  <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] rounded-full flex items-center space-x-1">
                    <Tag className="w-3 h-3" />
                    <span>{customer.discountPercentage}% Special Rate</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 flex items-center space-x-3">
                <span>Owner: <strong>{customer.ownerName || 'Retailer'}</strong></span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-pepsi-blue" />
                  <span>{customer.phone || 'No Phone'}</span>
                </span>
              </p>
              <p className="text-xs text-slate-400 flex items-center space-x-1 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>{customer.address || 'Local Route Retailer'}</span>
              </p>
            </div>
          </div>

          {/* Direct WhatsApp Quick Chat */}
          {customer.phone && (
            <a
              href={`https://wa.me/91${customer.phone.replace(/[^0-9]/g, '').slice(-10)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Customer</span>
            </a>
          )}
        </div>

        {/* 📊 LIFETIME METRICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lifetime Purchases</p>
            <h4 className="text-lg font-black text-pepsi-blue dark:text-blue-400 mt-0.5">
              ₹{summary.totalLifetimePurchases?.toLocaleString() || 0}
            </h4>
            <p className="text-[10px] text-slate-400">{summary.totalInvoices || sales.length || 0} Total Invoices</p>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Volume</p>
            <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.totalCasesPurchased?.toLocaleString() || 0} <span className="text-xs font-semibold">Boxes</span>
            </h4>
            <p className="text-[10px] text-slate-400">Pepsi CSD & Juices</p>
          </div>

          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-800">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Amount Paid</p>
            <h4 className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
              ₹{summary.totalAmountPaid?.toLocaleString() || 0}
            </h4>
            <p className="text-[10px] text-slate-400">Cash & UPI Cleared</p>
          </div>

          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-100 dark:border-red-800">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outstanding Dues</p>
            <h4 className={`text-lg font-black mt-0.5 ${customer.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}`}>
              ₹{customer.outstandingBalance?.toLocaleString() || 0}
            </h4>
            <p className="text-[10px] text-slate-400">Credit Limit: ₹{customer.creditLimit?.toLocaleString() || 5000}</p>
          </div>
        </div>

        {/* 🗂️ TABS: ALL INVOICES VS PAYMENT COLLECTIONS */}
        <div className="space-y-4">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'invoices'
                  ? 'border-pepsi-blue text-pepsi-blue dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>All Purchase Invoices ({sales.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'payments'
                  ? 'border-pepsi-blue text-pepsi-blue dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Direct Payment Receipts ({payments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('adjustments')}
              className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'adjustments'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Manual Dues & Adjustments ({dueAdjustments.length})</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-pepsi-blue animate-spin" />
              <p className="text-xs text-slate-400">Loading purchase history for {customer.shopName}...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: ALL INVOICES & PURCHASES */}
              {activeTab === 'invoices' && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {sales.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <Package className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-500">No purchases or sales invoices recorded for this customer yet.</p>
                    </div>
                  ) : (
                    sales.map((sale) => (
                      <div
                        key={sale._id}
                        className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-pepsi-blue/50 transition space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              Invoice #{sale.invoiceNumber || sale._id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Payment Method Badge */}
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                              sale.paymentMethod === 'Cash'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : sale.paymentMethod === 'UPI'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                              {sale.paymentMethod}
                            </span>

                            {/* Print / View Invoice Button */}
                            <button
                              onClick={() => onOpenInvoice && onOpenInvoice({
                                ...sale,
                                customer: (sale.customer && typeof sale.customer === 'object' && sale.customer.shopName) ? sale.customer : customer
                              })}
                              className="flex items-center space-x-1 px-3 py-1 bg-pepsi-blue hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>View Bill</span>
                            </button>
                          </div>
                        </div>

                        {/* Items Purchased in this Invoice */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl text-xs space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items Breakdown:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                            {sale.items?.map((item, idx) => {
                              const uType = (item.unitType || item.size || '').toLowerCase();
                              const isHanger = uType === 'hanger';
                              const unitLabel = isHanger ? 'Hanger' : 'Box';
                              const pluralLabel = item.quantity > 1 ? (isHanger ? 'Hangers' : 'Boxes') : unitLabel;

                              return (
                                <div key={idx} className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  <span>• {item.productName || item.product?.name || 'Balaji Item'} ({unitLabel})</span>
                                  <span className="font-extrabold">{item.quantity} {pluralLabel} × ₹{item.unitPrice} = ₹{item.totalAmount || item.total || (item.quantity * item.unitPrice)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Financials & Delivery Worker */}
                        <div className="flex flex-wrap items-center justify-between pt-1 text-xs border-t border-slate-100 dark:border-slate-700/60">
                          <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            <span>Delivery: <strong>{sale.worker?.name || 'Sales Staff'}</strong> ({sale.vehicle ? (sale.vehicle.vehicleNumber ? `Van ${sale.vehicle.vehicleNumber}` : 'Van') : 'Direct Warehouse Counter'})</span>
                          </div>

                          <div className="flex items-center space-x-4 text-xs font-bold">
                            <span>Total: <strong className="text-slate-900 dark:text-white font-black">₹{sale.netTotal}</strong></span>
                            <span>Paid: <strong className="text-emerald-600 font-black">₹{sale.paidAmount}</strong></span>
                            {sale.dueAmount > 0 && (
                              <span>Credit Added: <strong className="text-red-500 font-black">₹{sale.dueAmount}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: DIRECT PAYMENT RECEIPTS */}
              {activeTab === 'payments' && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {payments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <CreditCard className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-500">No standalone collection payment receipts found for this customer.</p>
                    </div>
                  ) : (
                    payments.map((p) => (
                      <div
                        key={p._id}
                        className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs shadow-sm"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                              ₹{p.amount?.toLocaleString()} Received
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded font-bold text-[10px]">
                              {p.paymentMethod}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Collected on {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} by {p.receivedBy?.name || 'Staff'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: MANUAL DUE ADJUSTMENTS */}
              {activeTab === 'adjustments' && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {dueAdjustments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <CreditCard className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-500">No manual due or opening balance adjustments recorded for this customer.</p>
                    </div>
                  ) : (
                    dueAdjustments.map((adj, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs shadow-sm"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                              +₹{adj.amount?.toLocaleString()} Due Added
                            </span>
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded font-bold text-[10px]">
                              {adj.reason || 'Manual Adjustment'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Added on {new Date(adj.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Prev: ₹{adj.previousBalance?.toLocaleString() || 0} &rarr; New Due: ₹{adj.newBalance?.toLocaleString() || adj.amount?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Modal>
  );
}
