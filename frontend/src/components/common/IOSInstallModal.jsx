import React from 'react';
import { X, PlusSquare, ArrowUpRight, Smartphone, Compass, ExternalLink } from 'lucide-react';
import amanLogo from '../../assets/amanlogo.jpg';

export default function IOSInstallModal({ isOpen, onClose, isIOSSafari = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden flex flex-col max-h-[92vh] transform transition-all animate-slide-up">
        
        {/* 🔴🔵 Pepsi Header Line */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="w-1/2 bg-[#DC2626]" />
          <div className="w-1/2 bg-[#E32934]" />
        </div>

        {/* ✕ Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition z-20"
          title="Close guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 📱 Header & App Identity */}
        <div className="flex items-center space-x-3 mt-1 pb-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="w-11 h-11 rounded-full bg-white shadow-md border border-slate-200/80 dark:border-slate-700 flex items-center justify-center p-0.5 flex-shrink-0 overflow-hidden">
            <img src={amanLogo} alt="Aman Enterprises Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              Install on iPhone / iPad
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Add Pepsi Sales directly to your Home Screen
            </p>
          </div>
        </div>

        {/* ⚠️ Non-Safari Browser Warning Banner (e.g. Chrome on iOS, WhatsApp / Instagram Webview) */}
        {!isIOSSafari && (
          <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start space-x-3 text-amber-900 dark:text-amber-200">
            <div className="p-1.5 bg-amber-200 dark:bg-amber-900/60 rounded-xl shrink-0 mt-0.5">
              <Compass className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-100">
                Please open in Apple Safari
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                iOS only permits installing apps from <strong>Apple Safari</strong>. Tap your browser's menu (•••) and choose <strong>"Open in Safari"</strong> to install.
              </p>
            </div>
          </div>
        )}

        {/* 📋 Step-by-Step Visual Installation Guide */}
        <div className="mt-4 space-y-3.5 overflow-y-auto pr-1">
          
          {/* STEP 1: Tap Share Icon */}
          <div className="flex items-start space-x-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
            <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              1
            </div>
            <div className="flex-1 text-xs">
              <p className="font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>Tap the</span>
                <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-[#DC2626] dark:text-blue-300 rounded font-black text-[11px]">
                  Share Button
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                Tap the <strong>Share icon</strong> at the bottom bar of Safari (or top bar on iPad).
              </p>
            </div>
            {/* iOS Share Icon Illustration */}
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-[#DC2626] dark:text-blue-400 shrink-0 shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
          </div>

          {/* STEP 2: Scroll & Tap "Add to Home Screen" */}
          <div className="flex items-start space-x-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
            <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              2
            </div>
            <div className="flex-1 text-xs">
              <p className="font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>Select</span>
                <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded font-black text-[11px]">
                  "Add to Home Screen"
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                Scroll down in the share sheet and tap <strong>Add to Home Screen</strong>.
              </p>
            </div>
            {/* iOS Add to Home Screen Icon Illustration */}
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-300/80 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 shadow-sm">
              <PlusSquare className="w-5 h-5" />
            </div>
          </div>

          {/* STEP 3: Tap "Add" */}
          <div className="flex items-start space-x-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50">
            <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              3
            </div>
            <div className="flex-1 text-xs">
              <p className="font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>Tap</span>
                <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded font-black text-[11px]">
                  "Add"
                </span>
                <span>in Top Right</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                Confirm by tapping <strong>Add</strong> in the top-right corner. The app will be ready on your home screen!
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm font-black text-xs">
              Add
            </div>
          </div>

        </div>

        {/* 🔘 Got it / Close Action Button */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/80">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-[#DC2626] hover:bg-blue-700 text-white font-extrabold rounded-2xl transition shadow-md shadow-blue-500/25 active:scale-95 text-xs sm:text-sm flex items-center justify-center space-x-2"
          >
            <span>Got it, Open Menu</span>
          </button>
        </div>

      </div>
    </div>
  );
}
