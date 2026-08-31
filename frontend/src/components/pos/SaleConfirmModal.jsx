import React from 'react';
import { ShoppingCart, Check, X, HelpCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function SaleConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  customerName = 'Retail Customer',
  totalAmount = 0,
  totalCases = 0,
  paymentMethod = 'Cash',
  cashAmount = 0,
  upiAmount = 0,
  isSubmitting = false
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col items-center text-center transform transition-all animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Pepsi Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="w-1/2 bg-[#DC2626]" />
          <div className="w-1/2 bg-[#E32934]" />
        </div>

        {/* ✕ Close Button */}
        {!isSubmitting && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Hero Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#DC2626] dark:text-blue-400 flex items-center justify-center mb-3 mt-1 shadow-md shadow-blue-500/10">
          <ShoppingCart className="w-8 h-8" />
        </div>

        {/* Heading */}
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Complete This Sale?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Are you sure you want to complete this sale and generate invoice?
        </p>

        {/* Order Details Preview Box */}
        <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 w-full text-left space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400 font-bold">Customer:</span>
            <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[170px]">
              {customerName}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400 font-bold">Total Items:</span>
            <span className="font-black text-slate-900 dark:text-white">
              {totalCases} Boxes / Hangers
            </span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-slate-500 dark:text-slate-400 font-bold">Payment Mode:</span>
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                paymentMethod === 'Cash'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : paymentMethod === 'UPI'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : paymentMethod === 'Split'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {paymentMethod === 'Split' ? 'Split (Cash + UPI)' : paymentMethod}
              </span>
              {paymentMethod === 'Split' && (
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  💵 ₹{Number(cashAmount || 0).toLocaleString()} • 📱 ₹{Number(upiAmount || 0).toLocaleString()}
                </p>
              )}
              {paymentMethod === 'Credit' && (Number(cashAmount || 0) + Number(upiAmount || 0)) > 0 && (
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  {Number(cashAmount || 0) > 0 && <span>💵 ₹{Number(cashAmount).toLocaleString()} </span>}
                  {Number(upiAmount || 0) > 0 && <span>📱 ₹{Number(upiAmount).toLocaleString()} </span>}
                  <span className="text-red-500 font-extrabold">(Due: ₹{Math.max(0, totalAmount - (Number(cashAmount || 0) + Number(upiAmount || 0))).toLocaleString()})</span>
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Total Amount:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              ₹{Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 🔘 2 BUTTONS: NO (Cancel on LEFT) & YES (Complete on RIGHT) */}
        <div className="grid grid-cols-2 gap-3 w-full mt-5">
          
          {/* NO Button (LEFT) */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition active:scale-95 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>No, Cancel</span>
          </button>

          {/* YES Button (RIGHT) */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#DC2626] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition shadow-lg shadow-blue-600/25 active:scale-95 text-xs sm:text-sm flex items-center justify-center space-x-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Yes, Complete</span>
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
}
