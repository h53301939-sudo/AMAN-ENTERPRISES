import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  Check, 
  Banknote, 
  Smartphone, 
  Layers, 
  CreditCard, 
  AlertTriangle, 
  Loader2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function PaymentWizardModal({
  isOpen,
  onClose,
  onConfirmSale,
  customerName = 'Retail Customer',
  totalAmount = 0,
  totalCases = 0,
  isCreditExceeded = false,
  creditLimit = 0,
  currentDue = 0,
  isSubmitting = false
}) {
  // Step state: 'choose_method' | 'split_details' | 'credit_details' | 'confirm_surety'
  const [currentStep, setCurrentStep] = useState('choose_method');
  const [previousStep, setPreviousStep] = useState('choose_method');
  const [selectedMethod, setSelectedMethod] = useState('Cash'); // 'Cash' | 'UPI' | 'Split' | 'Credit'
  const [pendingSaleData, setPendingSaleData] = useState(null);

  // Split amounts state (Bidirectional auto-calculation)
  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  
  // Credit amounts state
  const [creditCash, setCreditCash] = useState('');
  const [creditUpi, setCreditUpi] = useState('');

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('choose_method');
      setPreviousStep('choose_method');
      setSelectedMethod('Cash');
      setPendingSaleData(null);
      setSplitCash('');
      setSplitUpi('');
      setCreditCash('');
      setCreditUpi('');
    }
  }, [isOpen, totalAmount]);

  if (!isOpen) return null;

  const totalNum = Number(totalAmount || 0);

  // Helper for Cash change in Split mode (Auto calculates UPI)
  const handleSplitCashChange = (val) => {
    if (val === '') {
      setSplitCash('');
      setSplitUpi('');
      return;
    }
    const entered = Number(val);
    if (entered >= totalNum) {
      setSplitCash(totalNum.toString());
      setSplitUpi('0');
    } else if (entered < 0) {
      setSplitCash('0');
      setSplitUpi(totalNum.toString());
    } else {
      setSplitCash(val);
      const remainingUpi = Math.max(0, totalNum - entered);
      setSplitUpi(remainingUpi.toString());
    }
  };

  // Helper for UPI change in Split mode (Auto calculates Cash)
  const handleSplitUpiChange = (val) => {
    if (val === '') {
      setSplitUpi('');
      setSplitCash('');
      return;
    }
    const entered = Number(val);
    if (entered >= totalNum) {
      setSplitUpi(totalNum.toString());
      setSplitCash('0');
    } else if (entered < 0) {
      setSplitUpi('0');
      setSplitCash(totalNum.toString());
    } else {
      setSplitUpi(val);
      const remainingCash = Math.max(0, totalNum - entered);
      setSplitCash(remainingCash.toString());
    }
  };

  // Helper for Quick Chips selection in Split mode
  const handleQuickChipSelect = (chipAmt) => {
    const cashVal = Math.min(totalNum, Number(chipAmt));
    setSplitCash(cashVal.toString());
    setSplitUpi(Math.max(0, totalNum - cashVal).toString());
  };

  // Split calculations
  const cashNum = Number(splitCash || 0);
  const upiNum = Number(splitUpi || 0);

  // Auto-calculated Due for Credit mode
  const credCashNum = Number(creditCash || 0);
  const credUpiNum = Number(creditUpi || 0);
  const credPaidTotal = credCashNum + credUpiNum;
  const prospectiveDue = Math.max(0, totalNum - credPaidTotal);
  const resolvedCreditLimit = Number(creditLimit || 5000);
  const dynamicCreditExceeded = (Number(currentDue || 0) + prospectiveDue) > resolvedCreditLimit;
  const effectiveCreditExceeded = isCreditExceeded || dynamicCreditExceeded;
  const availableCredit = Math.max(0, resolvedCreditLimit - Number(currentDue || 0));
  const requiredUpfrontPayment = Math.max(0, prospectiveDue - availableCredit);

  // Quick preset chips calculation for Split mode
  const generateQuickChips = () => {
    const chips = [];
    if (totalNum >= 1000) chips.push(500);
    if (totalNum >= 2000) chips.push(1000);
    if (totalNum >= 3000) chips.push(1500);
    if (totalNum >= 4000) chips.push(2000);
    chips.push(Math.round(totalNum / 2)); // 50%
    return Array.from(new Set(chips)).filter(amt => amt > 0 && amt < totalNum);
  };

  const quickChips = generateQuickChips();

  // Handlers for Step Transitions
  const handleProceedFromMethodChoice = () => {
    if (selectedMethod === 'Split') {
      setCurrentStep('split_details');
    } else if (selectedMethod === 'Credit') {
      setCurrentStep('credit_details');
    } else {
      // Direct Cash or UPI -> Go to Surety Review
      initiateSurety(
        selectedMethod, 
        selectedMethod === 'Cash' ? totalNum : 0, 
        selectedMethod === 'UPI' ? totalNum : 0, 
        totalNum,
        'choose_method'
      );
    }
  };

  const initiateSurety = (method, cashAmt, upiAmt, paidAmt, fromStep) => {
    setPendingSaleData({
      paymentMethod: method,
      cashAmount: Number(cashAmt || 0),
      upiAmount: Number(upiAmt || 0),
      paidAmount: Number(paidAmt || 0)
    });
    setPreviousStep(fromStep);
    setCurrentStep('confirm_surety');
  };

  const handleFinalSubmit = () => {
    if (!pendingSaleData) return;
    onConfirmSale(pendingSaleData);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col transform transition-all animate-slide-up"
      >
        {/* Top Pepsi Dual Color Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex z-10">
          <div className="w-1/2 bg-[#DC2626]" />
          <div className="w-1/2 bg-[#E32934]" />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 📱 SCREEN 1: CHOOSE PAYMENT METHOD                            */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 'choose_method' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Choose Payment Method
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[240px]">
                  Customer: <span className="text-slate-900 dark:text-white font-extrabold">{customerName}</span>
                </p>
              </div>

              {!isSubmitting && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Total Amount Hero Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Total Bill Amount
                </span>
                <span className="text-2xl font-black text-[#DC2626] dark:text-blue-400">
                  ₹{totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 rounded-xl">
                {totalCases} Boxes
              </span>
            </div>

            {/* 4 Large Payment Method Tiles (Matching User's Screenshot) */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Select Payment Method
              </label>

              {/* 💵 1. CASH */}
              <button
                type="button"
                onClick={() => setSelectedMethod('Cash')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  selectedMethod === 'Cash'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <div className={`p-2.5 rounded-xl ${selectedMethod === 'Cash' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'}`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Cash</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Collect 100% in physical cash notes</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'Cash' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {selectedMethod === 'Cash' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* 📱 2. UPI */}
              <button
                type="button"
                onClick={() => setSelectedMethod('UPI')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  selectedMethod === 'UPI'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <div className={`p-2.5 rounded-xl ${selectedMethod === 'UPI' ? 'bg-[#DC2626] text-white' : 'bg-blue-100 dark:bg-blue-950 text-[#DC2626] dark:text-blue-400'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">UPI</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">PhonePe, Google Pay, Paytm, BHIM</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'UPI' ? 'border-[#DC2626] bg-[#DC2626] text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {selectedMethod === 'UPI' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* 🔀 3. SPLIT (Cash + UPI) */}
              <button
                type="button"
                onClick={() => setSelectedMethod('Split')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  selectedMethod === 'Split'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <div className={`p-2.5 rounded-xl ${selectedMethod === 'Split' ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'}`}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Split Payment</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Part in Cash + Part in UPI</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'Split' ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {selectedMethod === 'Split' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* 📋 4. CREDIT (Udhaar) */}
              <button
                type="button"
                onClick={() => setSelectedMethod('Credit')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  selectedMethod === 'Credit'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <div className={`p-2.5 rounded-xl ${selectedMethod === 'Credit' ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Credit (Udhaar)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Market due balance with customer</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'Credit' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {selectedMethod === 'Credit' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>

            {/* Bottom Continue Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedFromMethodChoice}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-[#DC2626] hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl transition shadow-lg shadow-blue-600/25 active:scale-95 text-sm flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedMethod === 'Split' 
                        ? 'Continue to Split Amounts' 
                        : selectedMethod === 'Credit' 
                        ? 'Continue to Credit Details' 
                        : `Pay ₹${totalNum.toLocaleString()} & Complete`}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 📱 SCREEN 2: ENTER SPLIT AMOUNTS (MATCHING SCREENSHOT 3)      */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 'split_details' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Header with Back Arrow */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep('choose_method')}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Split Payment
              </h3>

              {!isSubmitting && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Total Amount Banner */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Amount:</span>
              <span className="text-xl font-black text-[#DC2626] dark:text-blue-400">
                ₹{totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 💵 Enter Cash Amount with Quick Chips */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                Enter Cash Amount (₹)
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  max={totalNum}
                  placeholder="0"
                  autoFocus
                  value={splitCash}
                  onChange={(e) => handleSplitCashChange(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 rounded-2xl text-slate-900 dark:text-white font-black text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">Quick:</span>
                {quickChips.map((chipAmt) => (
                  <button
                    key={chipAmt}
                    type="button"
                    onClick={() => handleQuickChipSelect(chipAmt)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer"
                  >
                    ₹{chipAmt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* 📱 Enter UPI Amount with matching styling */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                Enter UPI Amount (₹)
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  max={totalNum}
                  placeholder="0"
                  value={splitUpi}
                  onChange={(e) => handleSplitUpiChange(e.target.value)}
                  className="w-full pl-8 pr-11 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 rounded-2xl text-slate-900 dark:text-white font-black text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 dark:bg-slate-700/80 text-slate-400 dark:text-slate-400 rounded-xl">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 📋 Split Summary Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block pb-1 border-b border-slate-200 dark:border-slate-700">
                Split Summary
              </span>
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300">
                <span>💵 Cash Received:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">₹{cashNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300">
                <span>📱 UPI Collection:</span>
                <span className="font-black text-blue-600 dark:text-blue-400">₹{upiNum.toLocaleString()}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-slate-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="text-[#DC2626] dark:text-blue-400">₹{totalNum.toLocaleString()}</span>
              </div>
            </div>

            {/* Confirm Split Button -> Opens Surety Review */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => initiateSurety('Split', cashNum, upiNum, totalNum, 'split_details')}
                disabled={isSubmitting || (cashNum <= 0 && upiNum <= 0)}
                className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-2xl transition shadow-lg shadow-purple-600/25 active:scale-95 text-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Review & Confirm Split</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 📱 SCREEN 3: CREDIT / UDHAAR DETAILS                          */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 'credit_details' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Header with Back Arrow */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep('choose_method')}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Credit (Udhaar) Details
              </h3>

              {!isSubmitting && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Total Amount Banner */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Bill:</span>
              <span className="text-xl font-black text-[#DC2626] dark:text-blue-400">
                ₹{totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Partial Deposit Inputs */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  Partial Deposit Paid Today (Optional)
                </span>
                {(credCashNum > 0 || credUpiNum > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreditCash('');
                      setCreditUpi('');
                    }}
                    className="text-[10px] font-extrabold text-amber-600 hover:underline"
                  >
                    Clear (100% Udhaar)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1">
                    💵 Cash Received (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={creditCash}
                    onChange={(e) => setCreditCash(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white font-black text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1">
                    📱 UPI Received (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={creditUpi}
                    onChange={(e) => setCreditUpi(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white font-black text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Remaining Due Box */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  Remaining Market Due (Udhaar)
                </span>
                <span className="text-xl font-black text-amber-900 dark:text-amber-200">
                  ₹{prospectiveDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2 bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            {/* Credit Limit Alert if Exceeded */}
            {effectiveCreditExceeded && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl space-y-1 text-xs animate-shake">
                <div className="flex items-center space-x-1.5 font-black">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>⛔ Credit Limit Exceeded!</span>
                </div>
                <p className="text-[11px] leading-tight font-medium">
                  Requested Due (₹{prospectiveDue.toLocaleString()}) + Current Balance (₹{currentDue.toLocaleString()}) = ₹{(Number(currentDue || 0) + prospectiveDue).toLocaleString()} (Limit: ₹{resolvedCreditLimit.toLocaleString()}).
                </p>
                {requiredUpfrontPayment > 0 && (
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 pt-0.5">
                    💡 Please collect at least <strong>₹{requiredUpfrontPayment.toLocaleString()}</strong> in Cash or UPI above to allow this sale on credit.
                  </p>
                )}
              </div>
            )}

            {/* Confirm Credit Button -> Opens Surety Review */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => initiateSurety('Credit', credCashNum, credUpiNum, credPaidTotal, 'credit_details')}
                disabled={isSubmitting || effectiveCreditExceeded}
                className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition shadow-lg shadow-amber-600/25 active:scale-95 text-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Review & Confirm Credit</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 🛡️ SCREEN 4: ULTRA-MINIMAL SURETY CONFIRMATION               */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 'confirm_surety' && pendingSaleData && (
          <div className="p-6 text-center space-y-4 animate-slide-up">
            {/* Minimal Icon Badge */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
            </div>

            {/* Title & Amount Hero */}
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Finalize Sale?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[260px] mx-auto">
                {customerName} • {totalCases} Boxes
              </p>
              <div className="text-3xl font-black text-[#DC2626] dark:text-blue-400 pt-1">
                ₹{totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Ultra-Minimal Payment Breakdown Pill */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-600 dark:text-slate-300">
              {pendingSaleData.paymentMethod === 'Cash' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-black">💵 100% Cash Collection</span>
              )}
              {pendingSaleData.paymentMethod === 'UPI' && (
                <span className="text-blue-600 dark:text-blue-400 font-black">📱 100% UPI Collection</span>
              )}
              {pendingSaleData.paymentMethod === 'Split' && (
                <div className="flex items-center justify-center space-x-3 text-[11px]">
                  <span>💵 Cash: <b className="text-emerald-600 dark:text-emerald-400">₹{pendingSaleData.cashAmount.toLocaleString()}</b></span>
                  <span>•</span>
                  <span>📱 UPI: <b className="text-blue-600 dark:text-blue-400">₹{pendingSaleData.upiAmount.toLocaleString()}</b></span>
                </div>
              )}
              {pendingSaleData.paymentMethod === 'Credit' && (
                <div className="flex items-center justify-center space-x-3 text-[11px]">
                  <span>Paid: <b className="text-emerald-600 dark:text-emerald-400">₹{pendingSaleData.paidAmount.toLocaleString()}</b></span>
                  <span>•</span>
                  <span>Due: <b className="text-amber-600 dark:text-amber-400">₹{(totalNum - pendingSaleData.paidAmount).toLocaleString()}</b></span>
                </div>
              )}
            </div>

            {/* 2 Sleek Action Buttons: Cancel vs Confirm & Print */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(previousStep)}
                disabled={isSubmitting}
                className="py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-xl transition active:scale-95 text-xs flex items-center justify-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition shadow-lg shadow-emerald-600/25 active:scale-95 text-xs flex items-center justify-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Print</span>
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
