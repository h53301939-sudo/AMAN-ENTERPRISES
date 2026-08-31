import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Check,
  Banknote,
  Smartphone,
  Layers,
  Loader2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function CollectionPaymentModal({
  isOpen,
  onClose,
  onConfirmCollection,
  customer,
  isSubmitting = false
}) {
  // Wizard steps: 'amount_and_method' | 'split_details' | 'confirm_surety'
  const [currentStep, setCurrentStep] = useState('amount_and_method');
  const [previousStep, setPreviousStep] = useState('amount_and_method');
  const [selectedMethod, setSelectedMethod] = useState('Cash'); // 'Cash' | 'UPI' | 'Split'
  const [collectionAmount, setCollectionAmount] = useState('');
  const [pendingCollectionData, setPendingCollectionData] = useState(null);

  // Split amounts
  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');

  const currentDue = Number(customer?.outstandingBalance || 0);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('amount_and_method');
      setPreviousStep('amount_and_method');
      setSelectedMethod('Cash');
      setPendingCollectionData(null);
      setSplitCash('');
      setSplitUpi('');
      // Default to full outstanding balance if available
      setCollectionAmount(currentDue > 0 ? currentDue.toString() : '');
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const numAmount = Math.max(0, Number(collectionAmount || 0));
  const remainingBalance = Math.max(0, currentDue - numAmount);

  // Quick Balance Preset Chips
  const handleQuickPercent = (pct) => {
    if (currentDue <= 0) return;
    const calc = Math.round((currentDue * pct) / 100);
    setCollectionAmount(calc.toString());
  };

  // Split Auto-Calculations
  const handleSplitCashChange = (val) => {
    if (val === '') {
      setSplitCash('');
      setSplitUpi('');
      return;
    }
    const entered = Number(val);
    if (entered >= numAmount) {
      setSplitCash(numAmount.toString());
      setSplitUpi('0');
    } else if (entered < 0) {
      setSplitCash('0');
      setSplitUpi(numAmount.toString());
    } else {
      setSplitCash(val);
      const remainingUpi = Math.max(0, numAmount - entered);
      setSplitUpi(remainingUpi.toString());
    }
  };

  const handleSplitUpiChange = (val) => {
    if (val === '') {
      setSplitUpi('');
      setSplitCash('');
      return;
    }
    const entered = Number(val);
    if (entered >= numAmount) {
      setSplitUpi(numAmount.toString());
      setSplitCash('0');
    } else if (entered < 0) {
      setSplitUpi('0');
      setSplitCash(numAmount.toString());
    } else {
      setSplitUpi(val);
      const remainingCash = Math.max(0, numAmount - entered);
      setSplitCash(remainingCash.toString());
    }
  };

  const cashNum = Number(splitCash || 0);
  const upiNum = Number(splitUpi || 0);

  // Proceed handler
  const handleProceedFromAmountAndMethod = (e) => {
    if (e) e.preventDefault();
    if (numAmount <= 0) return;

    if (selectedMethod === 'Split') {
      setSplitCash('');
      setSplitUpi('');
      setCurrentStep('split_details');
    } else {
      initiateSurety(
        selectedMethod,
        selectedMethod === 'Cash' ? numAmount : 0,
        selectedMethod === 'UPI' ? numAmount : 0,
        numAmount,
        'amount_and_method'
      );
    }
  };

  const initiateSurety = (method, cashAmt, upiAmt, totalAmt, fromStep) => {
    setPendingCollectionData({
      amount: Number(totalAmt || 0),
      paymentMethod: method,
      cashAmount: Number(cashAmt || 0),
      upiAmount: Number(upiAmt || 0),
      remarks: ''
    });
    setPreviousStep(fromStep);
    setCurrentStep('confirm_surety');
  };

  const handleFinalSubmit = () => {
    if (!pendingCollectionData) return;
    onConfirmCollection(pendingCollectionData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[92vh] shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col transform transition-all animate-slide-up">
        
        {/* Top Dual Color Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex z-10">
          <div className="w-1/2 bg-emerald-500" />
          <div className="w-1/2 bg-[#DC2626]" />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 📱 SCREEN 1: AMOUNT & PAYMENT METHOD (MOBILE-OPTIMIZED)       */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 'amount_and_method' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Compact Header with Proper Padding */}
            <div className="px-5 pt-4 pb-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0 pr-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  Collect Credit Payment
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate">
                  Shop: <span className="text-slate-900 dark:text-white font-extrabold">{customer.shopName}</span>
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

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto scrollbar-none flex-1">
              {/* Compact Due Balance Card */}
              <div className="p-2.5 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-200/80 dark:border-red-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wider block">
                    Current Market Due
                  </span>
                  <span className="text-lg sm:text-xl font-black text-red-600 dark:text-red-400">
                    ₹{currentDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 bg-red-200/80 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                  Pending
                </span>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                  Enter Amount to Collect (₹)
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-base">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={currentDue > 0 ? currentDue : 9999999}
                    required
                    placeholder="Enter amount"
                    value={collectionAmount}
                    onChange={(e) => setCollectionAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-slate-900 dark:text-white font-black text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Quick Preset Chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 scrollbar-none">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase mr-0.5 shrink-0">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(100)}
                    className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 text-[11px] font-black rounded-lg border border-emerald-300 dark:border-emerald-800 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    100% Full Due
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(50)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-black rounded-lg border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(25)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-black rounded-lg border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    25%
                  </button>
                </div>

                {/* Live Remaining Balance Preview */}
                <div className="flex justify-between items-center px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Balance After Collection:</span>
                  <span className={`font-black ${remainingBalance === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                    ₹{remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* 3 Sleek Payment Method Tiles (Cash, UPI, Split) */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Select Collection Method
                </label>

                {/* 💵 1. Cash */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('Cash')}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedMethod === 'Cash'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 text-left">
                    <div className={`p-2 rounded-lg ${selectedMethod === 'Cash' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'}`}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">Cash</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Collect 100% in physical cash notes</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'Cash' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {selectedMethod === 'Cash' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>

                {/* 📱 2. UPI */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('UPI')}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedMethod === 'UPI'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 text-left">
                    <div className={`p-2 rounded-lg ${selectedMethod === 'UPI' ? 'bg-[#DC2626] text-white' : 'bg-blue-100 dark:bg-blue-950 text-[#DC2626] dark:text-blue-400'}`}>
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">UPI / QR Code</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">PhonePe, Google Pay, Paytm, BHIM</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'UPI' ? 'border-[#DC2626] bg-[#DC2626] text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {selectedMethod === 'UPI' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>

                {/* 🔀 3. Split Payment */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('Split')}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedMethod === 'Split'
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 shadow-sm ring-1 ring-purple-500/20'
                      : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 text-left">
                    <div className={`p-2 rounded-lg ${selectedMethod === 'Split' ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'}`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">Split Payment</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Part in Cash + Part in UPI</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'Split' ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {selectedMethod === 'Split' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Action Button (Pinned) */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleProceedFromAmountAndMethod}
                disabled={isSubmitting || numAmount <= 0}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95 text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                {selectedMethod === 'Split' ? (
                  <>
                    <span>Continue to Split Amounts</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Collect ₹{numAmount.toLocaleString('en-IN')} via {selectedMethod}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 📱 SCREEN 2: SPLIT DETAILS                                    */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 'split_details' && (
          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep('amount_and_method')}
                disabled={isSubmitting}
                className="flex items-center space-x-1 text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Split Collection Amounts
              </h3>

              {!isSubmitting && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Total Amount Banner */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Collection:</span>
              <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 💵 Enter Cash Amount */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                💵 Cash Collected (₹)
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  max={numAmount}
                  placeholder="0"
                  autoFocus
                  value={splitCash}
                  onChange={(e) => handleSplitCashChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 rounded-xl text-slate-900 dark:text-white font-black text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* 📱 Enter UPI Amount */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                📱 UPI Collected (₹)
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  max={numAmount}
                  placeholder="0"
                  value={splitUpi}
                  onChange={(e) => handleSplitUpiChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 rounded-xl text-slate-900 dark:text-white font-black text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Split Summary Card */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                <span>💵 Cash Portion:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">₹{cashNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                <span>📱 UPI Portion:</span>
                <span className="font-black text-blue-600 dark:text-blue-400">₹{upiNum.toLocaleString()}</span>
              </div>
            </div>

            {/* Confirm Split Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => initiateSurety('Split', cashNum, upiNum, numAmount, 'split_details')}
                disabled={isSubmitting || (cashNum <= 0 && upiNum <= 0)}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-xl transition shadow-md shadow-purple-600/20 active:scale-95 text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Review & Confirm Split</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 🛡️ SCREEN 3: SURETY REVIEW & CONFIRMATION                     */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 'confirm_surety' && pendingCollectionData && (
          <div className="p-5 sm:p-6 text-center space-y-3.5 animate-slide-up">
            {/* Icon Badge */}
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
            </div>

            {/* Title & Amount */}
            <div className="space-y-0.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Record Payment Collection?
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[240px] mx-auto">
                {customer.shopName}
              </p>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 pt-1">
                ₹{pendingCollectionData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Payment Method Breakdown Pill */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1">
              {pendingCollectionData.paymentMethod === 'Cash' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-black block">💵 100% Cash Collection</span>
              )}
              {pendingCollectionData.paymentMethod === 'UPI' && (
                <span className="text-blue-600 dark:text-blue-400 font-black block">📱 100% UPI Collection</span>
              )}
              {pendingCollectionData.paymentMethod === 'Split' && (
                <div className="flex items-center justify-center space-x-2.5 text-[11px]">
                  <span>💵 Cash: <b className="text-emerald-600 dark:text-emerald-400">₹{pendingCollectionData.cashAmount.toLocaleString()}</b></span>
                  <span>•</span>
                  <span>📱 UPI: <b className="text-blue-600 dark:text-blue-400">₹{pendingCollectionData.upiAmount.toLocaleString()}</b></span>
                </div>
              )}

              <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[10px] text-slate-500">
                <span>New Balance:</span>
                <span className="font-black text-slate-900 dark:text-white">
                  ₹{Math.max(0, currentDue - pendingCollectionData.amount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* 2 Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(previousStep)}
                disabled={isSubmitting}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-xl transition active:scale-95 text-xs flex items-center justify-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Confirm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
