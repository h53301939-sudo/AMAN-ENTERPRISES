import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  AlertTriangle,
  Loader2,
  Check,
  CreditCard,
  History,
  FileText,
  ShieldAlert
} from 'lucide-react';

export default function ManualDueModal({
  isOpen,
  onClose,
  onConfirmManualDue,
  customer,
  isSubmitting = false
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Past Udhaar (Opening Balance)');

  const currentDue = Number(customer?.outstandingBalance || 0);
  const creditLimit = Number(customer?.creditLimit || 5000);
  const availableCredit = Math.max(0, creditLimit - currentDue);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setReason('Past Udhaar (Opening Balance)');
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const numAmount = Math.max(0, Number(amount || 0));
  const newTotalDue = currentDue + numAmount;
  const isCreditExceeded = newTotalDue > creditLimit;

  const standardQuickAmounts = [500, 1000, 2000, 5000];
  const quickAmounts = standardQuickAmounts.filter(amt => amt <= availableCredit);

  const quickReasons = [
    'Past Udhaar (Opening Balance)',
    'Manual Credit Entry',
    'Delivery Shortage Due',
    'Crate / Bottle Deposit'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numAmount <= 0 || isCreditExceeded) return;
    onConfirmManualDue({
      amount: numAmount,
      reason: reason.trim() || 'Manual Due Addition'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[92vh] shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col transform transition-all animate-slide-up">
        
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-red-500 to-amber-600 z-10" />

        {/* Header */}
        <div className="px-5 pt-4 pb-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0 pr-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-1.5">
              <PlusCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Add Manual Due / Past Balance</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate">
              Customer: <span className="text-slate-900 dark:text-white font-extrabold">{customer.shopName}</span>
            </p>
          </div>

          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto scrollbar-none flex-1">
            
            {/* Credit Status & Limit Overview Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Current Market Due
                  </span>
                  <span className={`text-base font-black ${currentDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    ₹{currentDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Credit Limit
                  </span>
                  <span className="text-base font-black text-[#DC2626] dark:text-blue-400">
                    ₹{creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-slate-500 dark:text-slate-400">Available Credit Capacity:</span>
                <span className={`font-black ${availableCredit <= 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  ₹{availableCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Amount to Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                  Amount to Add (₹) *
                </label>
                {availableCredit > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(availableCredit.toString())}
                    className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Use Max (₹{availableCredit.toLocaleString()})
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-base">₹</span>
                <input
                  type="number"
                  min="1"
                  max={creditLimit}
                  required
                  placeholder="Enter due amount (e.g. 2000)"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-xl text-slate-900 dark:text-white font-black text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition ${
                    isCreditExceeded
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Quick Amount Chips */}
              {quickAmounts.length > 0 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 scrollbar-none">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase mr-0.5 shrink-0">Quick:</span>
                  {quickAmounts.map((qAmt) => (
                    <button
                      key={qAmt}
                      type="button"
                      onClick={() => setAmount(qAmt.toString())}
                      className="px-2 py-1 bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 text-[11px] font-black rounded-lg border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer shrink-0"
                    >
                      +₹{qAmt.toLocaleString()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reason / Description */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                Reason / Note for Manual Due
              </label>

              <input
                type="text"
                placeholder="e.g. Opening balance from previous register"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              />

              {/* Quick Reason Chips */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {quickReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition active:scale-95 cursor-pointer ${
                      reason === r
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Live New Total Due Calculation Box */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                <span>Previous Market Due:</span>
                <span>₹{currentDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                <span>+ Adding Manual Due:</span>
                <span className="font-black">+₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800 flex justify-between font-black text-slate-900 dark:text-white text-sm">
                <span>New Total Outstanding:</span>
                <span className={`${isCreditExceeded ? 'text-red-600' : 'text-slate-900 dark:text-white'} font-black`}>
                  ₹{newTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* ⛔ STRICT CREDIT LIMIT EXCEEDED WARNING BANNER */}
            {isCreditExceeded && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border-2 border-red-500/40 rounded-2xl text-red-600 dark:text-red-400 space-y-1 text-xs animate-shake">
                <div className="flex items-center space-x-1.5 font-black text-[12px]">
                  <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>⛔ Credit Limit Exceeded!</span>
                </div>
                <p className="text-[11px] leading-tight font-semibold">
                  Customer credit limit is <strong>₹{creditLimit.toLocaleString('en-IN')}</strong>. Adding ₹{numAmount.toLocaleString('en-IN')} would make total due <strong>₹{newTotalDue.toLocaleString('en-IN')}</strong>, which exceeds the limit!
                </p>
                <p className="text-[10px] text-red-500 font-extrabold pt-0.5">
                  Maximum available credit to add right now: <strong>₹{availableCredit.toLocaleString('en-IN')}</strong>
                </p>
              </div>
            )}

          </div>

          {/* Bottom Action Buttons */}
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-xl transition active:scale-95 text-xs flex items-center justify-center cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || numAmount <= 0 || isCreditExceeded}
              className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition shadow-md shadow-amber-600/20 active:scale-95 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding Due...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm & Add Due</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
