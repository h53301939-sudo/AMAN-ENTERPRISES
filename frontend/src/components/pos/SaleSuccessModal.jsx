import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { 
  Check, 
  CheckCircle2, 
  Eye, 
  X, 
  Lock, 
  Calendar, 
  CreditCard, 
  User, 
  Phone, 
  Receipt, 
  MessageCircle, 
  AlertTriangle,
  AlertCircle 
} from 'lucide-react';

export default function SaleSuccessModal({ isOpen, onClose, onViewBill, sale }) {
  const [waLiveStatus, setWaLiveStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      API.get('/whatsapp/status')
        .then(res => setWaLiveStatus(res.data))
        .catch(() => setWaLiveStatus({ isReady: false, status: 'disconnected' }));
    }
  }, [isOpen]);

  if (!isOpen || !sale) return null;

  const netTotal = Number(sale.netTotal || 0);
  const paidAmount = Number(sale.paidAmount !== undefined ? sale.paidAmount : (sale.status === 'Paid' ? netTotal : 0));
  const dueAmount = Number(sale.dueAmount !== undefined ? sale.dueAmount : Math.max(0, netTotal - paidAmount));
  const hasDue = dueAmount > 0;

  const invoiceNumber = sale.invoiceNumber || 'INV-0000';
  const paymentMethod = sale.paymentMethod || 'Cash';
  const customerName = sale.customer?.shopName || sale.customer?.ownerName || 'Walk-in Customer';
  const customerPhone = sale.customer?.phone || sale.customer?.whatsapp || '';

  const formattedDate = new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = new Date(sale.createdAt || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Calculate Real WhatsApp Status
  const isWaConnected = (sale.whatsappDelivery?.status === 'sent') || (waLiveStatus?.isReady === true);
  const hasPhone = Boolean(customerPhone && customerPhone.length >= 10);

  let deliveryState = 'not_connected';
  let deliveryMessage = 'WhatsApp not connected. Bill not sent.';

  if (!hasPhone) {
    deliveryState = 'no_phone';
    deliveryMessage = 'No customer mobile number registered.';
  } else if (isWaConnected) {
    deliveryState = 'sent';
    deliveryMessage = `Bill sent successfully to ${customerPhone}`;
  } else {
    deliveryState = 'not_connected';
    deliveryMessage = 'WhatsApp not connected. Bill not sent.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden flex flex-col transform transition-all animate-scale-up">
        
        {/* ✕ Top Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition z-20"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 🎊 Celebration Confetti Accents */}
        <div className="absolute top-2 left-4 w-2 h-2 rounded-full bg-blue-500 opacity-80" />
        <div className="absolute top-6 left-8 w-2 h-2 rounded-sm bg-emerald-400 rotate-45 opacity-80" />
        <div className="absolute top-3 left-20 w-1.5 h-1.5 rounded-full bg-amber-400 opacity-80" />
        <div className="absolute top-8 left-28 w-2 h-2 rounded-sm bg-pink-500 rotate-12 opacity-80" />
        <div className="absolute top-3 right-20 w-2 h-2 rounded-full bg-purple-500 opacity-80" />
        <div className="absolute top-7 right-12 w-2.5 h-2.5 rounded-sm bg-amber-400 rotate-45 opacity-80" />
        <div className="absolute top-4 right-28 w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-80" />
        <div className="absolute top-9 right-6 w-2 h-2 rounded-full bg-blue-400 opacity-80" />

        {/* 🌟 Big Green Success Checkmark Badge */}
        <div className="flex justify-center mt-1 relative z-10">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-8 ring-emerald-50 dark:ring-emerald-950/40">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>
        </div>

        {/* 📝 Heading & Subtitle */}
        <div className="text-center mt-4 space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            Sale Completed Successfully!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Your transaction has been completed.
          </p>
        </div>

        {/* 💰 FINANCIAL AMOUNT HIGHLIGHT CARD (TOTAL / PAID / DUE) */}
        {hasDue ? (
          /* Partial / Credit Payment Layout: Highlights Total, Paid, and Outstanding Due */
          <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Bill Amount</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                ₹{netTotal.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Paid Amount</span>
                <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                  ₹{paidAmount.toFixed(2)}
                </span>
              </div>

              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-2 rounded-xl text-center">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">Due / Credit</span>
                <span className="text-sm sm:text-base font-black text-red-600 dark:text-red-400">
                  ₹{dueAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Full Payment Layout: Single Green Total Card */
          <div className="mt-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Amount
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{netTotal.toFixed(2)}
            </div>
          </div>
        )}

        {/* 🧾 Transaction Details List */}
        <div className="mt-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-3.5 space-y-2.5 text-xs shadow-sm">
          
          {/* Invoice No. */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Invoice No.</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {invoiceNumber}
            </span>
          </div>

          {/* Date & Time */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-2">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Date & Time</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formattedDate}, {formattedTime}
            </span>
          </div>

          {/* Payment Mode */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-2">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Payment Mode</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {paymentMethod === 'Split' 
                ? `Split (💵 ₹${Number(sale?.cashAmount || 0).toLocaleString()} + 📱 ₹${Number(sale?.upiAmount || 0).toLocaleString()})` 
                : paymentMethod}
            </span>
          </div>

          {/* Customer */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-2">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Customer</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
              {customerName}
            </span>
          </div>

          {/* Mobile No. */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-2">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Mobile No.</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {customerPhone || 'Not provided'}
            </span>
          </div>

          {/* Due / Outstanding Row (if credit/partial) */}
          {hasDue && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-2">
              <div className="flex items-center space-x-2 text-red-500 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span>Due Balance</span>
              </div>
              <span className="font-black text-red-600 dark:text-red-400">
                ₹{dueAmount.toFixed(2)}
              </span>
            </div>
          )}

        </div>

        {/* 📲 REAL ACCURATE WHATSAPP STATUS NOTIFICATION PILL */}
        {deliveryState === 'sent' ? (
          /* Case 1: WhatsApp Connected & Sent Successfully */
          <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {deliveryMessage}
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
        ) : deliveryState === 'no_phone' ? (
          /* Case 2: No phone provided */
          <div className="mt-4 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-slate-600 dark:text-slate-300">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-white shrink-0">
                <Phone className="w-3 h-3" />
              </div>
              <span className="text-xs font-medium">
                {deliveryMessage}
              </span>
            </div>
          </div>
        ) : (
          /* Case 3: WhatsApp NOT connected / Disconnected */
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-amber-900 dark:text-amber-200">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block text-amber-800 dark:text-amber-300">
                  WhatsApp not connected
                </span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400 font-medium">
                  Bill not sent automatically. Connect in Settings.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md shrink-0">
              Not Sent
            </span>
          </div>
        )}

        {/* 🔘 Action Buttons (View Bill & Done) */}
        <div className="mt-5 flex items-center space-x-3">
          
          {/* 👁 View Bill Button */}
          <button
            type="button"
            onClick={onViewBill}
            className="flex-1 py-3 px-4 border-2 border-blue-600/80 hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#800f0f] dark:text-blue-300 font-extrabold rounded-2xl transition flex items-center justify-center space-x-2 text-sm shadow-sm active:scale-95"
          >
            <Eye className="w-4 h-4 text-[#800f0f] dark:text-blue-400" />
            <span>View Bill</span>
          </button>

          {/* ✔ Done Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl transition flex items-center justify-center space-x-2 text-sm shadow-md shadow-emerald-600/30 active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Done</span>
          </button>

        </div>

        {/* 🔒 Footer Note */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center space-x-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>This sale is secure and recorded</span>
          </p>
        </div>

      </div>
    </div>
  );
}
